import { NextRequest, NextResponse } from 'next/server';

const SUBJECT = 'FanGround waitlist signup';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** FormSubmit rejects server-side fetch without a browser-like Referer (misleading error or silent failure). */
function getSiteOrigin(): string {
  const u = process.env.NEXTAUTH_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (u) return u.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`;
  return 'http://localhost:3000';
}

function formsubmitSuccess(data: { success?: string | boolean }): boolean {
  const s = data.success;
  return s === true || s === 'true';
}

/** Shown to visitors; details only in server logs (e.g. Vercel → Functions → waitlist). */
const WAITLIST_FORM_UNAVAILABLE =
  'We couldn’t add you to the list right now. Please try again in a few minutes.';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
    const club = typeof body.club === 'string' ? body.club.trim().slice(0, 200) : '';
    const honeypot = typeof body._honeypot === 'string' ? body._honeypot : '';

    if (honeypot) {
      return NextResponse.json({ ok: true });
    }
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const notifyEmail = (process.env.WAITLIST_NOTIFICATION_EMAIL ?? 'opdpro@gmail.com').trim();

    const details = [
      name && `Name: ${name}`,
      `Email: ${email}`,
      club && `Club / note: ${club}`,
      `Time (UTC): ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    const origin = getSiteOrigin();
    const fsUrl = `https://formsubmit.co/ajax/${encodeURIComponent(notifyEmail)}`;
    const res = await fetch(fsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Referer: `${origin}/`,
        Origin: origin,
      },
      body: JSON.stringify({
        _subject: SUBJECT,
        _template: 'table',
        _captcha: 'false',
        name: name || '—',
        email,
        club: club || '—',
        details,
      }),
    });

    const raw = await res.text();
    let data: { success?: string | boolean; message?: string } = {};
    try {
      data = JSON.parse(raw) as { success?: string | boolean; message?: string };
    } catch {
      console.error('[waitlist] FormSubmit non-JSON', { httpStatus: res.status, snippet: raw.slice(0, 400) });
      return NextResponse.json({ error: WAITLIST_FORM_UNAVAILABLE }, { status: 502 });
    }

    if (!res.ok || !formsubmitSuccess(data)) {
      const msg = typeof data.message === 'string' ? data.message : '';
      const activation = /activation|actived/i.test(msg);
      const badOrigin = /web server|html file/i.test(msg);
      console.error('[waitlist] FormSubmit failed (user sees generic message)', {
        httpStatus: res.status,
        notifyEmail,
        originUsed: origin,
        formSubmitMessage: msg,
        parsedBody: data,
        likelyCause: activation
          ? 'Form not activated for notifyEmail, or WAITLIST_NOTIFICATION_EMAIL mismatch — activate in that inbox'
          : badOrigin
            ? 'Set NEXTAUTH_URL or NEXT_PUBLIC_APP_URL to your public site URL (Vercel URL or custom domain)'
            : 'see formSubmitMessage / FormSubmit status',
      });
      return NextResponse.json({ error: WAITLIST_FORM_UNAVAILABLE }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 400 });
  }
}

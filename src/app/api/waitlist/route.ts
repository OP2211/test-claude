import { NextRequest, NextResponse } from 'next/server';

const SUBJECT = 'FanGround waitlist signup';
const WAITLIST_RECIPIENT_EMAIL = 'opdpro@gmail.com';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Prefer request domain so FormSubmit sees the real site origin. */
function getSiteOrigin(req: NextRequest): string {
  const requestOrigin = req.headers.get('origin')?.trim();
  if (requestOrigin) return requestOrigin.replace(/\/$/, '');

  const xfh = req.headers.get('x-forwarded-host')?.trim();
  if (xfh) {
    const xfp = req.headers.get('x-forwarded-proto')?.trim() || 'https';
    return `${xfp}://${xfh}`.replace(/\/$/, '');
  }

  const host = req.headers.get('host')?.trim();
  if (host) {
    const proto = host.includes('localhost') ? 'http' : 'https';
    return `${proto}://${host}`.replace(/\/$/, '');
  }

  const u = process.env.NEXTAUTH_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (u) return u.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`;
  return 'https://fanground.online/';
}

function formsubmitSuccess(data: { success?: string | boolean }): boolean {
  const s = data.success;
  return s === true || s === 'true';
}

function browserLikeHeaders(origin: string): Record<string, string> {
  return {
    Accept: 'application/json, text/plain, */*',
    Referer: `${origin}/`,
    Origin: origin,
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  };
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

    const notifyEmail = WAITLIST_RECIPIENT_EMAIL;

    const details = [
      name && `Name: ${name}`,
      `Email: ${email}`,
      club && `Club / note: ${club}`,
      `Time (UTC): ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    const origin = getSiteOrigin(req);
    const fsUrl = `https://formsubmit.co/ajax/${encodeURIComponent(notifyEmail)}`;
    const res = await fetch(fsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...browserLikeHeaders(origin),
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
      const cloudflareChallenge = /just a moment|cf-challenge|cloudflare/i.test(raw);
      console.error('[waitlist] FormSubmit non-JSON', { httpStatus: res.status, snippet: raw.slice(0, 400) });

      if (!cloudflareChallenge) {
        return NextResponse.json({ error: WAITLIST_FORM_UNAVAILABLE }, { status: 502 });
      }

      // Fallback for Cloudflare bot challenge on /ajax endpoint.
      const fallback = await fetch(`https://formsubmit.co/${encodeURIComponent(notifyEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          ...browserLikeHeaders(origin),
        },
        redirect: 'manual',
        body: new URLSearchParams({
          _subject: SUBJECT,
          _template: 'table',
          _captcha: 'false',
          name: name || '—',
          email,
          club: club || '—',
          details,
        }).toString(),
      });

      // FormSubmit non-AJAX flow usually redirects (302) when accepted.
      if (fallback.ok || (fallback.status >= 300 && fallback.status < 400)) {
        return NextResponse.json({ ok: true });
      }

      console.error('[waitlist] FormSubmit fallback failed', {
        httpStatus: fallback.status,
      });
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

import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const REFERRAL_COOKIE = 'ffc_referral_code';

export async function middleware(request: NextRequest) {
  const referralCode = request.nextUrl.searchParams.get('ref')?.trim() ?? '';
  const hasReferralCookie = Boolean(request.cookies.get(REFERRAL_COOKIE)?.value);

  if (request.nextUrl.pathname !== '/') {
    const response = NextResponse.next();
    if (referralCode && !hasReferralCookie) {
      response.cookies.set(REFERRAL_COOKIE, referralCode, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return response;
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const response = NextResponse.next();
    if (referralCode && !hasReferralCookie) {
      response.cookies.set(REFERRAL_COOKIE, referralCode, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return response;
  }

  const destination = request.nextUrl.clone();
  destination.pathname = '/matches';
  destination.search = '';
  const response = NextResponse.redirect(destination);
  if (referralCode && !hasReferralCookie) {
    response.cookies.set(REFERRAL_COOKIE, referralCode, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}

export const config = {
  matcher: ['/'],
};

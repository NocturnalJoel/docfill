import { NextResponse } from 'next/server';

export async function GET() {
  const res = NextResponse.redirect(
    new URL('/dashboard/clients', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')
  );
  res.cookies.set('dev_bypass', '1', { path: '/', httpOnly: true, sameSite: 'lax' });
  return res;
}

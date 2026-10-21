import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const response = NextResponse.redirect(new URL('/', req.url));

  if (code) {
    response.cookies.set({
      name: 'gogomi_ref',
      value: code.trim().toUpperCase(),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
  }

  return response;
}

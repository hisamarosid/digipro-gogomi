import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { setSessionCookie } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`login_${ip}`, 5, 60000);
    if (!rateCheck.success) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak percobaan login. Coba lagi dalam 1 menit.' },
        { status: 429 }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email dan password wajib diisi' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || user.disabled) {
      return NextResponse.json(
        { success: false, error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Auto-link any previous guest orders matching this email
    await db.order.updateMany({
      where: {
        guestEmail: user.email,
        userId: null,
      },
      data: {
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Gagal melakukan login' },
      { status: 500 }
    );
  }
}

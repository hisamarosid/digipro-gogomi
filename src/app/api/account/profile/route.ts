import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

export async function PUT(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, name, phone, currentPassword, newPassword } = body;

    // Action 1: Update Profile (Name & Phone)
    if (action === 'update_profile') {
      if (!name || name.trim().length === 0) {
        return NextResponse.json({ error: 'Nama tidak boleh kosong.' }, { status: 400 });
      }

      const updatedUser = await db.user.update({
        where: { id: session.userId },
        data: {
          name: name.trim(),
          phone: phone ? phone.trim() : null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Profil berhasil diperbarui.',
        data: updatedUser,
      });
    }

    // Action 2: Change Password
    if (action === 'change_password') {
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: 'Password lama dan baru wajib diisi.' }, { status: 400 });
      }

      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'Password baru minimal 8 karakter.' }, { status: 400 });
      }

      const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { passwordHash: true },
      });

      if (!user) {
        return NextResponse.json({ error: 'User tidak ditemukan.' }, { status: 404 });
      }

      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: 'Password lama yang Anda masukkan salah.' }, { status: 400 });
      }

      const newHash = await hashPassword(newPassword);

      await db.user.update({
        where: { id: session.userId },
        data: { passwordHash: newHash },
      });

      return NextResponse.json({
        success: true,
        message: 'Password berhasil diperbarui.',
      });
    }

    return NextResponse.json({ error: 'Aksi tidak valid.' }, { status: 400 });
  } catch (error) {
    console.error('Error updating customer profile:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server internal.' }, { status: 500 });
  }
}

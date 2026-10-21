import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/session';
import { EmailQueueService } from '@/services/email/email-queue.service';
import { JobPriority } from '../../../../../../generated/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const body = await req.json();
    const targetEmail = body.targetEmail || session.email;

    const job = await EmailQueueService.enqueueEmailJob({
      recipientEmail: targetEmail,
      eventType: 'ADMIN_TEST_EMAIL',
      category: 'OPERATIONAL_ADMIN',
      templateKey: 'WELCOME',
      subject: '🧪 Uji Coba Pengiriman Email System — Gogomi Store',
      templateData: {
        customerName: session.name || 'Admin',
      },
      priority: JobPriority.HIGH,
    });

    // Run queue worker asynchronously
    process.nextTick(() => {
      EmailQueueService.processEmailQueue().catch(() => {});
    });

    return NextResponse.json({
      success: true,
      data: job,
      message: `Email uji coba berhasil dimasukkan ke antrean email untuk ${targetEmail}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengirim email tes' },
      { status: 400 }
    );
  }
}

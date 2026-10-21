import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { EmailTemplates } from '@/services/email/email-templates';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Job ID diperlukan' }, { status: 400 });
    }

    const job = await db.emailJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ success: false, error: 'Job email tidak ditemukan' }, { status: 404 });
    }

    const templateData = job.templateData ? JSON.parse(job.templateData) : {};
    const renderResult = EmailTemplates.renderTemplate(job.templateKey, templateData);

    return NextResponse.json({
      success: true,
      data: {
        id: job.id,
        recipientEmail: job.recipientEmail,
        originalRecipientEmail: job.originalRecipientEmail,
        subject: renderResult.subject,
        html: renderResult.html,
        text: renderResult.text,
        templateKey: job.templateKey,
        createdAt: job.createdAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Unauthorized' },
      { status: 401 }
    );
  }
}

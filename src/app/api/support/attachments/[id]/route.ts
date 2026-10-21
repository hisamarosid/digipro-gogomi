import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { CloudinaryService } from '@/lib/cloudinary';
import { Role } from '@/../generated/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const attachment = await db.supportAttachment.findUnique({
      where: { id },
      include: {
        ticket: {
          select: { id: true, userId: true, ticketNumber: true },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json(
        { success: false, error: 'Lampiran tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Access control: Customer can only access attachments belonging to their own tickets
    if (session.role === Role.CUSTOMER && attachment.ticket.userId !== session.userId) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Anda tidak memiliki izin untuk melihat lampiran ini.' },
        { status: 403 }
      );
    }

    // Generate short-lived signed Cloudinary URL (valid for 1 hour)
    const signedUrl = CloudinaryService.generateAuthorizedTicketUrl(attachment.publicId, 3600);

    const shouldRedirect = req.nextUrl.searchParams.get('redirect') === 'true';
    if (shouldRedirect) {
      return NextResponse.redirect(signedUrl, 302);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: attachment.id,
        url: signedUrl,
        originalFilename: attachment.originalFilename,
        bytes: attachment.bytes,
        format: attachment.format,
        createdAt: attachment.createdAt,
      },
    });
  } catch (err: any) {
    console.error('GET /api/support/attachments/[id] error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal mengambil lampiran tiket' },
      { status: 500 }
    );
  }
}

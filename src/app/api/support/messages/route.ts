import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { NotificationOrchestrator } from '@/services/email/email-orchestrator';
import { SenderType, Role, CustomerNotificationCategory } from '@/../generated/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { ticketId, message, attachmentUrl, attachmentName, attachments } = body;

    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if (!ticketId || (!message && !attachmentUrl && !hasAttachments)) {
      return NextResponse.json(
        { success: false, error: 'Pesan atau lampiran file wajib diisi' },
        { status: 400 }
      );
    }

    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Tiket tidak ditemukan' },
        { status: 404 }
      );
    }

    // Determine if sender is STAFF or CUSTOMER
    const isStaff = session.role !== Role.CUSTOMER;

    if (!isStaff && ticket.userId !== session.userId) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak' },
        { status: 403 }
      );
    }

    const senderType = isStaff ? SenderType.STAFF : SenderType.CUSTOMER;

    // Create the message with attachments
    const supportMessage = await db.supportMessage.create({
      data: {
        ticketId,
        senderId: session.userId,
        senderType,
        message: (message || '').trim(),
        attachmentUrl: attachmentUrl || (hasAttachments ? attachments[0]?.url : null),
        attachmentName: attachmentName || (hasAttachments ? attachments[0]?.originalFilename : null),
        attachments: hasAttachments
          ? {
              create: attachments.map((att: any) => ({
                ticketId,
                uploadedByUserId: session.userId,
                publicId: att.publicId || att.url,
                resourceType: att.resourceType || 'image',
                deliveryType: att.deliveryType || 'authenticated',
                format: att.format || null,
                originalFilename: att.originalFilename || att.name || 'attachment',
                bytes: att.bytes ? Number(att.bytes) : null,
                width: att.width ? Number(att.width) : null,
                height: att.height ? Number(att.height) : null,
              })),
            }
          : undefined,
      },
      include: {
        sender: {
          select: { name: true, email: true },
        },
        attachments: true,
      },
    });

    // Update ticket status & updatedAt
    const newStatus = isStaff ? 'WAITING_CUSTOMER' : 'IN_PROGRESS';
    await db.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? ticket.status : newStatus,
        updatedAt: new Date(),
      },
    });

    // Dispatch SUPPORT_REPLY email if staff replied
    if (isStaff) {
      try {
        const ticketOwner = await db.user.findUnique({
          where: { id: ticket.userId },
          select: { id: true, name: true, email: true },
        });
        if (ticketOwner?.email) {
          await NotificationOrchestrator.dispatchEvent({
            userId: ticketOwner.id,
            userEmail: ticketOwner.email,
            eventType: 'SUPPORT_REPLY',
            title: `Balasan Baru untuk Ticket Support #${ticket.ticketNumber}`,
            message: `Tim CS Gogomi Store telah membalas tiket bantuan #${ticket.ticketNumber}.`,
            actionUrl: `/account/support`,
            emailTemplateKey: 'SUPPORT_REPLY',
            emailCategory: 'SUPPORT',
            metadata: {
              customerName: ticketOwner.name || 'Customer',
              ticketNumber: ticket.ticketNumber,
              category: CustomerNotificationCategory.SUPPORT,
            },
            dedupeKey: `SUPPORT_REPLY:${supportMessage.id}`,
          }).catch(() => {});
        }
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: 'Pesan berhasil dikirim',
      data: supportMessage,
    });
  } catch (err: any) {
    console.error('POST /api/support/messages error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

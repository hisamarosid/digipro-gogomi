import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { generateTicketNumber } from '@/lib/utils/formatters';
import { NotificationOrchestrator } from '@/services/email/email-orchestrator';
import { SenderType, CustomerNotificationCategory } from '@/../generated/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const tickets = await db.supportTicket.findMany({
      where: { userId: session.userId },
      include: {
        order: { select: { orderNumber: true } },
        attachments: true,
        messages: {
          include: {
            sender: { select: { name: true } },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: tickets });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { subject, category, orderId, message, attachmentUrl, attachmentName, attachments } = body;

    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if (!subject || (!message && !attachmentUrl && !hasAttachments)) {
      return NextResponse.json({ success: false, error: 'Subjek dan pesan/lampiran wajib diisi' }, { status: 400 });
    }

    const ticketNumber = generateTicketNumber();

    const ticket = await db.supportTicket.create({
      data: {
        ticketNumber,
        userId: session.userId,
        orderId: orderId || null,
        subject,
        category: category || 'GARANSI',
        messages: {
          create: {
            senderId: session.userId,
            senderType: SenderType.CUSTOMER,
            message: message || '',
            attachmentUrl: attachmentUrl || (hasAttachments ? attachments[0]?.url : null),
            attachmentName: attachmentName || (hasAttachments ? attachments[0]?.originalFilename : null),
          },
        },
      },
      include: {
        order: { select: { orderNumber: true } },
        messages: {
          include: {
            sender: { select: { name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (hasAttachments && ticket.messages[0]?.id) {
      await db.supportAttachment.createMany({
        data: attachments.map((att: any) => ({
          ticketId: ticket.id,
          messageId: ticket.messages[0].id,
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
      });
    }

    // Refetch complete ticket with attachments
    const completeTicket = await db.supportTicket.findUnique({
      where: { id: ticket.id },
      include: {
        order: { select: { orderNumber: true } },
        attachments: true,
        messages: {
          include: {
            sender: { select: { name: true } },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Dispatch SUPPORT_TICKET_CREATED email confirmation
    if (session.email) {
      await NotificationOrchestrator.dispatchEvent({
        userId: session.userId,
        userEmail: session.email,
        eventType: 'SUPPORT_TICKET_CREATED',
        title: `Ticket Support #${ticket.ticketNumber} Berhasil Dibuat`,
        message: `Ticket bantuan #${ticket.ticketNumber} (${ticket.subject}) telah kami terima. Tim CS Gogomi Store akan segera membalas kendala Anda.`,
        actionUrl: `/account/support/${ticket.id}`,
        emailTemplateKey: 'SUPPORT_TICKET_CREATED',
        emailCategory: 'SUPPORT',
        metadata: {
          customerName: session.name || 'Customer',
          ticketNumber: ticket.ticketNumber,
          category: CustomerNotificationCategory.SUPPORT,
        },
        dedupeKey: `SUPPORT_TICKET_CREATED:${ticket.id}`,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: completeTicket });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

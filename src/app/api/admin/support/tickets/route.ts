import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { generateTicketNumber } from '@/lib/utils/formatters';
import { SenderType } from '@/../generated/prisma';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const tickets = await db.supportTicket.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        order: { select: { id: true, orderNumber: true } },
        attachments: true,
        messages: {
          include: {
            sender: { select: { name: true, email: true } },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, data: tickets });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await requireAdmin();
    const body = await req.json();
    const { userId, orderId, subject, category, priority, message, attachmentUrl, attachmentName, attachments } = body;

    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if (!userId || !subject || (!message && !attachmentUrl && !hasAttachments)) {
      return NextResponse.json(
        { success: false, error: 'Pelanggan, Subjek, dan Pesan/Lampiran wajib diisi' },
        { status: 400 }
      );
    }

    const ticketNumber = generateTicketNumber();

    const ticket = await db.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        orderId: orderId || null,
        subject: subject.trim(),
        category: category || 'GARANSI',
        priority: priority || 'MEDIUM',
        status: 'WAITING_CUSTOMER',
        messages: {
          create: {
            senderId: adminSession.userId,
            senderType: SenderType.STAFF,
            message: (message || '').trim(),
            attachmentUrl: attachmentUrl || (hasAttachments ? attachments[0]?.url : null),
            attachmentName: attachmentName || (hasAttachments ? attachments[0]?.originalFilename : null),
          },
        },
      },
      include: {
        user: { select: { name: true, email: true } },
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
          uploadedByUserId: adminSession.userId,
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

    const completeTicket = await db.supportTicket.findUnique({
      where: { id: ticket.id },
      include: {
        user: { select: { name: true, email: true } },
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

    return NextResponse.json({
      success: true,
      message: 'Tiket support baru berhasil dibuka!',
      data: completeTicket,
    });
  } catch (err: any) {
    console.error('POST /api/admin/support/tickets error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

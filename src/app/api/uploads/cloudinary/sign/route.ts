import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { CloudinaryService } from '@/lib/cloudinary';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { db } from '@/lib/db/prisma';
import { Role } from '@/../generated/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();

    // Rate limiting: 30 signature requests per minute per user
    const rateLimit = checkRateLimit(`upload-sign:${session.userId}`, 30, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak permintaan tanda tangan upload. Silakan coba sesaat lagi.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { purpose, ticketId, productId, subfolder, fileName, fileSize, fileType } = body;

    if (!purpose || (purpose !== 'PRODUCT' && purpose !== 'SUPPORT_ATTACHMENT')) {
      return NextResponse.json(
        { success: false, error: 'Tujuan upload (purpose) tidak valid. Harus PRODUCT atau SUPPORT_ATTACHMENT.' },
        { status: 400 }
      );
    }

    // 1. Validation for PRODUCT uploads
    if (purpose === 'PRODUCT') {
      // Must be an admin/staff role
      if (session.role === Role.CUSTOMER) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak. Hanya staf admin yang dapat mengunggah gambar produk.' },
          { status: 403 }
        );
      }

      // Max size: 5MB for products
      if (fileSize && fileSize > 5 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: 'Ukuran gambar produk maksimal 5MB.' },
          { status: 400 }
        );
      }

      const safeFolderTag = (subfolder || productId || 'catalog').replace(/[^a-zA-Z0-9_-]/g, '_');
      const folder = `gogomi/products/${safeFolderTag}`;

      const signedParams = CloudinaryService.createSignedUploadParams({
        purpose: 'PRODUCT',
        folder,
        deliveryType: 'upload',
        tags: ['product', 'public', 'gogomi'],
      });

      return NextResponse.json({
        success: true,
        data: signedParams,
      });
    }

    // 2. Validation for SUPPORT_ATTACHMENT uploads
    if (purpose === 'SUPPORT_ATTACHMENT') {
      // Max size: 10MB for support ticket attachments
      if (fileSize && fileSize > 10 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: 'Ukuran lampiran tiket maksimal 10MB.' },
          { status: 400 }
        );
      }

      // If ticketId is provided, verify ownership or admin permission
      if (ticketId) {
        const ticket = await db.supportTicket.findUnique({
          where: { id: ticketId },
          select: { id: true, userId: true },
        });

        if (!ticket) {
          return NextResponse.json(
            { success: false, error: 'Tiket bantuan tidak ditemukan.' },
            { status: 404 }
          );
        }

        if (session.role === Role.CUSTOMER && ticket.userId !== session.userId) {
          return NextResponse.json(
            { success: false, error: 'Akses ditolak. Anda bukan pemilik tiket ini.' },
            { status: 403 }
          );
        }
      }

      const safeTicketFolder = ticketId ? ticketId.replace(/[^a-zA-Z0-9_-]/g, '_') : `draft_${session.userId.slice(-6)}`;
      const folder = `gogomi/support/${safeTicketFolder}`;

      // Ticket attachments MUST use authenticated delivery type
      const signedParams = CloudinaryService.createSignedUploadParams({
        purpose: 'SUPPORT_ATTACHMENT',
        folder,
        deliveryType: 'authenticated',
        tags: ['support', 'authenticated', 'gogomi'],
      });

      return NextResponse.json({
        success: true,
        data: signedParams,
      });
    }

    return NextResponse.json({ success: false, error: 'Bad Request' }, { status: 400 });
  } catch (err: any) {
    console.error('POST /api/uploads/cloudinary/sign error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal memproses tanda tangan Cloudinary' },
      { status: 500 }
    );
  }
}

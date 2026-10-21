import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const access = await db.downloadAccess.findUnique({
      where: { token },
      include: {
        orderItem: {
          include: { variant: { include: { downloadAssets: true } } },
        },
      },
    });

    if (!access) {
      return new NextResponse('Link download tidak valid atau tidak ditemukan', { status: 404 });
    }

    if (access.expiresAt < new Date()) {
      return new NextResponse('Link download telah kedaluwarsa', { status: 410 });
    }

    if (access.downloadCount >= access.maxDownloads) {
      return new NextResponse('Batas maksimum unduhan telah tercapai', { status: 429 });
    }

    // Increment download count
    await db.downloadAccess.update({
      where: { id: access.id },
      data: { downloadCount: { increment: 1 } },
    });

    const asset = access.orderItem.variant.downloadAssets[0];
    const fileName = asset?.fileName || `${access.orderItem.productName}.zip`;

    // Deliver file stream or response
    const mockFileContent = `DIGITAL PRODUCT ASSET DOWNLOAD FOR ${access.orderItem.productName}\nORDER ITEM: ${access.orderItemId}\n`;

    return new NextResponse(mockFileContent, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    return new NextResponse('Internal server error during download', { status: 500 });
  }
}

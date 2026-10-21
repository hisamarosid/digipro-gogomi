import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    CloudinaryService.getCredentials();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File tidak ditemukan' },
        { status: 400 }
      );
    }

    // Limit file size to 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Ukuran file maksimal 10MB' },
        { status: 400 }
      );
    }

    const rawFolder = (formData.get('folder') as string) || 'products';
    const cleanFolder = `gogomi/${rawFolder.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary stream
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: cleanFolder,
          resource_type: 'image',
          type: 'upload',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url || uploadResult.url,
      publicId: uploadResult.public_id,
      filename: file.name,
    });
  } catch (err: any) {
    console.error('POST /api/upload error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

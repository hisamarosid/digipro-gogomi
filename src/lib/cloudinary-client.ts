export interface DirectUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  bytes: number;
  width?: number;
  height?: number;
  format: string;
  originalFilename: string;
  deliveryType: 'upload' | 'authenticated';
}

export interface UploadOptions {
  purpose: 'PRODUCT' | 'SUPPORT_ATTACHMENT';
  ticketId?: string;
  productId?: string;
  subfolder?: string;
  onProgress?: (percent: number) => void;
}

/**
 * Validates image file type and size constraints
 */
export function validateImageFile(
  file: File,
  purpose: 'PRODUCT' | 'SUPPORT_ATTACHMENT'
): { valid: boolean; error?: string } {
  const fileNameLower = file.name.toLowerCase();

  // Reject SVG specifically for security
  if (file.type === 'image/svg+xml' || fileNameLower.endsWith('.svg')) {
    return {
      valid: false,
      error: 'File SVG tidak diizinkan demi keamanan.',
    };
  }

  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  const hasValidExt = allowedExtensions.some((ext) => fileNameLower.endsWith(ext));
  const hasValidMime = allowedMimeTypes.includes(file.type);

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: 'Format file tidak didukung. Harap gunakan format JPG, JPEG, PNG, atau WEBP.',
    };
  }

  // Max sizes: 5MB for Product, 10MB for Support Ticket
  const maxBytes = purpose === 'PRODUCT' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    const maxMb = purpose === 'PRODUCT' ? 5 : 10;
    return {
      valid: false,
      error: `Ukuran file melebihi batas maksimal ${maxMb}MB.`,
    };
  }

  return { valid: true };
}

/**
 * Uploads an image file directly from the browser to Cloudinary using a backend-signed signature
 */
export async function uploadToCloudinaryDirect(
  file: File,
  options: UploadOptions
): Promise<DirectUploadResult> {
  // 1. Client-side validation
  const validation = validateImageFile(file, options.purpose);
  if (!validation.valid) {
    throw new Error(validation.error || 'Validasi file gagal');
  }

  // 2. Request signature from Gogomi backend
  const signRes = await fetch('/api/uploads/cloudinary/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      purpose: options.purpose,
      ticketId: options.ticketId,
      productId: options.productId,
      subfolder: options.subfolder,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    }),
  });

  const signData = await signRes.json();
  if (!signRes.ok || !signData.success) {
    throw new Error(signData.error || 'Gagal meminta izin tanda tangan upload Cloudinary');
  }

  const { signature, timestamp, apiKey, cloudName, folder, deliveryType, tags, uploadUrl } = signData.data;

  // 3. Construct direct upload FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', folder);
  formData.append('type', deliveryType);
  if (tags && tags.length > 0) {
    formData.append('tags', tags.join(','));
  }

  // 4. Perform direct upload with XMLHttpRequest to track upload progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl, true);

    if (options.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          options.onProgress?.(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const resJson = JSON.parse(xhr.responseText);
          resolve({
            url: resJson.url || resJson.secure_url,
            secureUrl: resJson.secure_url || resJson.url,
            publicId: resJson.public_id,
            bytes: resJson.bytes || file.size,
            width: resJson.width,
            height: resJson.height,
            format: resJson.format || file.name.split('.').pop() || 'png',
            originalFilename: resJson.original_filename || file.name,
            deliveryType: (resJson.type as any) || deliveryType,
          });
        } catch (parseErr) {
          reject(new Error('Gagal memproses respons dari Cloudinary'));
        }
      } else {
        try {
          const errJson = JSON.parse(xhr.responseText);
          reject(new Error(errJson.error?.message || `Upload gagal dengan status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload gagal dengan status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Terjadi kesalahan jaringan saat mengunggah ke Cloudinary'));
    };

    xhr.send(formData);
  });
}

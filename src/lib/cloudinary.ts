import { v2 as cloudinary } from 'cloudinary';

// Initialize and configure Cloudinary server instance
function getCloudinaryConfig() {
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudinaryUrl) {
    // Cloudinary SDK automatically parses CLOUDINARY_URL if present
    cloudinary.config({
      cloudinary_url: cloudinaryUrl,
      secure: true,
    });
  } else if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  const currentConfig = cloudinary.config();
  return {
    cloudName: currentConfig.cloud_name || '',
    apiKey: currentConfig.api_key || '',
    apiSecret: currentConfig.api_secret || '',
    isConfigured: Boolean(currentConfig.cloud_name && currentConfig.api_key && currentConfig.api_secret),
  };
}

export class CloudinaryService {
  /**
   * Validates that server has active Cloudinary credentials configured
   */
  static getCredentials() {
    const config = getCloudinaryConfig();
    if (!config.isConfigured) {
      throw new Error(
        'Cloudinary credentials are not configured. Please set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server environment variables.'
      );
    }
    return config;
  }

  /**
   * Generates signed upload parameters for direct client browser-to-Cloudinary upload
   */
  static createSignedUploadParams(options: {
    purpose: 'PRODUCT' | 'SUPPORT_ATTACHMENT';
    folder: string;
    deliveryType?: 'upload' | 'authenticated';
    tags?: string[];
  }) {
    const config = this.getCredentials();
    const timestamp = Math.round(new Date().getTime() / 1000);
    const deliveryType = options.deliveryType || (options.purpose === 'PRODUCT' ? 'upload' : 'authenticated');

    // Parameters to sign in alphabetical order per Cloudinary requirements
    const paramsToSign: Record<string, any> = {
      folder: options.folder,
      timestamp,
      type: deliveryType,
    };

    if (options.tags && options.tags.length > 0) {
      paramsToSign.tags = options.tags.join(',');
    }

    const signature = cloudinary.utils.api_sign_request(paramsToSign, config.apiSecret);

    return {
      signature,
      timestamp,
      apiKey: config.apiKey,
      cloudName: config.cloudName,
      folder: options.folder,
      deliveryType,
      tags: options.tags || [],
      uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    };
  }

  /**
   * Generates optimized public URL for commerce/product assets (f_auto, q_auto)
   */
  static buildProductImageUrl(
    publicIdOrUrl: string,
    options: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string | number;
    } = {}
  ): string {
    if (!publicIdOrUrl) return '';

    // If it's already an external non-Cloudinary URL, return as-is
    if (publicIdOrUrl.startsWith('http') && !publicIdOrUrl.includes('cloudinary.com')) {
      return publicIdOrUrl;
    }

    const publicId = this.extractPublicId(publicIdOrUrl);
    const transformation: any = {
      secure: true,
      fetch_format: 'auto',
      quality: options.quality || 'auto',
    };

    if (options.width) transformation.width = options.width;
    if (options.height) transformation.height = options.height;
    if (options.crop) transformation.crop = options.crop;

    return cloudinary.url(publicId, transformation);
  }

  /**
   * Generates short-lived signed access URL for private/authenticated ticket attachments
   */
  static generateAuthorizedTicketUrl(
    publicId: string,
    expiresInSeconds: number = 3600 // 1 hour default
  ): string {
    const config = this.getCredentials();
    const cleanPublicId = this.extractPublicId(publicId);
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

    return cloudinary.url(cleanPublicId, {
      secure: true,
      type: 'authenticated',
      sign_url: true,
      expires_at: expiresAt,
      resource_type: 'image',
    });
  }

  /**
   * Server-side secure deletion of asset from Cloudinary
   */
  static async deleteAsset(
    publicIdOrUrl: string,
    deliveryType: 'upload' | 'authenticated' = 'upload'
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    try {
      this.getCredentials();
      const publicId = this.extractPublicId(publicIdOrUrl);
      if (!publicId) return { success: false, error: 'Invalid publicId' };

      const result = await cloudinary.uploader.destroy(publicId, {
        type: deliveryType,
        resource_type: 'image',
        invalidate: true,
      });

      return {
        success: result.result === 'ok' || result.result === 'not found',
        result: result.result,
      };
    } catch (err: any) {
      console.error('[CloudinaryService.deleteAsset] error:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Extracts publicId from Cloudinary URL or relative path
   */
  static extractPublicId(urlOrId: string): string {
    if (!urlOrId) return '';
    let str = urlOrId.trim();

    // If already clean publicId (e.g. gogomi/products/prd-12345)
    if (!str.startsWith('http://') && !str.startsWith('https://')) {
      return str.replace(/\.[^/.]+$/, ''); // Remove file extension if present
    }

    try {
      const url = new URL(str);
      const pathname = url.pathname; // /<cloud_name>/image/upload/v123456789/gogomi/products/prd-123.jpg

      // Matches /image/(upload|authenticated)/(v[0-9]+/)?(.*?)(?:\.[^/.]+)?$
      const regex = /\/image\/(?:upload|authenticated)\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/;
      const match = pathname.match(regex);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }

      // Fallback: remove domain and version
      const parts = pathname.split('/');
      const uploadIdx = parts.findIndex((p) => p === 'upload' || p === 'authenticated');
      if (uploadIdx !== -1 && uploadIdx + 1 < parts.length) {
        let rest = parts.slice(uploadIdx + 1);
        if (rest[0] && /^v\d+$/.test(rest[0])) {
          rest = rest.slice(1);
        }
        return rest.join('/').replace(/\.[^/.]+$/, '');
      }

      return str;
    } catch {
      return str;
    }
  }
}

import { describe, it, expect, beforeAll } from 'vitest';
import { CloudinaryService } from '@/lib/cloudinary';
import { validateImageFile } from '@/lib/cloudinary-client';

describe('Cloudinary Integration & Security Suite', () => {
  beforeAll(() => {
    // Ensure test environment has mock/test config if not already present
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      process.env.CLOUDINARY_CLOUD_NAME = 'tnllcmlr';
      process.env.CLOUDINARY_API_KEY = 'test_api_key';
      process.env.CLOUDINARY_API_SECRET = 'test_api_secret';
    }
  });

  describe('1. Configuration & Credentials', () => {
    it('should validate and retrieve configured Cloudinary credentials', () => {
      const creds = CloudinaryService.getCredentials();
      expect(creds.isConfigured).toBe(true);
      expect(creds.cloudName).toBeDefined();
      expect(creds.apiKey).toBeDefined();
      expect(creds.apiSecret).toBeDefined();
    });
  });

  describe('2. Signed Direct Upload Generation', () => {
    it('should generate signed upload params for PRODUCT (Public Delivery)', () => {
      const params = CloudinaryService.createSignedUploadParams({
        purpose: 'PRODUCT',
        folder: 'gogomi/products/prd_canva_pro',
        deliveryType: 'upload',
      });

      expect(params.deliveryType).toBe('upload');
      expect(params.folder).toBe('gogomi/products/prd_canva_pro');
      expect(params.apiKey).toBe(process.env.CLOUDINARY_API_KEY);
      expect(params.cloudName).toBe(process.env.CLOUDINARY_CLOUD_NAME);
      expect(typeof params.signature).toBe('string');
      expect(params.signature.length).toBeGreaterThan(10);
      expect(params.uploadUrl).toBe(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`);
      // MUST NOT expose api_secret
      expect((params as any).apiSecret).toBeUndefined();
      expect((params as any).api_secret).toBeUndefined();
    });

    it('should generate signed upload params for SUPPORT_ATTACHMENT (Authenticated Private Delivery)', () => {
      const params = CloudinaryService.createSignedUploadParams({
        purpose: 'SUPPORT_ATTACHMENT',
        folder: 'gogomi/support/TCK-260818-001',
        deliveryType: 'authenticated',
      });

      expect(params.deliveryType).toBe('authenticated');
      expect(params.folder).toBe('gogomi/support/TCK-260818-001');
      expect(typeof params.signature).toBe('string');
      expect(params.signature.length).toBeGreaterThan(10);
      expect((params as any).apiSecret).toBeUndefined();
    });
  });

  describe('3. Public Asset Optimization & URL Building', () => {
    it('should format optimized public commerce URLs (f_auto, q_auto)', () => {
      const url = CloudinaryService.buildProductImageUrl('gogomi/products/prd-12345', {
        width: 400,
        height: 400,
        crop: 'fill',
      });

      expect(url).toContain('res.cloudinary.com');
      expect(url).toContain('f_auto');
      expect(url).toContain('q_auto');
      expect(url).toContain('w_400');
      expect(url).toContain('h_400');
      expect(url).toContain('c_fill');
    });

    it('should preserve external non-Cloudinary image URLs without mangling', () => {
      const extUrl = 'https://images.unsplash.com/photo-123456789?auto=format';
      const result = CloudinaryService.buildProductImageUrl(extUrl);
      expect(result).toBe(extUrl);
    });
  });

  describe('4. Authenticated / Private Ticket Attachment Access', () => {
    it('should generate signed access URLs with expiration for private ticket assets', () => {
      const signedUrl = CloudinaryService.generateAuthorizedTicketUrl('gogomi/support/tck-1/screenshot', 1800);

      expect(signedUrl).toContain('res.cloudinary.com');
      expect(signedUrl).toContain('authenticated');
      expect(signedUrl).toContain('s--'); // Cloudinary signature prefix
    });
  });

  describe('5. Public ID Extraction Helper', () => {
    it('should extract publicId correctly from raw Cloudinary URL', () => {
      const fullUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1724000000/gogomi/products/prd_photoshop.png`;
      const publicId = CloudinaryService.extractPublicId(fullUrl);
      expect(publicId).toBe('gogomi/products/prd_photoshop');
    });

    it('should handle already clean publicIds without altering them', () => {
      const id = 'gogomi/support/TCK-001/evidence_01';
      expect(CloudinaryService.extractPublicId(id)).toBe(id);
    });
  });

  describe('6. Client-Side File Validation', () => {
    it('should accept valid JPG, PNG, and WEBP files', () => {
      const jpgFile = new File(['mock data'], 'screenshot.jpg', { type: 'image/jpeg' });
      const pngFile = new File(['mock data'], 'avatar.png', { type: 'image/png' });
      const webpFile = new File(['mock data'], 'banner.webp', { type: 'image/webp' });

      expect(validateImageFile(jpgFile, 'PRODUCT').valid).toBe(true);
      expect(validateImageFile(pngFile, 'PRODUCT').valid).toBe(true);
      expect(validateImageFile(webpFile, 'SUPPORT_ATTACHMENT').valid).toBe(true);
    });

    it('should strictly reject SVG files for security', () => {
      const svgFile = new File(['<svg></svg>'], 'exploit.svg', { type: 'image/svg+xml' });
      const res = validateImageFile(svgFile, 'PRODUCT');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('SVG');
    });

    it('should reject files exceeding max size (5MB for product, 10MB for support)', () => {
      const largeBytes = new Uint8Array(6 * 1024 * 1024);
      const largeProductFile = new File([largeBytes], 'huge.png', { type: 'image/png' });

      const prodRes = validateImageFile(largeProductFile, 'PRODUCT');
      expect(prodRes.valid).toBe(false);
      expect(prodRes.error).toContain('5MB');

      const suppRes = validateImageFile(largeProductFile, 'SUPPORT_ATTACHMENT');
      expect(suppRes.valid).toBe(true); // 6MB is valid for support (max 10MB)

      const hugeBytes = new Uint8Array(11 * 1024 * 1024);
      const hugeSupportFile = new File([hugeBytes], 'enormous.png', { type: 'image/png' });
      const suppHugeRes = validateImageFile(hugeSupportFile, 'SUPPORT_ATTACHMENT');
      expect(suppHugeRes.valid).toBe(false);
      expect(suppHugeRes.error).toContain('10MB');
    });
  });
});

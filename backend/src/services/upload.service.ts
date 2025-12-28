import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import sharp from 'sharp';

interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  size?: number;
}

interface SaveProductImageResult {
  fileName: string;
  relativePath: string;
  original: ImageMetadata;
  optimized: ImageMetadata;
}

class UploadService {
  productUploadDir: string;

  constructor() {
    this.productUploadDir = path.join(__dirname, '../../uploads/products');
  }

  async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.productUploadDir, { recursive: true });
  }

  async saveProductImage(buffer: Buffer, originalName: string = 'image'): Promise<SaveProductImageResult> {
    await this.ensureDirectories();

    const safeName = path.parse(originalName).name.replace(/[^a-z0-9-_]/gi, '').toLowerCase() || 'product';
    const uniqueSuffix = crypto.randomBytes(6).toString('hex');
    const fileName = `${Date.now()}-${safeName}-${uniqueSuffix}.webp`;
    const outputPath = path.join(this.productUploadDir, fileName);

    const cleanedBuffer = buffer;

    const metadata = await sharp(cleanedBuffer).metadata();

    await sharp(cleanedBuffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outputPath);

    const optimizedMeta = await sharp(outputPath).metadata();

    return {
      fileName,
      relativePath: `/uploads/products/${fileName}`,
      original: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      },
      optimized: {
        width: optimizedMeta.width,
        height: optimizedMeta.height,
        size: optimizedMeta.size,
        format: 'webp',
      },
    };
  }
}

export = new UploadService();

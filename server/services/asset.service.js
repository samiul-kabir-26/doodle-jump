import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { assetsRepo } from '../repositories/assets.repo.js';
import { themeService } from './theme.service.js';
import { eventService } from './event.service.js';
import { assetId } from '../utils/ids.js';
import { env } from '../config/env.js';
import { getDatabase } from '../db/connection.js';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const ALLOWED_IMAGES = ['image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const ALLOWED_AUDIO = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-wav'];

export const assetService = {
  async processAndSaveUpload({ buffer, originalname, slot = null }, db = null) {
    const database = db || getDatabase();
    if (!buffer || buffer.length === 0) {
      const err = new Error('Empty file upload');
      err.code = 'INVALID_ASSET';
      err.statusCode = 422;
      throw err;
    }

    // Determine type
    let mime = null;
    let ext = 'bin';
    let kind = 'image';
    let width = null;
    let height = null;
    let finalBuffer = buffer;

    // Check if SVG text
    const textSample = buffer.slice(0, 1024).toString('utf-8').trim();
    const isSvg = textSample.includes('<svg') || originalname.toLowerCase().endsWith('.svg');

    if (isSvg) {
      mime = 'image/svg+xml';
      ext = 'svg';
      kind = 'image';

      // Sanitize SVG
      const svgText = buffer.toString('utf-8');
      const sanitized = DOMPurify.sanitize(svgText, {
        USE_PROFILES: { svg: true, svgFilters: true },
        FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object'],
        FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover']
      });

      if (!sanitized || !sanitized.includes('<svg')) {
        const err = new Error('Invalid or unsafe SVG file');
        err.code = 'INVALID_ASSET';
        err.statusCode = 422;
        throw err;
      }

      finalBuffer = Buffer.from(sanitized, 'utf-8');
    } else {
      const fileType = await fileTypeFromBuffer(buffer);
      if (!fileType) {
        const err = new Error('Unsupported or unrecognised file type');
        err.code = 'UNSUPPORTED_MEDIA_TYPE';
        err.statusCode = 415;
        throw err;
      }

      mime = fileType.mime;
      ext = fileType.ext;

      if (ALLOWED_IMAGES.includes(mime)) {
        kind = 'image';
        try {
          const image = sharp(buffer);
          const metadata = await image.metadata();

          if (metadata.width > 2048 || metadata.height > 2048) {
            const err = new Error('Image dimensions exceed 2048x2048');
            err.code = 'INVALID_ASSET';
            err.statusCode = 422;
            throw err;
          }

          width = metadata.width;
          height = metadata.height;

          // Re-encode raster image to strip EXIF and normalize
          if (mime === 'image/png') {
            finalBuffer = await image.png().toBuffer();
          } else if (mime === 'image/webp') {
            finalBuffer = await image.webp().toBuffer();
          }
        } catch (err) {
          if (err.statusCode) throw err;
          const invalidErr = new Error('Corrupt or invalid image');
          invalidErr.code = 'INVALID_ASSET';
          invalidErr.statusCode = 422;
          throw invalidErr;
        }
      } else if (ALLOWED_AUDIO.includes(mime)) {
        kind = 'audio';
      } else {
        const err = new Error(`Unsupported media type: ${mime}`);
        err.code = 'UNSUPPORTED_MEDIA_TYPE';
        err.statusCode = 415;
        throw err;
      }
    }

    // Size limit check
    const maxBytes = kind === 'audio'
      ? env.MAX_UPLOAD_MB * 2 * 1024 * 1024
      : env.MAX_UPLOAD_MB * 1024 * 1024;

    if (finalBuffer.length > maxBytes) {
      const err = new Error(`File size exceeds maximum allowed of ${maxBytes / (1024 * 1024)} MB`);
      err.code = 'PAYLOAD_TOO_LARGE';
      err.statusCode = 413;
      throw err;
    }

    // Compute SHA-256
    const sha256 = crypto.createHash('sha256').update(finalBuffer).digest('hex');
    const existing = assetsRepo.findBySha256(sha256, database);
    if (existing) {
      if (slot) {
        await this.assignSlotToDraft(slot, `/uploads/${existing.file_name}`, database);
      }
      return this.formatAsset(existing, database);
    }

    // Write file to UPLOAD_DIR
    const uploadDir = env.absoluteUploadDir;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${sha256}.${ext}`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, finalBuffer);

    const newAsset = {
      id: assetId(),
      sha256,
      file_name: fileName,
      original_name: originalname || fileName,
      mime,
      kind,
      bytes: finalBuffer.length,
      width,
      height,
      created_at: Date.now()
    };

    assetsRepo.create(newAsset, database);

    eventService.emit(
      'admin.asset_uploaded',
      {
        data: {
          assetId: newAsset.id,
          mime: newAsset.mime,
          bytes: newAsset.bytes
        }
      },
      database
    );

    if (slot) {
      await this.assignSlotToDraft(slot, `/uploads/${fileName}`, database);
    }

    return this.formatAsset(newAsset, database);
  },

  async assignSlotToDraft(slot, url, db = null) {
    if (slot.startsWith('sound.')) {
      await themeService.patchDraft({ sounds: { [slot]: url } }, db);
    } else if (slot.startsWith('player.') || slot.startsWith('platform.') || slot.startsWith('item.') || slot.startsWith('monster.') || slot.startsWith('hazard.') || slot === 'projectile') {
      await themeService.patchDraft({ sprites: { [slot]: { src: url } } }, db);
    } else if (slot === 'logo') {
      await themeService.patchDraft({ branding: { logo: url } }, db);
    } else if (slot === 'background') {
      await themeService.patchDraft({ background: { image: url } }, db);
    }
  },

  getUsedSlotsForUrl(url, db = null) {
    const database = db || getDatabase();
    const slots = [];
    const draftRow = database.prepare('SELECT theme FROM theme_draft WHERE id = 1').get();
    if (draftRow) {
      try {
        const theme = JSON.parse(draftRow.theme);
        for (const [s, cfg] of Object.entries(theme.sprites || {})) {
          if (cfg?.src === url) slots.push(`draft:${s}`);
        }
        for (const [s, soundUrl] of Object.entries(theme.sounds || {})) {
          if (soundUrl === url) slots.push(`draft:${s}`);
        }
        if (theme.branding?.logo === url) slots.push('draft:branding.logo');
        if (theme.background?.image === url) slots.push('draft:background.image');
      } catch {}
    }
    return slots;
  },

  formatAsset(row, db = null) {
    const url = `/uploads/${row.file_name}`;
    const usedInSlots = this.getUsedSlotsForUrl(url, db);
    return {
      id: row.id,
      url,
      fileName: row.file_name,
      originalName: row.original_name,
      mime: row.mime,
      kind: row.kind,
      bytes: row.bytes,
      width: row.width,
      height: row.height,
      createdAt: new Date(row.created_at).toISOString(),
      usedInSlots
    };
  },

  listAssets(kind = null, db = null) {
    const database = db || getDatabase();
    const rows = assetsRepo.findAll(kind, database);
    return rows.map((r) => this.formatAsset(r, database));
  },

  deleteAsset(id, db = null) {
    const database = db || getDatabase();
    const asset = assetsRepo.findById(id, database);
    if (!asset) {
      const err = new Error('Asset not found');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const url = `/uploads/${asset.file_name}`;
    const referencedUrls = assetsRepo.getAllReferencedUrls(database);
    if (referencedUrls.includes(url)) {
      const err = new Error('Cannot delete asset: file is in use by a theme');
      err.code = 'CONFLICT';
      err.statusCode = 409;
      throw err;
    }

    assetsRepo.deleteById(id, database);

    const filePath = path.join(env.absoluteUploadDir, asset.file_name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    eventService.emit(
      'admin.asset_deleted',
      {
        data: { assetId: id }
      },
      database
    );

    return true;
  }
};

import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../config/env.js';
import { getDatabase } from '../db/connection.js';

const adminSecret = new TextEncoder().encode(env.ADMIN_JWT_SECRET);
const playerSecret = new TextEncoder().encode(env.PLAYER_JWT_SECRET);
const hostSecret = env.HOST_SIGNING_SECRET ? new TextEncoder().encode(env.HOST_SIGNING_SECRET) : null;

// Derived encryption key for webhook secret (AES-256-GCM)
const webhookEncKey = crypto.createHash('sha256').update(`${env.ADMIN_JWT_SECRET}:webhook-salt`).digest();

export const authService = {
  verifyAdminCredentials(username, password) {
    if (!username || !password) return false;
    const userHash = crypto.createHash('sha256').update(String(username)).digest();
    const expectedUserHash = crypto.createHash('sha256').update(env.ADMIN_USERNAME).digest();
    const passHash = crypto.createHash('sha256').update(String(password)).digest();
    const expectedPassHash = crypto.createHash('sha256').update(env.ADMIN_PASSWORD).digest();

    const userMatch = crypto.timingSafeEqual(userHash, expectedUserHash);
    const passMatch = crypto.timingSafeEqual(passHash, expectedPassHash);
    return userMatch && passMatch;
  },

  async signAdminToken(username) {
    const hours = env.ADMIN_SESSION_HOURS || 8;
    return await new SignJWT({ role: 'admin', username })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience('doodle-jump-admin')
      .setIssuedAt()
      .setExpirationTime(`${hours}h`)
      .sign(adminSecret);
  },

  async verifyAdminToken(token) {
    try {
      const { payload } = await jwtVerify(token, adminSecret, {
        audience: 'doodle-jump-admin'
      });
      return payload;
    } catch {
      return null;
    }
  },

  async signPlayerToken(player) {
    return await new SignJWT({
      sub: player.id,
      externalUserId: player.external_user_id || null,
      mode: player.mode,
      displayName: player.display_name
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience('doodle-jump-player')
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(playerSecret);
  },

  async verifyPlayerToken(token) {
    try {
      const { payload } = await jwtVerify(token, playerSecret, {
        audience: 'doodle-jump-player'
      });
      return payload;
    } catch {
      return null;
    }
  },

  async verifyLaunchToken(token, db = null) {
    if (!hostSecret) {
      throw new Error('Host launch tokens are not configured (HOST_SIGNING_SECRET is empty)');
    }

    let payload;
    try {
      const result = await jwtVerify(token, hostSecret, {
        audience: 'doodle-jump'
      });
      payload = result.payload;
    } catch (err) {
      throw new Error(`Invalid launch token: ${err.message}`);
    }

    if (!payload.sub || !payload.name) {
      throw new Error('Launch token missing sub or name claim');
    }

    // Check exp <= iat + 900 s (15 min)
    if (payload.exp && payload.iat && payload.exp - payload.iat > 905) {
      throw new Error('Launch token lifespan exceeds 15 minutes');
    }

    // Check single-use jti
    const jti = payload.jti;
    if (!jti) {
      throw new Error('Launch token missing jti claim');
    }

    const database = db || getDatabase();
    const existing = database.prepare('SELECT jti FROM used_launch_tokens WHERE jti = ?').get(jti);
    if (existing) {
      throw new Error('Launch token has already been used');
    }

    const expTime = (payload.exp || Math.floor(Date.now() / 1000) + 900) * 1000;
    database
      .prepare('INSERT INTO used_launch_tokens (jti, expires_at) VALUES (?, ?)')
      .run(jti, expTime);

    return payload;
  },

  purgeExpiredLaunchTokens(db = null) {
    const database = db || getDatabase();
    return database
      .prepare('DELETE FROM used_launch_tokens WHERE expires_at < ?')
      .run(Date.now());
  },

  encryptSecret(secretText) {
    if (!secretText) return '';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', webhookEncKey, iv);
    const enc = Buffer.concat([cipher.update(secretText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
  },

  decryptSecret(cipherB64) {
    if (!cipherB64) return '';
    try {
      const buf = Buffer.from(cipherB64, 'base64');
      if (buf.length < 28) return '';
      const iv = buf.subarray(0, 12);
      const tag = buf.subarray(12, 28);
      const enc = buf.subarray(28);
      const decipher = crypto.createDecipheriv('aes-256-gcm', webhookEncKey, iv);
      decipher.setAuthTag(tag);
      return decipher.update(enc, undefined, 'utf8') + decipher.final('utf8');
    } catch {
      return '';
    }
  }
};

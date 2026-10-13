import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  PUBLIC_BASE_URL: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  ADMIN_USERNAME: z.string().min(1, 'ADMIN_USERNAME is required'),
  ADMIN_PASSWORD: z.string().min(1, 'ADMIN_PASSWORD is required'),
  ADMIN_JWT_SECRET: z.string().min(1, 'ADMIN_JWT_SECRET is required'),
  ADMIN_SESSION_HOURS: z.coerce.number().default(8),

  PLAYER_JWT_SECRET: z.string().min(1, 'PLAYER_JWT_SECRET is required'),
  ALLOW_ANONYMOUS: z.preprocess((val) => val === 'true' || val === true || val === undefined, z.boolean()).default(true),

  HOST_SIGNING_SECRET: z.string().optional().default(''),
  INTEGRATION_API_KEY: z.string().optional().default(''),
  CORS_ORIGINS: z.string().optional().default(''),
  FRAME_ANCESTORS: z.string().optional().default("'self'"),

  WEBHOOK_URL: z.string().optional().default(''),
  WEBHOOK_SECRET: z.string().optional().default(''),

  DB_PATH: z.string().default('./data/doodle.db'),
  UPLOAD_DIR: z.string().default('./data/uploads'),
  MAX_UPLOAD_MB: z.coerce.number().default(2),

  MAX_SCORE_RATE: z.coerce.number().default(450),
  EVENT_RETENTION_DAYS: z.coerce.number().default(180)
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    if (data.ADMIN_PASSWORD.length < 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ADMIN_PASSWORD'],
        message: 'ADMIN_PASSWORD must be at least 12 characters in production'
      });
    }
    if (data.ADMIN_JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ADMIN_JWT_SECRET'],
        message: 'ADMIN_JWT_SECRET must be at least 32 characters in production'
      });
    }
    if (data.PLAYER_JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PLAYER_JWT_SECRET'],
        message: 'PLAYER_JWT_SECRET must be at least 32 characters in production'
      });
    }
  }
});

let parsedEnv;
try {
  parsedEnv = envSchema.parse(process.env);
} catch (err) {
  if (err instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    for (const issue of err.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
  throw err;
}

export const env = {
  ...parsedEnv,
  parsedCorsOrigins: parsedEnv.CORS_ORIGINS
    ? parsedEnv.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : [],
  absoluteDbPath: path.resolve(parsedEnv.DB_PATH),
  absoluteUploadDir: path.resolve(parsedEnv.UPLOAD_DIR)
};

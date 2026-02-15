import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default('postgresql://musicstream:localdev123@localhost:5432/musicstream'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  INVIDIOUS_URL: z.string().default('http://localhost:3001'),
  PIPED_URL: z.string().default('http://localhost:3002'),
  NEWPIPE_URL: z.string().default('http://localhost:3004'),
  JWT_SECRET: z.string().default('musicstream_dev_jwt_secret_key_change_in_production'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  S3_BUCKET: z.string().default('musicstream-dev-assets'),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  CORS_ORIGINS: z.string().default('*'),
  LOG_LEVEL: z.string().default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  invidiousUrl: env.INVIDIOUS_URL,
  pipedUrl: env.PIPED_URL,
  newpipeUrl: env.NEWPIPE_URL,
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  s3Bucket: env.S3_BUCKET,
  s3Endpoint: env.S3_ENDPOINT,
  s3AccessKey: env.S3_ACCESS_KEY,
  s3SecretKey: env.S3_SECRET_KEY,
  corsOrigins: env.CORS_ORIGINS.split(','),
  logLevel: env.LOG_LEVEL,
} as const;

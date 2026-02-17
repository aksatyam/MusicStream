import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { config } from '../config/env.js';

// Use fewer connections on free-tier hosting (Render free = limited connections)
const maxConnections = config.nodeEnv === 'production' ? 5 : 20;

const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: maxConnections,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  // Render Postgres requires SSL in production
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', err => {
  console.error('Unexpected PG pool error:', err.message);
});

export async function query<T extends pg.QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function getOne<T extends pg.QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const result = await pool.query<T>(text, params);
  return result.rows[0] ?? null;
}

export async function isHealthy(): Promise<boolean> {
  try {
    await Promise.race([
      pool.query('SELECT 1'),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('db health timeout')), 3_000)),
    ]);
    return true;
  } catch {
    return false;
  }
}

/** Run SQL migration files from the migrations/ directory on startup */
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Find migrations directory (works in both dev and Docker)
    const migrationsDir = path.resolve(process.cwd(), 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found, skipping');
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
      if (rows.length > 0) continue;

      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      console.log(`Migration complete: ${file}`);
    }
  } finally {
    client.release();
  }
}

export { pool };

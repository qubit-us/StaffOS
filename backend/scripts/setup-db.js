#!/usr/bin/env node
/**
 * One-time database setup: runs schema.sql then seed.sql.
 * Usage: node scripts/setup-db.js
 */
import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  console.log('Connected to database.');

  const schema = readFileSync(join(__dirname, '../src/db/schema.sql'), 'utf8');
  const seed   = readFileSync(join(__dirname, '../src/db/seed.sql'),   'utf8');

  console.log('Running schema...');
  await client.query(schema);
  console.log('Schema applied.');

  console.log('Running seed...');
  await client.query(seed);
  console.log('Seed applied.');

  await client.end();
  console.log('Done. Database is ready.');
}

run().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});

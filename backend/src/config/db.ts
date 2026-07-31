import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import dotenv from 'dotenv';
import * as schema from '../schema/index.js';

dotenv.config();

// Default to local SQLite file for instant zero-config development
const url = process.env.DATABASE_URL || 'file:./local.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

export const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client, { schema });

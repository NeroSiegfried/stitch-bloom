import postgres from 'postgres';
import { HttpError } from './http.js';

let client;

export function db() {
  if (!process.env.DATABASE_URL) {
    throw new HttpError(503, 'The database has not been configured yet.');
  }
  if (!client) {
    client = postgres(process.env.DATABASE_URL, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require',
    });
  }
  return client;
}

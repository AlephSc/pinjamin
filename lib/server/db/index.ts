import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

// Server-only module. Keep DATABASE_URL out of client code and source control.
declare global {
  // eslint-disable-next-line no-var
  var __pinjaminPgPool: Pool | undefined;
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required for database access');

  globalThis.__pinjaminPgPool ??= new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  return globalThis.__pinjaminPgPool;
}

/** Execute parameterized SQL; supply values separately, never interpolate user input. */
export function query<Row extends QueryResultRow = QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<QueryResult<Row>> {
  return getPool().query<Row>(text, [...values]);
}

/** Run related writes on one connection; rollback on failure. */
export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Preserve the original operation error; release the connection below.
    }
    throw error;
  } finally {
    client.release();
  }
}

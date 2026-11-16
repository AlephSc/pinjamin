import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
try {
  // Current shared schema starts with a shell-style # header, invalid in PostgreSQL.
  // Strip only that header for structural validation; migration remains blocked until fixed.
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await db.exec(schema.replace(/^# db\/schema\.sql[^\n]*\r?\n/, ''));
  await db.exec(await readFile(new URL('./seed.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('./seed.sql', import.meta.url), 'utf8'));

  const { rows: toolRows } = await db.query(`
    select count(*)::int as tools,
           sum(stock)::int as stock,
           sum(available)::int as available
    from tools
  `);
  assert.deepEqual(toolRows[0], { tools: 8, stock: 67, available: 40 });

  const { rows: categoryRows } = await db.query(`
    select categories.name, count(tools.id)::int as kinds
    from categories left join tools on tools.category_id = categories.id
    group by categories.id order by categories.name
  `);
  assert.equal(categoryRows.length, 5);
  assert.equal(categoryRows.reduce((sum, row) => sum + row.kinds, 0), 8);

  await assert.rejects(
    db.query(`insert into tools (code, name, category_id, stock, available)
      values ('INVALID', 'Invalid', 1, 1, 2)`),
    /tools_available_not_over_stock|check constraint/i,
  );
  console.log('PGlite self-check passed: schema, idempotent demo seed, category links, stock check.');
} finally {
  await db.close();
}

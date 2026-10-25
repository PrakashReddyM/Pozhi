// ==========================================
// Copy drizzle-kit's introspection output into src/ so the app can import it.
//
// drizzle-kit writes to the `out` directory (./drizzle) together with its SQL
// snapshots and metadata. tsc's rootDir is ./src, so the app cannot import
// from outside it — hence the copy rather than a re-export.
//
// Run via: npm run db:pull
// ==========================================

const fs = require('fs');
const path = require('path');

const BACKEND = path.resolve(__dirname, '..');
const FROM = path.join(BACKEND, 'drizzle');
const TO = path.join(BACKEND, 'src', 'db');

const HEADER = `// ==========================================
// GENERATED FILE - DO NOT EDIT
//
// Produced by: npm run db:pull
// Source of truth: db/init/01_schema.sql (applied to the database, then
// introspected back out). Edit the SQL, re-apply it, and re-run db:pull.
// ==========================================

`;

fs.mkdirSync(TO, { recursive: true });

let copied = 0;
for (const file of ['schema.ts', 'relations.ts']) {
  const src = path.join(FROM, file);
  if (!fs.existsSync(src)) {
    console.error(`missing ${path.relative(BACKEND, src)} - run drizzle-kit pull first`);
    process.exit(1);
  }

  let body = fs.readFileSync(src, 'utf8');

  // relations.ts imports "./schema", which resolves the same way in src/db.
  if (!body.startsWith('//')) body = HEADER + body;

  fs.writeFileSync(path.join(TO, file), body);
  console.log(`synced src/db/${file}`);
  copied++;
}

console.log(`${copied} file(s) synced`);

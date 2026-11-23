#!/usr/bin/env node
/**
 * Glance Firestore Seed Script
 *
 * Uploads book summaries to Cloud Firestore using the read-quota optimized schema:
 *   - catalog/books         (1 document listing all books for the browse screen)
 *   - summaries/{bookId}    (1 document per book containing overview, takeaways, chapters)
 *
 * Usage:
 *   1. Download a Firebase Service Account JSON key from Firebase Console -> Project Settings -> Service Accounts.
 *   2. Set GOOGLE_APPLICATION_CREDENTIALS=./service-account.json (or pass a path via env).
 *   3. Run: npm run seed
 *      Optional custom JSON file: node scripts/seed-firestore.mjs ./path/to/books.json
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cliArgs = process.argv.slice(2);
const replaceCatalog = cliArgs.includes('--replace');
const fileArg = cliArgs.find((arg) => !arg.startsWith('--'));

const inputPath = fileArg
  ? path.resolve(process.cwd(), fileArg)
  : path.resolve(__dirname, '../src/data/sampleBooks.json');

if (!fs.existsSync(inputPath)) {
  console.error(`❌ Input file not found: ${inputPath}`);
  process.exit(1);
}

const defaultCredPath = path.resolve(__dirname, '../service-account.json');
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || (fs.existsSync(defaultCredPath) ? defaultCredPath : '');
if (credPath && fs.existsSync(credPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
  initializeApp({ credential: cert(serviceAccount) });
} else {
  console.log('ℹ️  Using Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS)...');
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();
const books = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

if (!Array.isArray(books) || books.length === 0) {
  console.error('❌ Expected a non-empty JSON array of books.');
  process.exit(1);
}

const publicDir = path.resolve(__dirname, '../public');

/**
 * Resolves local `/covers/*.svg` paths into self-contained base64 data URIs
 * so covers render immediately from Firestore without requiring a frontend redeploy.
 */
function resolveCoverUrl(coverUrl) {
  if (typeof coverUrl === 'string' && coverUrl.startsWith('/covers/') && coverUrl.endsWith('.svg')) {
    const svgPath = path.join(publicDir, coverUrl.slice(1));
    if (fs.existsSync(svgPath)) {
      const svgContent = fs.readFileSync(svgPath, 'utf-8').trim();
      return `data:image/svg+xml;base64,${Buffer.from(svgContent, 'utf-8').toString('base64')}`;
    }
  }
  return coverUrl;
}

const catalogItems = books.map((book) => ({
  id: book.id,
  title: book.title,
  author: book.author,
  coverUrl: resolveCoverUrl(book.coverUrl),
  categories: book.categories ?? [],
  readTimeMinutes: book.readTimeMinutes ?? 10,
  chapterCount: Array.isArray(book.chapters) ? book.chapters.length : 0,
  tagline: book.tagline ?? '',
}));

async function seed() {
  const catalogRef = db.doc('catalog/books');
  let mergedCatalog = catalogItems;

  if (!replaceCatalog) {
    const existingSnap = await catalogRef.get();
    const existingBooks = existingSnap.exists && Array.isArray(existingSnap.data()?.books)
      ? existingSnap.data().books
      : [];

    const byId = new Map(existingBooks.map((item) => [item.id, item]));
    for (const item of catalogItems) {
      byId.set(item.id, item);
    }
    mergedCatalog = Array.from(byId.values());
  }

  const batch = db.batch();

  // 1. Write catalog/books (1 read for the entire Library screen)
  batch.set(catalogRef, {
    updatedAt: new Date().toISOString(),
    books: mergedCatalog,
  });

  // 2. Write summaries/{bookId} (1 read per opened book)
  for (const book of books) {
    batch.set(db.doc(`summaries/${book.id}`), {
      id: book.id,
      title: book.title,
      author: book.author,
      coverUrl: resolveCoverUrl(book.coverUrl),
      categories: book.categories ?? [],
      readTimeMinutes: book.readTimeMinutes ?? 10,
      overview: book.overview ?? '',
      keyTakeaways: book.keyTakeaways ?? [],
      chapters: book.chapters ?? [],
    });
  }

  await batch.commit();
  const mode = replaceCatalog ? 'replaced' : 'upserted';
  console.log(
    `✅ ${mode[0].toUpperCase() + mode.slice(1)} ${books.length} books to Firestore (catalog/books now has ${mergedCatalog.length} total).`
  );
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

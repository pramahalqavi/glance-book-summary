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

const inputPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
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

const catalogItems = books.map((book) => ({
  id: book.id,
  title: book.title,
  author: book.author,
  coverUrl: book.coverUrl,
  categories: book.categories ?? [],
  readTimeMinutes: book.readTimeMinutes ?? 10,
  chapterCount: Array.isArray(book.chapters) ? book.chapters.length : 0,
  tagline: book.tagline ?? '',
}));

async function seed() {
  const batch = db.batch();

  // 1. Write catalog/books (1 read for the entire Library screen)
  batch.set(db.doc('catalog/books'), {
    updatedAt: new Date().toISOString(),
    books: catalogItems,
  });

  // 2. Write summaries/{bookId} (1 read per opened book)
  for (const book of books) {
    batch.set(db.doc(`summaries/${book.id}`), {
      id: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      categories: book.categories ?? [],
      readTimeMinutes: book.readTimeMinutes ?? 10,
      overview: book.overview ?? '',
      keyTakeaways: book.keyTakeaways ?? [],
      chapters: book.chapters ?? [],
    });
  }

  await batch.commit();
  console.log(`✅ Seeded ${books.length} books to Firestore (catalog/books + summaries/*).`);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

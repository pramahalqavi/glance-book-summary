# Glance — Book Summary PWA

A responsive, Blinkist-inspired Book Summary Progressive Web App (PWA) built for **mobile (iOS & Android)** and **desktop** browsers, featuring a **Dual-Mode Reader** (**Scroll Mode** + **Swipe Mode**) with consistent horizontal chapter transitions, running on a **\$0 free-tier** Cloudflare Pages + Firebase Firestore architecture.

## Quick Start

```bash
npm install
npm run dev
```

Out of the box, Glance runs in **Local-First Mode** with 5 built-in book summaries (*Atomic Habits*, *Thinking, Fast and Slow*, *Deep Work*, *The Psychology of Money*, and *Sapiens*).

## Connecting Firebase Cloud Firestore & Google OAuth

1. Copy `.env.example` to `.env` and fill in your Firebase Web App credentials (`VITE_FIREBASE_*`).
2. Deploy `firestore.rules` and Firebase Authentication (Google Sign-In) to your Firebase project:
   ```bash
   firebase deploy --only auth,firestore:rules
   ```
3. In **Firebase Console → Authentication → Settings → Authorized domains**, ensure `localhost` (for dev) and your **Cloudflare Pages domain** (e.g. `your-app.pages.dev`) are listed so Google Sign-In popups are authorized.
4. Download a Firebase Service Account JSON key, save it as `service-account.json` (git-ignored), and seed the sample catalog:
   ```bash
   npm run seed
   ```
   Or seed from a custom JSON file:
   ```bash
   node scripts/seed-firestore.mjs ./path/to/my-books.json
   ```

Once configured, Glance automatically loads `catalog/books` (1 read) and `summaries/{bookId}` (1 read per opened book) with **Firestore IndexedDB offline persistence** enabled, and lets users optionally sign in with Google to sync their bookmarks, progress, and reader preferences via `users/{uid}` (1 read/write).

## Deploying to Cloudflare Pages

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- SPA routing is handled automatically via `public/_redirects`.

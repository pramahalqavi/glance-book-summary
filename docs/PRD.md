# Product Requirements Document (PRD): Glance

## 1. Overview
**Glance** is a responsive, Blinkist-inspired **Book Summary Progressive Web App (PWA)** designed for both **mobile (iOS & Android)** and **desktop** browsers, allowing users to browse a cloud-hosted library of book summaries and read them comfortably on any screen size.

The signature experience is a **configurable dual-mode reader** supporting both vertical **Scroll Mode** and book-like horizontal **Swipe Mode**, while enforcing a consistent **horizontal swipe gesture to move between chapters** in both modes.

The entire platform is designed to run on a **\$0 free-tier cloud architecture** using **Cloudflare Pages** (frontend) and **Firebase Cloud Firestore** (cloud database).

---

## 2. Goals & Non-Goals

### Goals (MVP)
- Provide a fast, distraction-free reading experience across **mobile (iOS & Android)** and **desktop** web browsers, installable as a PWA on both platforms.
- Support browsing, filtering, and searching book summaries stored in the cloud.
- Allow users to switch between **Scroll Mode** and **Swipe (Book) Mode** at any time.
- Enforce **horizontal page swiping** for chapter-to-chapter navigation in both reading modes.
- Support offline reading of previously opened summaries and preserve reading progress.
- Stay strictly within **Cloudflare Pages** and **Firebase Spark** free-tier limits.

### Non-Goals (Out of Scope for MVP)
- Audio summaries / text-to-speech playback.
- Paid subscriptions, paywalls, or billing integration.
- Social features (reviews, comments, shared highlights).
- Full in-app CMS editor (MVP content will be managed via a lightweight CLI/script or Firebase Console).

---

## 3. Target Users & Platform Support
Glance treats both **Mobile** and **Desktop** as first-class reading environments:
- **Mobile (iOS & Android):** iOS Safari / Home Screen PWA and Android Chrome / Home Screen PWA. Optimized for one-handed touch gestures, bottom navigation, safe-area insets, and full-screen reading.
- **Desktop & Tablet (Windows, macOS, Linux, iPadOS):** Modern browsers (Chrome, Safari, Edge, Firefox) and installable Desktop PWA. Features a multi-column library grid, a centered optimal-width reading column (`~65ch`), keyboard navigation, and mouse/trackpad gesture support.

---

## 4. Functional Requirements

### 4.1 Library & Discovery (Home Screen)
- Display a catalog of available book summaries with:
  - Cover image, title, author, category/tags, chapter count, and estimated reading time.
- **Continue Reading** section at the top for books in progress.
- **Instant Search:** Filter books by title, author, or tag (client-side fuzzy search).
- **Category Filter:** Horizontal scrollable category pills (e.g., *All*, *Productivity*, *Psychology*, *Business*, *Science*).

### 4.2 Book Detail Screen
- Displays book cover, title, author, category tags, estimated reading time, and a brief synopsis ("What it's about").
- Lists the **Table of Contents** (all chapters with titles).
- Primary CTA: **Start Reading** (or **Continue Chapter X** if already started).
- Bookmark / Save button to add or remove the book from **My Library**.

### 4.3 Dual-Mode Reader (Core Experience)

#### Reading Mode Configuration
Users can choose their preferred reading mode in the Reader Settings menu (persisted across sessions):

1. **Scroll Mode (Vertical Scroll per Chapter)**
   - Each chapter is displayed as a vertically scrollable page.
   - Vertical touch/drag scrolls through the current chapter's content.
   - **Chapter Transition:** Swiping horizontally (left for next chapter, right for previous chapter) moves to the adjacent chapter.

2. **Swipe Mode (Book-Like Pagination)**
   - Each chapter's text is dynamically paginated into screen-sized pages based on the current viewport height and chosen font size (no vertical scrolling).
   - Horizontal swipe left/right flips page-by-page within the chapter.
   - **Chapter Transition:** Swiping past the last page of a chapter transitions to the first page of the next chapter; swiping back from page 1 returns to the last page of the previous chapter.

> **Consistent Chapter Navigation Rule:** In **both** Scroll Mode and Swipe Mode, advancing to the next chapter or returning to the previous chapter uses a **horizontal page transition**—triggered via **horizontal touch swipe** on mobile, or **trackpad swipe, mouse drag, keyboard `Left`/`Right` arrow keys, or subtle side navigation buttons** on desktop.

#### Reader Controls & Ergonomics
- **Responsive Reading Layout:**
  - **Mobile:** Full-bleed reading viewport with tap-to-toggle top/bottom HUD bars for distraction-free reading.
  - **Desktop:** Centered reading column (`max-width: 680px–720px`) for comfortable line length, subtle hoverable Previous/Next arrows on the margins, and optional pinned or collapsible Table of Contents sidebar.
- **Progress Indicator:** Shows current chapter (e.g., *Chapter 3 of 8*) and page indicator in Swipe Mode (e.g., *Page 2 of 4*), plus a thin progress bar.
- **Chapter Drawer / Sidebar:** Quick-access Table of Contents to jump directly to any chapter.
- **Typography & Theme Settings:**
  - Reading Mode toggle: **Scroll** vs. **Swipe**.
  - Font size: Small / Medium / Large / Extra Large.
  - Theme: **Light**, **Sepia**, and **Dark** (OLED-friendly).
- **Rich Text Formatting:** Chapter bodies stored in Markdown supporting headings, bold/italic text, bullet lists, and styled callout/quote blocks.

### 4.4 Reading Progress, Bookmarks & Preferences
- **Local-First Persistence (MVP):** Automatically saves reading progress (book ID, chapter index, page/scroll offset), saved bookmarks, and reader preferences (mode, theme, font size) in `localStorage` / IndexedDB.
- **Optional Cloud Sync (Phase 2 / Post-MVP):** Sign in via Firebase Auth (Google / Email) to sync progress, bookmarks, and preferences across devices.

### 4.5 PWA & Offline Support
- Valid `manifest.webmanifest` and app icons supporting install prompts on **iOS** (`apple-touch-icon`, `apple-mobile-web-app-capable`), **Android**, and **Desktop** (Chrome/Edge standalone window).
- Service Worker caches the app shell and assets for instant loading.
- Firestore IndexedDB persistence caches opened book summaries so users can re-read them offline.

---

## 5. Technical Architecture (Free-Tier Optimized)

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | Vite + React (TypeScript) + Tailwind CSS | Fast, pure static SPA build; zero SSR/edge-runtime friction |
| **PWA** | `vite-plugin-pwa` (Workbox) | Automated service worker and manifest generation |
| **Markdown** | `react-markdown` | Clean rendering of chapter content |
| **Search** | `Fuse.js` | Instant client-side fuzzy search with zero DB query cost |
| **Hosting** | **Cloudflare Pages** (Free Tier) | Unlimited static bandwidth, global CDN, commercial use allowed |
| **Cloud DB** | **Firebase Cloud Firestore** (Spark Free Tier) | 1 GiB storage, 50k reads/day, offline cache, never pauses |
| **Cover Images** | Compressed `.webp` in `/public/covers/` or **Cloudflare R2** | Avoids Firebase Storage Blaze-plan requirement; \$0 egress |

### 5.1 Firestore Data Model (Read-Quota Optimized)
To stay well within Firestore's **50,000 free reads/day**, documents are grouped to minimize read counts:

1. **Catalog Index (`catalog/books`) — 1 read for the entire browse screen**
   ```json
   {
     "updatedAt": "2026-11-22T00:00:00Z",
     "books": [
       {
         "id": "atomic-habits",
         "title": "Atomic Habits",
         "author": "James Clear",
         "coverUrl": "/covers/atomic-habits.webp",
         "categories": ["Productivity", "Psychology"],
         "readTimeMinutes": 15,
         "chapterCount": 7,
         "tagline": "Tiny changes, remarkable results."
       }
     ]
   }
   ```
   *(Supports ~1,000+ books within Firestore's 1 MiB document limit.)*

2. **Book Summary Content (`summaries/{bookId}`) — 1 read per book opened**
   ```json
   {
     "id": "atomic-habits",
     "title": "Atomic Habits",
     "author": "James Clear",
     "overview": "Short synopsis of the book...",
     "keyTakeaways": ["Takeaway 1", "Takeaway 2"],
     "chapters": [
       {
         "index": 0,
         "title": "The Surprising Power of Atomic Habits",
         "contentMarkdown": "## Heading\n\nChapter body in Markdown..."
       }
     ]
   }
   ```

3. **User Data (`users/{uid}`) — Optional (if Auth is enabled)**
   - Stores `preferences` (`readingMode`, `theme`, `fontSize`), `bookmarks` (array of `bookId`), and `progress` (map of `bookId -> { chapterIndex, completed }`).

### 5.2 Firestore Security Rules
- `catalog/*` and `summaries/*`: `allow read: if true; allow write: if false;` (writes performed via Admin SDK script or verified admin UID).
- `users/{uid}`: `allow read, write: if request.auth != null && request.auth.uid == uid;`

---

## 6. Non-Functional Requirements
- **Mobile Viewport Stability:** Use `100dvh` and CSS safe-area insets (`env(safe-area-inset-*)`) so mobile browser address bars and notches do not clip content or break Swipe Mode pagination.
- **Gesture Disambiguation:** Ensure horizontal swipes in Scroll Mode require a clear horizontal intent (angle/threshold check) so diagonal vertical scrolling does not accidentally trigger a chapter change, and avoid conflicts with iOS Safari's left-edge back gesture.
- **Performance:** Smooth 60fps swipe transitions; initial First Contentful Paint < 1.5s on mobile 4G.
- **Accessibility:** Minimum 44x44px touch targets, high-contrast color themes, and keyboard navigation (`Left`/`Right` arrows for chapters/pages) on desktop.

---

## 7. Implementation Milestones
1. **Phase 1 — Foundation:** Scaffold Vite + React + Tailwind + PWA, connect Firebase Firestore, set up Firestore rules, and create a seed script with 3–5 sample book summaries.
2. **Phase 2 — Discovery & Details:** Build Home/Library screen, client-side search, category filters, and Book Detail screen.
3. **Phase 3 — Dual-Mode Reader:** Implement outer horizontal chapter pager, Scroll Mode, dynamic-pagination Swipe Mode, HUD controls, and Theme/Typography settings.
4. **Phase 4 — Offline & Deployment:** Enable Firestore offline persistence, local progress/bookmark persistence, PWA install polish, and deploy to Cloudflare Pages.
5. **Phase 5 — Optional Enhancements:** Firebase Auth for cross-device sync and a simple admin upload utility for adding new book summaries.

---

## 8. Open Decisions
Before starting implementation, confirm:
1. **User Accounts in MVP:** Start with **no login required** (local-only progress/bookmarks for fastest launch), or include **Firebase Auth (Google Sign-In)** from day 1?
2. **Content Workflow:** Are you comfortable adding/updating book summaries via a local Markdown/JSON upload script (using Firebase Admin SDK), or do you want a password-protected `/admin` page in the app?

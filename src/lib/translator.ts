import type { BookLanguage, Chapter, TranslationDirection } from '../types/book';
import {
  clearTranslationsForLanguage,
  getCachedChapterTranslation,
  saveCachedChapterTranslation,
} from './translationCache';

const CACHE_NAME = 'glance-translation-packs-v1';

export interface PackInfo {
  direction: TranslationDirection;
  from: BookLanguage;
  to: BookLanguage;
  label: string;
  shortLabel: string;
  approxMB: number;
  files: {
    model: string;
    shortlist: string;
    vocab: string;
  };
}

export const PACK_INFO: Record<TranslationDirection, PackInfo> = {
  enid: {
    direction: 'enid',
    from: 'en',
    to: 'id',
    label: 'English → Bahasa Indonesia',
    shortLabel: 'Bahasa Indonesia',
    approxMB: 13.6,
    files: {
      model: '/models/enid/model.enid.intgemm.alphas.bin.gz',
      shortlist: '/models/enid/lex.50.50.enid.s2t.bin.gz',
      vocab: '/models/enid/vocab.enid.spm.gz',
    },
  },
  iden: {
    direction: 'iden',
    from: 'id',
    to: 'en',
    label: 'Bahasa Indonesia → English',
    shortLabel: 'English',
    approxMB: 14.3,
    files: {
      model: '/models/iden/model.iden.intgemm.alphas.bin.gz',
      shortlist: '/models/iden/lex.50.50.iden.s2t.bin.gz',
      vocab: '/models/iden/vocab.iden.spm.gz',
    },
  },
};

const ENGINE_FILES = [
  '/bergamot/translator-worker.js',
  '/bergamot/bergamot-translator-worker.js',
  '/bergamot/bergamot-translator-worker.wasm',
];

export interface DownloadProgress {
  percent: number;
  receivedBytes: number;
  totalBytes: number;
  stage: 'downloading' | 'caching';
}

export function getDirectionForSource(sourceLang: BookLanguage): TranslationDirection {
  return sourceLang === 'id' ? 'iden' : 'enid';
}

export function getTargetLanguage(sourceLang: BookLanguage): BookLanguage {
  return sourceLang === 'id' ? 'en' : 'id';
}

export async function isPackDownloaded(direction: TranslationDirection): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const info = PACK_INFO[direction];
    const required = [info.files.model, info.files.shortlist, info.files.vocab, ...ENGINE_FILES];
    const matches = await Promise.all(required.map((url) => cache.match(url)));
    return matches.every(Boolean);
  } catch {
    return false;
  }
}

export async function getAllPackStatuses(): Promise<Record<TranslationDirection, boolean>> {
  const [enid, iden] = await Promise.all([
    isPackDownloaded('enid'),
    isPackDownloaded('iden'),
  ]);
  return { enid, iden };
}

async function fetchAndCacheWithProgress(
  cache: Cache,
  url: string,
  onChunk: (bytes: number) => void
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url} (HTTP ${res.status})`);
  }

  if (!res.body) {
    const buf = await res.arrayBuffer();
    onChunk(buf.byteLength);
    await cache.put(
      url,
      new Response(buf, {
        status: 200,
        headers: {
          'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream',
        },
      })
    );
    return;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
      onChunk(value.byteLength);
    }
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }

  await cache.put(
    url,
    new Response(merged, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream',
      },
    })
  );
}

export async function downloadPack(
  direction: TranslationDirection,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  const info = PACK_INFO[direction];
  const urls = [info.files.model, info.files.shortlist, info.files.vocab, ...ENGINE_FILES];

  // Check which files are missing
  const missing: string[] = [];
  for (const url of urls) {
    const existing = await cache.match(url);
    if (!existing) missing.push(url);
  }

  if (missing.length === 0) {
    onProgress?.({ percent: 100, receivedBytes: 1, totalBytes: 1, stage: 'caching' });
    return;
  }

  // Estimate total bytes using HEAD Content-Length (fallback to approxMB)
  let totalBytes = 0;
  await Promise.all(
    missing.map(async (url) => {
      try {
        const head = await fetch(url, { method: 'HEAD' });
        const len = Number(head.headers.get('Content-Length') || 0);
        if (len > 0) totalBytes += len;
      } catch {
        // Ignore HEAD failure
      }
    })
  );
  if (totalBytes === 0) {
    totalBytes = Math.round((info.approxMB + 5) * 1024 * 1024);
  }

  let receivedBytes = 0;
  onProgress?.({ percent: 0, receivedBytes: 0, totalBytes, stage: 'downloading' });

  for (const url of missing) {
    await fetchAndCacheWithProgress(cache, url, (chunkBytes) => {
      receivedBytes += chunkBytes;
      const percent = Math.min(99, Math.round((receivedBytes / Math.max(totalBytes, receivedBytes)) * 100));
      onProgress?.({
        percent,
        receivedBytes,
        totalBytes: Math.max(totalBytes, receivedBytes),
        stage: 'downloading',
      });
    });
  }

  onProgress?.({
    percent: 100,
    receivedBytes: Math.max(totalBytes, receivedBytes),
    totalBytes: Math.max(totalBytes, receivedBytes),
    stage: 'caching',
  });
}

// --- Web Worker RPC Client ---

class BergamotWorkerClient {
  private worker: Worker | null = null;
  private initPromise: Promise<void> | null = null;
  private nextId = 1;
  private pending = new Map<
    number,
    { resolve: (val: unknown) => void; reject: (err: Error) => void }
  >();
  private loadedDirections = new Set<TranslationDirection>();
  private loadingPromises = new Map<TranslationDirection, Promise<void>>();

  private call<T = unknown>(name: string, args: unknown[] = []): Promise<T> {
    if (!this.worker) {
      this.worker = new Worker('/bergamot/translator-worker.js');
      this.worker.onmessage = (event: MessageEvent<{ id: number; result?: unknown; error?: { message?: string } }>) => {
        const { id, result, error } = event.data;
        const entry = this.pending.get(id);
        if (!entry) return;
        this.pending.delete(id);
        if (error) {
          entry.reject(new Error(error.message || 'Translation worker error'));
        } else {
          entry.resolve(result);
        }
      };
      this.worker.onerror = (err) => {
        for (const entry of this.pending.values()) {
          entry.reject(new Error(err.message || 'Worker crashed'));
        }
        this.pending.clear();
      };
    }

    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (val: unknown) => void,
        reject,
      });
      this.worker!.postMessage({ id, name, args });
    });
  }

  async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.call('initialize', [
        { useNativeIntGemm: false, cacheSize: 16384 },
      ])
        .then(() => undefined)
        .catch((err) => {
          this.initPromise = null;
          throw err;
        });
    }
    await this.initPromise;
  }

  async ensureModelLoaded(direction: TranslationDirection): Promise<void> {
    if (this.loadedDirections.has(direction)) return;
    const inflight = this.loadingPromises.get(direction);
    if (inflight) return inflight;

    const promise = (async () => {
      await this.ensureInitialized();
      const info = PACK_INFO[direction];
      const [model, shortlist, vocab] = await Promise.all([
        readDecompressedAsset(info.files.model),
        readDecompressedAsset(info.files.shortlist),
        readDecompressedAsset(info.files.vocab),
      ]);

      await this.call('loadTranslationModel', [
        { from: info.from, to: info.to },
        {
          model,
          shortlist,
          vocabs: [vocab],
        },
      ]);
      this.loadedDirections.add(direction);
    })().finally(() => {
      this.loadingPromises.delete(direction);
    });

    this.loadingPromises.set(direction, promise);
    return promise;
  }

  async freeModel(direction: TranslationDirection): Promise<void> {
    if (!this.worker || !this.loadedDirections.has(direction)) return;
    const info = PACK_INFO[direction];
    try {
      await this.call('freeTranslationModel', [{ from: info.from, to: info.to }]);
    } catch {
      // Ignore if worker isn't ready
    }
    this.loadedDirections.delete(direction);
  }

  async translateBatch(
    direction: TranslationDirection,
    texts: Array<{ text: string; html: boolean }>
  ): Promise<string[]> {
    await this.ensureModelLoaded(direction);
    const info = PACK_INFO[direction];
    const responses = await this.call<Array<{ target: { text: string } }>>('translate', [
      {
        models: [{ from: info.from, to: info.to }],
        texts,
      },
    ]);
    return responses.map((r) => r.target.text);
  }
}

const workerClient = new BergamotWorkerClient();

async function readDecompressedAsset(url: string): Promise<ArrayBuffer> {
  const cache = await caches.open(CACHE_NAME);
  let res = await cache.match(url);
  if (!res) {
    res = await fetch(url);
    if (!res.ok) throw new Error(`Missing model file: ${url}`);
    await cache.put(url, res.clone());
  }

  const rawBuffer = await res.arrayBuffer();
  const bytes = new Uint8Array(rawBuffer);

  // Check gzip magic bytes (0x1f 0x8b). If already decompressed by CDN/browser, return as-is.
  const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (!isGzip) {
    return rawBuffer;
  }

  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser does not support DecompressionStream for offline models.');
  }

  const ds = new DecompressionStream('gzip');
  const decompressedStream = new Blob([rawBuffer]).stream().pipeThrough(ds);
  return new Response(decompressedStream).arrayBuffer();
}

export async function deletePack(direction: TranslationDirection): Promise<void> {
  const info = PACK_INFO[direction];
  await workerClient.freeModel(direction);
  if (typeof caches !== 'undefined') {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all([
      cache.delete(info.files.model),
      cache.delete(info.files.shortlist),
      cache.delete(info.files.vocab),
    ]);
  }
  await clearTranslationsForLanguage(info.to);
}

// --- Markdown-Preserving Block Translation ---

function inlineMarkdownToHtml(text: string): string {
  // Escape raw HTML special chars first
  let out = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Protect inline code spans
  const codeSpans: string[] = [];
  out = out.replace(/`([^`]+)`/g, (_m, code: string) => {
    const idx = codeSpans.length;
    codeSpans.push(code);
    return `<code>__CODE_${idx}__</code>`;
  });

  // Bold (**text**) then Italic (*text*)
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // Restore code content inside <code>
  out = out.replace(/<code>__CODE_(\d+)__<\/code>/g, (_m, idx: string) => {
    return `<code>${codeSpans[Number(idx)] ?? ''}</code>`;
  });

  return out;
}

function wrapInlineMarkdown(inner: string, marker: '**' | '*' | '`'): string {
  const leading = inner.match(/^\s*/)?.[0] ?? '';
  const trailing = inner.match(/\s*$/)?.[0] ?? '';
  const trimmed = inner.trim();

  // Never wrap empty strings or pure punctuation (e.g., ")", ".", ",")
  if (!trimmed || !/[\p{L}\p{N}]/u.test(trimmed)) {
    return inner;
  }

  // Strip any stray nested asterisks from inside the span to avoid broken Markdown
  const cleaned = marker === '`' ? trimmed : trimmed.replace(/\*+/g, '');
  if (!cleaned) return inner;

  return `${leading}${marker}${cleaned}${marker}${trailing}`;
}

function htmlBackToInlineMarkdown(html: string): string {
  let out = html
    // Normalize <b>/<i> to <strong>/<em>
    .replace(/<(\/?)b\b[^>]*>/gi, '<$1strong>')
    .replace(/<(\/?)i\b[^>]*>/gi, '<$1em>')
    // Remove empty inline tags produced by MT tag alignment (e.g. <em></em> -> "")
    .replace(/<(strong|em|code)>\s*<\/\1>/gi, '')
    // Merge adjacent identical tags separated only by whitespace
    .replace(/<\/strong>(\s*)<strong>/gi, '$1')
    .replace(/<\/em>(\s*)<em>/gi, '$1');

  // Convert tags to clean Markdown with whitespace hoisted outside markers
  out = out
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, (_m, inner: string) =>
      wrapInlineMarkdown(inner, '**')
    )
    .replace(/<em>([\s\S]*?)<\/em>/gi, (_m, inner: string) =>
      wrapInlineMarkdown(inner, '*')
    )
    .replace(/<code>([\s\S]*?)<\/code>/gi, (_m, inner: string) =>
      wrapInlineMarkdown(inner, '`')
    )
    // Strip any leftover unmatched HTML tags
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return out;
}

interface ParsedLine {
  prefix: string;
  body: string;
  translatable: boolean;
}

function parseMarkdownLines(markdown: string): ParsedLine[] {
  return markdown.split('\n').map((line) => {
    if (!line.trim() || /^---+$/.test(line.trim())) {
      return { prefix: line, body: '', translatable: false };
    }
    const match = line.match(/^(\s*(?:#{1,6}\s+|>\s+|[-*+]\s+|\d+\.\s+))(.*)$/);
    if (match) {
      return {
        prefix: match[1],
        body: match[2],
        translatable: match[2].trim().length > 0,
      };
    }
    return { prefix: '', body: line, translatable: true };
  });
}

export async function translateChapter(
  bookId: string,
  chapter: Chapter,
  sourceLang: BookLanguage,
  targetLang: BookLanguage
): Promise<{ title: string; contentMarkdown: string }> {
  // 1. Check IndexedDB cache first
  const cached = await getCachedChapterTranslation(bookId, targetLang, chapter.index);
  if (cached) {
    return {
      title: cached.title,
      contentMarkdown: cached.contentMarkdown,
    };
  }

  // 2. Parse Markdown into prefix-preserved lines and translate in one batch
  const direction: TranslationDirection = sourceLang === 'id' ? 'iden' : 'enid';
  const parsedLines = parseMarkdownLines(chapter.contentMarkdown);

  const batchInputs: Array<{ text: string; html: boolean }> = [
    { text: chapter.title, html: false },
  ];
  const lineIndexMap: number[] = [];

  parsedLines.forEach((line, idx) => {
    if (line.translatable) {
      lineIndexMap.push(idx);
      batchInputs.push({
        text: inlineMarkdownToHtml(line.body),
        html: true,
      });
    }
  });

  const translatedBatch = await workerClient.translateBatch(direction, batchInputs);
  const translatedTitle = translatedBatch[0] || chapter.title;

  const rebuiltLines = parsedLines.map((l) => `${l.prefix}${l.body}`);
  lineIndexMap.forEach((lineIdx, batchOffset) => {
    const rawTranslated = translatedBatch[batchOffset + 1] ?? parsedLines[lineIdx].body;
    rebuiltLines[lineIdx] = `${parsedLines[lineIdx].prefix}${htmlBackToInlineMarkdown(rawTranslated)}`;
  });

  const result = {
    title: translatedTitle,
    contentMarkdown: rebuiltLines.join('\n'),
  };

  // 3. Persist in IndexedDB for instant offline reuse
  await saveCachedChapterTranslation({
    bookId,
    targetLang,
    chapterIndex: chapter.index,
    title: result.title,
    contentMarkdown: result.contentMarkdown,
  });

  return result;
}

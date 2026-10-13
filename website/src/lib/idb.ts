/* تخزين قوائم القنوات/الأفلام/المسلسلات في IndexedDB —
   تفتح آلاف القنوات من الذاكرة في أجزاء من الثانية بدل إعادة تنزيلها في كل زيارة،
   مع زر «تحديث القنوات» يعيد الجلب ويحدّث النسخة المحفوظة.
   يعمل فقط في المتصفح؛ في بيئة بلا IndexedDB يعود null والمنطق ينتقل للجلب المباشر. */

import type { Category, Stream } from "./xtream.mjs";

export interface LibrarySnapshot {
  ts: number;
  categories?: Category[];
  streams?: Stream[];
  vodCategories?: Category[];
  vodStreams?: Stream[];
  seriesCategories?: Category[];
  seriesStreams?: Stream[];
}

const DB_NAME = "smp-xtream";
const STORE = "libraries";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/* سقف زمني صارم: أي عملية تخزين تعطّلة لا تؤخر تسجيل الدخول أبداً —
   نعود لجلب القوائم من السيرفر (نفس سلوك المواقع بلا IndexedDB). */
const OP_TIMEOUT_MS = 2000;

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const work = openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) {
          resolve(null);
          return;
        }
        let done = false;
        const finish = (value: T | null) => {
          if (done) return;
          done = true;
          resolve(value);
        };
        try {
          const tx = db.transaction(STORE, mode);
          const request = fn(tx.objectStore(STORE));
          request.onsuccess = () => finish((request.result ?? null) as T | null);
          request.onerror = () => finish(null);
          tx.onabort = () => finish(null);
          tx.oncomplete = () => db.close();
        } catch {
          finish(null);
        }
      }),
  );
  return Promise.race([
    work,
    new Promise<null>((resolve) => {
      const timer = setTimeout(() => resolve(null), OP_TIMEOUT_MS);
      /* لا نترك مؤقتاً يعيق إنهاء العملية لاحقاً */
      work.then(() => clearTimeout(timer)).catch(() => clearTimeout(timer));
    }),
  ]);
}

export async function loadLibrary(profile: string): Promise<LibrarySnapshot | null> {
  if (!profile) return null;
  const value = await run<LibrarySnapshot | undefined>("readonly", (store) => store.get(profile) as IDBRequest<LibrarySnapshot | undefined>);
  if (!value || typeof value !== "object" || !Number.isFinite(Number(value.ts))) return null;
  return value;
}

export async function saveLibrary(profile: string, snapshot: LibrarySnapshot): Promise<boolean> {
  if (!profile || !snapshot) return false;
  const result = await run<IDBValidKey>("readwrite", (store) => store.put(snapshot, profile));
  return result !== null;
}

export async function clearLibrary(profile: string): Promise<boolean> {
  if (!profile) return false;
  const result = await run<undefined>("readwrite", (store) => store.delete(profile) as IDBRequest<undefined>);
  return result !== null;
}

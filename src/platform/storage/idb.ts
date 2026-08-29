/**
 * IndexedDB の keyval ラッパ。docs/adr/0004-storage.md#決定。
 *
 * 旧アプリ (`legacy/v1` の `lib/idb.ts`) と同じ最小限の形だが、
 * データベース名・ストア名を引数にして任意の DB を開けるようにしている。
 * これにより本アプリの DB (`keyboard-layouter` / `keyval`) と、
 * 旧アプリの DB (`mkd-db` / `keyval`。`legacyImport.ts` が読む) の
 * 両方をこのラッパ 1 つで扱える。
 */
import type { StorageBackend } from './backend';

/** 本アプリの IndexedDB データベース名。旧アプリの `mkd-db` とは分ける。 */
export const APP_DB_NAME = 'keyboard-layouter';
export const KEYVAL_STORE_NAME = 'keyval';

function openDb(dbName: string, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 指定した DB / ストアに対する `StorageBackend`。
 * `indexedDB` が存在しない環境 (一部のプライベートブラウジング等) では
 * `get` は常に `undefined`、`set` / `del` は何もしない (呼び出し側が
 * `localStorage` へフォールバックする)。
 */
export function createIndexedDBBackend(dbName: string, storeName: string = KEYVAL_STORE_NAME): StorageBackend {
  const available = typeof indexedDB !== 'undefined';

  return {
    get: async <T>(key: string): Promise<T | undefined> => {
      if (!available) return undefined;
      try {
        const db = await openDb(dbName, storeName);
        return await new Promise<T | undefined>((resolve, reject) => {
          const tx = db.transaction(storeName, 'readonly');
          const req = tx.objectStore(storeName).get(key);
          req.onsuccess = () => resolve(req.result as T | undefined);
          req.onerror = () => reject(req.error as Error);
        });
      } catch {
        return undefined;
      }
    },
    set: async (key: string, value: unknown): Promise<void> => {
      if (!available) throw new Error('indexedDB is not available');
      const db = await openDb(dbName, storeName);
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error as Error);
      });
    },
    del: async (key: string): Promise<void> => {
      if (!available) return;
      const db = await openDb(dbName, storeName);
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error as Error);
      });
    },
  };
}

/** 本アプリの主ストレージ。 */
export function createAppIndexedDBBackend(): StorageBackend {
  return createIndexedDBBackend(APP_DB_NAME, KEYVAL_STORE_NAME);
}

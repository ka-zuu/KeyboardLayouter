// lib/idb.ts
const DB_NAME = 'mkd-db';
const STORE_NAME = 'keyval';

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
       const db = (e.target as IDBOpenDBRequest).result;
       if (!db.objectStoreNames.contains(STORE_NAME)) {
         db.createObjectStore(STORE_NAME);
       }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const get = async <T>(key: string): Promise<T | undefined> => {
  if (typeof indexedDB === 'undefined') return undefined;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('IDB get error:', e);
    return undefined;
  }
};

export const set = async (key: string, val: any): Promise<void> => {
   if (typeof indexedDB === 'undefined') return;
   const db = await getDB();
   return new Promise((resolve, reject) => {
     const tx = db.transaction(STORE_NAME, 'readwrite');
     const store = tx.objectStore(STORE_NAME);
     const req = store.put(val, key);
     req.onsuccess = () => resolve();
     req.onerror = () => reject(req.error);
   });
};

export const del = async (key: string): Promise<void> => {
   if (typeof indexedDB === 'undefined') return;
   const db = await getDB();
   return new Promise((resolve, reject) => {
     const tx = db.transaction(STORE_NAME, 'readwrite');
     const store = tx.objectStore(STORE_NAME);
     const req = store.delete(key);
     req.onsuccess = () => resolve();
     req.onerror = () => reject(req.error);
   });
};

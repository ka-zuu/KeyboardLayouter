import { PersistStorage, StorageValue } from 'zustand/middleware';
import * as idb from '@/lib/idb';
import type { EditorState } from '@/store/useStore';

const storageDebounceTimer: Record<string, ReturnType<typeof setTimeout>> = {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pendingStorage: Record<string, any> = {};

// Custom storage that debounces serialization and writes to IndexedDB
// This prevents blocking the main thread during rapid updates (e.g. dragging)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const customStorage: PersistStorage<any> = {
  getItem: async (name) => {
    // Try IDB first
    const fromIDB = await idb.get<StorageValue<EditorState>>(name);
    if (fromIDB) return fromIDB;

    // Fallback/Migration from LocalStorage
    if (typeof localStorage !== 'undefined') {
       const fromLocal = localStorage.getItem(name);
       if (fromLocal) {
          try {
             const parsed = JSON.parse(fromLocal);
             // Migrate to IDB asynchronously
             idb.set(name, parsed).then(() => {
                 localStorage.removeItem(name);
             }).catch(console.error);
             return parsed;
          } catch (e) { console.error(e); }
       }
    }
    return null;
  },
  setItem: (name, value) => {
      pendingStorage[name] = value;
      if (storageDebounceTimer[name]) clearTimeout(storageDebounceTimer[name]);

      storageDebounceTimer[name] = setTimeout(() => {
          const val = pendingStorage[name];
          // Try IDB
          idb.set(name, val).catch(err => {
             console.error('IDB set error, falling back to localStorage', err);
             if (typeof localStorage !== 'undefined') {
                 localStorage.setItem(name, JSON.stringify(val));
             }
          });
          delete storageDebounceTimer[name];
      }, 1000);
  },
  removeItem: (name) => {
     if (storageDebounceTimer[name]) clearTimeout(storageDebounceTimer[name]);
     delete pendingStorage[name];
     idb.del(name).then(() => {
         if (typeof localStorage !== 'undefined') localStorage.removeItem(name);
     });
  }
};

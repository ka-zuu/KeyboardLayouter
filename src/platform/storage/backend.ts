/**
 * キー・値ストレージの抽象。docs/adr/0004-storage.md#決定 の
 * 「薄いラッパを書けば済む」に沿い、実装を 3 通り用意する。
 *
 * `appStorage.ts` はこのインタフェースだけに依存するため、ユニットテストは
 * `createInMemoryStorageBackend` で完結し、jsdom / fake-indexeddb を
 * 必要としない (`core/model/deps.ts` と同じ「依存を注入する」パターン)。
 */
export interface StorageBackend {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
}

/** テスト用のインメモリ実装。 */
export function createInMemoryStorageBackend(): StorageBackend {
  const store = new Map<string, unknown>();
  return {
    get: <T>(key: string) => Promise.resolve(store.get(key) as T | undefined),
    set: (key: string, value: unknown) => {
      store.set(key, value);
      return Promise.resolve();
    },
    del: (key: string) => {
      store.delete(key);
      return Promise.resolve();
    },
  };
}

/**
 * `localStorage` ベースの実装。容量上限 (概ね 5MB) があるため
 * `appStorage` からはフォールバックとしてのみ使う (docs/adr/0004-storage.md)。
 */
export function createLocalStorageBackend(storage: Storage = globalThis.localStorage): StorageBackend {
  return {
    get: <T>(key: string) => {
      const raw = storage.getItem(key);
      if (raw === null) return Promise.resolve(undefined);
      try {
        return Promise.resolve(JSON.parse(raw) as T);
      } catch {
        return Promise.resolve(undefined);
      }
    },
    set: (key: string, value: unknown) => {
      storage.setItem(key, JSON.stringify(value));
      return Promise.resolve();
    },
    del: (key: string) => {
      storage.removeItem(key);
      return Promise.resolve();
    },
  };
}

IndexedDB アダプタと localStorage フォールバック。core/io からは参照しない。

| ファイル | 内容 |
|---|---|
| `backend.ts` | `StorageBackend` インタフェースと、インメモリ / localStorage 実装 |
| `idb.ts` | IndexedDB の keyval ラッパ (`createIndexedDBBackend`)。DB 名・ストア名を引数にでき、本アプリの DB と旧アプリの DB (`legacyImport.ts`) の両方をこれ 1 つで扱う |
| `appStorage.ts` | `projects` / `currentProjectId` / `editorPrefs` の 3 キー。1000ms デバウンスし、primary (IndexedDB) が失敗したら fallback (localStorage) へ書く (`docs/adr/0004-storage.md`) |
| `appStorageSingleton.ts` | アプリ全体で共有する `AppStorage` の 1 インスタンスと、永続化する「既知のプロジェクト一覧」キャッシュ |
| `legacyImport.ts` | 旧アプリ (MKD) がブラウザに残したデータ (`mkd-db` / `mkd-storage`) の探索と移行。取り込んでも旧データは削除しない (`docs/MIGRATION_FROM_MKD.md`) |

`appStorage.ts` は `StorageBackend` を引数で受け取るため、テストはインメモリ実装で完結する
(`core/model/deps.ts` と同じ「依存を注入する」パターン)。

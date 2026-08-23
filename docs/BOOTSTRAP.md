# リポジトリの立ち上げ手順

M0 ([ROADMAP.md](ROADMAP.md#m0-リポジトリの足場)) の作業内容です。

## 1. リポジトリとドキュメント

1. GitHub で新しいリポジトリを作る (公開 / 非公開はどちらでもよい)。
2. このドキュメント一式 (`docs/v2/` の中身) をリポジトリのルートに配置する。
   `README.md` / `AGENTS.md` / `CONTRIBUTING.md` / `docs/` がルート直下に来る形。
3. `docs/README.md` の[名称の差し替え](README.md#名称の差し替え)に従い、
   製品名を確定させる (後からでもよい)。
4. ライセンスを決めて `LICENSE` を置く。

## 2. Vite プロジェクトの作成

```bash
npm create vite@latest . -- --template react-ts
npm install
```

`package.json` を次の形に整えます。

```jsonc
{
  "name": "<リポジトリ名>",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:perf": "vitest run --dir tests/perf",
    "test:e2e": "playwright test"
  }
}
```

## 3. TypeScript

`tsconfig.json` で以下を有効にします。緩めると後から締めるのが難しくなるので、
最初から厳しくしておきます。

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

`noUncheckedIndexedAccess` は配列アクセスが `T | undefined` になるため書き味が
落ちますが、キー配列を大量に扱うこのアプリでは有効にする価値があります。

## 4. ディレクトリ

[ARCHITECTURE.md](ARCHITECTURE.md#ディレクトリ構成) の構成で空ディレクトリを作り、
各ディレクトリに 1 行の `README.md` か index ファイルを置いて意図を明示します。

## 5. ESLint

レイヤ間の依存を機械的に守らせます。これが後から一番効きます。

```js
// eslint.config.mjs (抜粋)
export default [
  // core / io にブラウザ API を持ち込まない
  {
    files: ['src/core/**', 'src/io/**'],
    languageOptions: { globals: {} }, // ブラウザのグローバルを定義しない
    rules: {
      'no-restricted-globals': [
        'error',
        'window', 'document', 'localStorage', 'indexedDB', 'navigator', 'alert',
      ],
      'no-restricted-imports': [
        'error',
        { patterns: ['@/ui/*', '@/state/*', '@/platform/*'] },
      ],
    },
  },
  // io は core にのみ依存する
  {
    files: ['src/io/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['@/ui/*', '@/state/*', '@/platform/*'] },
      ],
    },
  },
];
```

`crypto.randomUUID` は Node にもあるため `core` で使えますが、
テストで固定したい箇所では引数で受け取る形にします
([TESTING.md](TESTING.md#ゴールデンファイル方式))。

## 6. テスト環境

```bash
npm i -D vitest @vitest/coverage-v8 jsdom \
         @testing-library/react @testing-library/dom @testing-library/jest-dom \
         @playwright/test
npx playwright install --with-deps chromium
```

`vitest.config.ts` では 2 つのプロジェクトを定義します。

| プロジェクト | 環境 | 対象 |
|---|---|---|
| `unit` | `node` | `tests/unit/**` (ただし `tests/unit/ui/**` を除く) |
| `ui` | `jsdom` | `tests/unit/ui/**` |

`core` と `io` を Node 環境で回すことで、テストの起動が速くなります。

## 7. CI

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - run: npm run build
```

## 8. Vercel へのデプロイ

v1 から引き続き Vercel で配信します。**配信先を変えないことが重要**です。
ブラウザ内のデータ (IndexedDB) はオリジン単位で保存されるため、URL のホストが変わると
v1 が保存したユーザーのプロジェクトを引き継げなくなります
([MIGRATION_FROM_MKD.md](MIGRATION_FROM_MKD.md#ブラウザに残ったデータの取り込み))。

Vercel は GitHub と連携していれば push で自動的にビルド・デプロイします。
デプロイ用の GitHub Actions ワークフローは不要です。

### `vercel.json`

Vercel の Framework Preset の自動判別に任せず、明示します
(このリポジトリの Vercel プロジェクトは v1 時代に Next.js として作られているため)。

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

`rewrites` は、将来クライアントルーティングを入れたときに直接 URL を叩いても
`index.html` が返るようにするためのものです。単一ページのうちは無くても動きます。

### `vite.config.ts`

ドメインのルートで配信するため `base` の設定は不要です。

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

### Vercel 側の設定 (ダッシュボードでの手作業)

| 設定 | 値 |
|---|---|
| Settings → General → Framework Preset | Vite (または Other)。**Next.js のままだとビルドが失敗します** |
| Settings → General → Build Command / Output Directory | `vercel.json` の値が使われるので変更不要 |
| Settings → Git → Production Branch | 本番として配信したいブランチ |

**Production Branch の使い方**: 作り直しの途中は、本番 (`keyboard-layouter.vercel.app`) を
v1 のまま動かしておきたいので、Production Branch を `legacy/v1` に向けます。
main (v2) は Preview デプロイで確認し、機能等価 (M2) に到達した時点で
Production Branch を `main` に戻して本番を切り替えます
([ROADMAP.md](ROADMAP.md#m2-ui-とキャンバス編集-機能等価))。

### 注意点

- **Preview デプロイは本番と別オリジン**です (`<project>-<hash>.vercel.app`)。
  そのため Preview では本番の IndexedDB が見えず、旧データの自動移行も確認できません。
  データ移行の検証は本番切り替え後に行います。
- **アセットは `import` して Vite に解決させる。** `/images/foo.png` のような
  絶対パスの直書きは避けます (配信先を変えたときに壊れるため)。
- ビルド成果物は `dist/` の静的ファイルのみです。サーバー側の処理はありません。

## 9. 最初のコミット

```bash
git add -A
git commit -m "chore: リポジトリの足場を作成"
git branch -M main
git remote add origin git@github.com:<user>/<repo>.git
git push -u origin main
```

CI が緑になり、Vercel の Preview デプロイに画面が出ることを確認したら M0 完了です。

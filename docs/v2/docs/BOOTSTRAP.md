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

## 8. GitHub Pages へのデプロイ

GitHub Pages はリポジトリ名のサブパスで配信されるため、`base` の設定が必要です。

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 例: https://<user>.github.io/<repo>/ で配信する場合
  base: process.env.GITHUB_ACTIONS ? '/<リポジトリ名>/' : '/',
});
```

`.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: ["main"]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
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
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
    steps:
      - uses: actions/deploy-pages@v4
```

リポジトリの Settings → Pages で **Source を "GitHub Actions"** に設定します。

### 注意点

- **アセットの参照は相対にする。** `base` を設定しても、コード内で
  `/images/foo.png` のような絶対パスを書くとサブパス配信で 404 になります。
  `import` して Vite に解決させてください。
- **ルーティングは使わない。** 単一ページなので `404.html` の細工は不要です。
  将来ルーティングを入れる場合は、Pages が SPA フォールバックを持たないため
  `dist/404.html` に `index.html` をコピーする対応が必要になります。
- **`dist/.nojekyll`** を出力に含めます (`_` で始まるファイルが無視されるのを防ぐため)。
  `public/.nojekyll` を空ファイルで置いておけば自動的にコピーされます。

## 9. 最初のコミット

```bash
git add -A
git commit -m "chore: リポジトリの足場を作成"
git branch -M main
git remote add origin git@github.com:<user>/<repo>.git
git push -u origin main
```

CI が緑になり、Pages に画面が出ることを確認したら M0 完了です。

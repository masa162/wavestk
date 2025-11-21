# Cloudflare Pages Dashboard ビルド設定

## ビルド設定の変更が必要です

Cloudflare Dashboard → Workers & Pages → wavestk → Settings → Build

以下のように設定してください：

### Build command
```
npm install
```

### Build output directory
```
public
```

### Root directory
```
/
```
（デフォルトのまま、空欄でOK）

## 設定後の対応

1. 上記の設定を保存
2. 「Retry deployment」または新しいコミットでビルドを再実行

これで Pages Functions のビルド時に `npm install` が実行され、Hono モジュールが解決されます。

## 補足

Pages Functions（`functions/`ディレクトリ内のコード）は、ビルド時に依存関係を解決する必要があります。
ダッシュボードの「Build command」に `npm install` を設定することで、`node_modules` がインストールされます。

## 現在の設定確認

ダッシュボードで以下が設定されていることも確認してください：

**Variables and Secrets (Production)**:
- `BASIC_AUTH_USER`: `<YOUR_USERNAME>`
- `BASIC_AUTH_PASS`: `<YOUR_PASSWORD>`

**Bindings (Production)**:
- D1 database: `DB` → `wavestk-db`
- R2 bucket: `R2_BUCKET` → `wavestk-audio`

**Compatibility date**:
- `Nov 21, 2025`（または `2024-11-21`）

すべて設定済みのようですので、ビルドコマンドを追加すれば動作するはずです！

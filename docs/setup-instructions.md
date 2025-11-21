# wavestk セットアップ手順（ダッシュボード作業）

## 完了済み

✅ GitHubリポジトリ作成: https://github.com/masa162/wavestk
✅ コード実装完了（全Phase完了）
✅ R2バケット作成: `wavestk-audio`
✅ D1データベース作成: `wavestk-db` (ID: `<YOUR_DATABASE_ID>`)
✅ D1マイグレーション実行
✅ CDN Worker デプロイ完了: https://wavestk-worker.belong2jazz.workers.dev
✅ GitHubへプッシュ完了

## ダッシュボードで実施が必要な作業

### 1. Pages プロジェクトとGitHub連携

Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git

1. **GitHubリポジトリ接続**
   - リポジトリ選択: `masa162/wavestk`
   - Production branch: `main`

2. **ビルド設定**
   - Framework preset: `None`
   - Build command: （空欄）
   - Build output directory: `public`
   - Root directory: `/`

3. **プロジェクト名**
   - Project name: `wavestk-pages`

### 2. 環境変数の設定

Pages プロジェクト → Settings → Environment variables → Production

**Plain text 変数**:
| Variable | Value |
|----------|-------|
| `BASIC_AUTH_USER` | `<YOUR_USERNAME>` |
| `BASIC_AUTH_PASS` | `<YOUR_PASSWORD>` |

### 3. バインディング設定

Pages プロジェクト → Settings → Functions → Bindings

**R2 Bucket Binding**:
- Variable name: `R2_BUCKET`
- R2 bucket: `wavestk-audio`

**D1 Database Binding**:
- Variable name: `DB`
- D1 database: `wavestk-db`

### 4. カスタムドメイン設定（オプション）

#### CDN Worker用ドメイン（推奨）

Workers & Pages → wavestk-worker → Settings → Triggers → Custom Domains

- ドメイン: `wave.be2nd.com`
- 自動DNS設定（Cloudflareドメインの場合）

#### Pages管理画面用ドメイン（オプション）

Workers & Pages → wavestk-pages → Custom domains

- ドメイン: `admin-wave.be2nd.com`

### 5. デプロイ確認

GitHub連携後、自動デプロイが実行されます。

**確認URL**:
- Pages（管理画面）: https://wavestk-pages.pages.dev/
- Worker（CDN）: https://wavestk-worker.belong2jazz.workers.dev/healthz

**Basic認証情報**:
- ユーザー名: `<YOUR_USERNAME>`
- パスワード: `<YOUR_PASSWORD>`

### 6. 動作テスト

1. 管理画面にアクセス: https://wavestk-pages.pages.dev/
2. Basic認証でログイン
3. テスト用の音声ファイル（MP3等、小さいファイル）をアップロード
4. 発行されたURLにアクセスして音声が再生されることを確認
5. Library画面で一覧表示、検索、削除機能を確認

### 7. カスタムドメイン設定後の対応（オプション）

`wave.be2nd.com` を設定した場合、コード内のURLを更新して再デプロイ：

**functions/api/[[path]].ts の93行目を修正**:
```typescript
const url = `https://wave.be2nd.com/${filename}`;
```

GitHubにプッシュすれば自動デプロイされます。

## トラブルシューティング

### 401 Unauthorized

- 環境変数 `BASIC_AUTH_USER` と `BASIC_AUTH_PASS` が設定されているか確認
- ブラウザキャッシュをクリア

### R2_BUCKET is not defined

- R2バケットバインディングが正しく設定されているか確認
- バインディング名が `R2_BUCKET` であることを確認
- バケット名が `wavestk-audio` であることを確認

### DB is not defined

- D1データベースバインディングが正しく設定されているか確認
- バインディング名が `DB` であることを確認
- データベースIDが `<YOUR_DATABASE_ID>` であることを確認

### アップロード後に音声が見つからない（404）

- Workerが正しくデプロイされているか確認
- R2バケットにファイルが保存されているか確認（Dashboard → R2 → wavestk-audio）

## 完了チェックリスト

- [ ] Pages プロジェクト作成・GitHub連携
- [ ] 環境変数設定（BASIC_AUTH_USER, BASIC_AUTH_PASS）
- [ ] R2バケットバインディング設定
- [ ] D1データベースバインディング設定
- [ ] 自動デプロイ成功確認
- [ ] 管理画面アクセス確認
- [ ] Basic認証動作確認
- [ ] 音声アップロード動作確認
- [ ] CDN配信動作確認（音声再生）
- [ ] Library画面動作確認
- [ ] 削除機能動作確認
- [ ] カスタムドメイン設定（オプション）

## 参考情報

- GitHubリポジトリ: https://github.com/masa162/wavestk
- CDN Worker: https://wavestk-worker.belong2jazz.workers.dev
- Pages（デプロイ後）: https://wavestk-pages.pages.dev
- 詳細なデプロイ手順: [DEPLOYMENT.md](../DEPLOYMENT.md)
- 要件定義書: [requirements.md](requirements.md)

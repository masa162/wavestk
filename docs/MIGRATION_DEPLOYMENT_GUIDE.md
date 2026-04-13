# ドメイン移管デプロイ手順書

## 概要

`wave.be2nd.com` から `wave.masa86.com` へのドメイン移管を実施します。

**実施日**: 2026年4月13日

## 前提条件

- Cloudflare アカウントにログイン済み
- `masa86.com` ドメインが Cloudflare DNS で管理されている
- Wrangler CLI がインストールされている
- wavestk プロジェクトのソースコードが最新

## 作業手順

### Step 1: コード変更の確認

移管対応のコード変更が完了していることを確認:

```bash
cd d:\github\wavestk
git status
```

**変更されるべきファイル**:
- `functions/types.ts` - CDN_DOMAIN 型定義追加
- `functions/api/[[path]].ts` - 環境変数化対応
- `worker/wrangler.toml` - コメント更新
- `wrangler.toml` - 環境変数設定追加
- `README.md` - ドメイン更新
- `DEPLOYMENT.md` - 手順更新
- `redirect-worker/` - 新規追加

### Step 2: Pages の環境変数設定

Cloudflare Dashboard で環境変数を追加:

1. https://dash.cloudflare.com/ にアクセス
2. **Workers & Pages** → **wavestk-pages** を選択
3. **Settings** タブ → **Environment variables** を選択
4. **Production** タブで **Add variable** をクリック
5. 以下を入力:
   - Variable name: `CDN_DOMAIN`
   - Value: `https://wave.masa86.com`
   - Type: Plain text
6. **Save** をクリック

### Step 3: Pages の再デプロイ

環境変数を反映させるため、Pages を再デプロイ:

```bash
cd d:\github\wavestk
npx wrangler pages deploy public --project-name=wavestk-pages
```

**確認**: デプロイが成功したことを確認

### Step 4: Worker のカスタムドメイン設定

CDN Worker に新ドメインを設定:

1. Cloudflare Dashboard → **Workers & Pages** → **wavestk-worker**
2. **Settings** タブ → **Triggers** セクション
3. **Custom Domains** で **Add Custom Domain** をクリック
4. `wave.masa86.com` を入力
5. **Add Custom Domain** をクリック
6. DNS が自動設定されるのを待つ（通常数分）

**確認**: `wave.masa86.com` がアクティブになったことを確認

### Step 5: Pages のカスタムドメイン設定（オプション）

管理画面用のドメインを設定する場合:

1. Cloudflare Dashboard → **Workers & Pages** → **wavestk-pages**
2. **Custom domains** タブ
3. **Set up a custom domain** をクリック
4. `admin-wave.masa86.com` を入力
5. DNS設定を確認・承認

### Step 6: Redirect Worker のデプロイ

旧ドメインから新ドメインへのリダイレクトを設定:

```bash
cd d:\github\wavestk\redirect-worker
npx wrangler deploy
```

**確認**: Worker が正常にデプロイされたことを確認

### Step 7: Redirect Worker のカスタムドメイン設定

旧ドメインをリダイレクトWorkerに設定:

1. Cloudflare Dashboard → **Workers & Pages** → **wavestk-redirect**
2. **Settings** タブ → **Triggers** セクション
3. **Custom Domains** で **Add Custom Domain** をクリック
4. `wave.be2nd.com` を入力
5. **Add Custom Domain** をクリック

**重要**: この設定により、既存の `wavestk-worker` から `wave.be2nd.com` が外れ、`wavestk-redirect` に紐付きます。

### Step 8: 動作確認

#### 8.1 新ドメインでのアップロードテスト

1. 管理画面にアクセス:
   - Pages URL: `https://wavestk-pages.pages.dev/`
   - または: `https://admin-wave.masa86.com/`

2. テスト音声ファイルをアップロード（小さいMP3ファイル推奨）

3. 生成されたURLを確認:
   ```
   https://wave.masa86.com/xxxxxxxx.mp3
   ```

4. URLにアクセスして音声が再生されることを確認

#### 8.2 リダイレクトテスト

既存の音声ファイルがある場合:

```bash
curl -I https://wave.be2nd.com/{filename}.mp3
```

**期待結果**:
```
HTTP/2 301
location: https://wave.masa86.com/{filename}.mp3
```

ブラウザでアクセスして、自動的に新ドメインにリダイレクトされることを確認

#### 8.3 Range Request テスト

ブラウザで音声ファイルを再生し、シーク（早送り・巻き戻し）が正常に動作することを確認

### Step 9: データベース確認

新規アップロードしたファイルのURLが正しいことを確認:

```bash
npx wrangler d1 execute wavestk-db --remote --command="SELECT id, filename, url FROM audio_files ORDER BY uploaded_at DESC LIMIT 5"
```

**確認ポイント**: `url` カラムが `https://wave.masa86.com/...` になっていること

## トラブルシューティング

### 問題: 環境変数が反映されない

**原因**: Pages の環境変数設定後、再デプロイが必要

**解決策**:
```bash
npx wrangler pages deploy public --project-name=wavestk-pages
```

### 問題: 新規アップロードしたファイルのURLが旧ドメイン

**原因**: 環境変数 `CDN_DOMAIN` が未設定

**解決策**: Step 2 を再度実施し、環境変数を確認

### 問題: リダイレクトが動作しない

**原因**: `wave.be2nd.com` のカスタムドメインが `wavestk-redirect` に設定されていない

**解決策**: Step 7 を再度実施

### 問題: DNS エラー

**原因**: ドメインの DNS 設定が正しくない

**解決策**: Cloudflare DNS 設定を確認:
- `wave.masa86.com` → CNAME → `wavestk-worker.{subdomain}.workers.dev`
- `wave.be2nd.com` → CNAME → `wavestk-redirect.{subdomain}.workers.dev`

## ロールバック手順

万が一、問題が発生した場合:

### 新ドメインを無効化

1. Cloudflare Dashboard → **Workers & Pages** → **wavestk-worker**
2. **Settings** → **Triggers** → **Custom Domains**
3. `wave.masa86.com` を削除

### 旧ドメインを復元

1. Cloudflare Dashboard → **Workers & Pages** → **wavestk-redirect**
2. **Settings** → **Triggers** → **Custom Domains**
3. `wave.be2nd.com` を削除

4. Cloudflare Dashboard → **Workers & Pages** → **wavestk-worker**
5. **Settings** → **Triggers** → **Custom Domains**
6. `wave.be2nd.com` を追加

### 環境変数を戻す

1. Cloudflare Dashboard → **Workers & Pages** → **wavestk-pages**
2. **Settings** → **Environment variables**
3. `CDN_DOMAIN` を `https://wave.be2nd.com` に変更
4. Pages を再デプロイ

## 作業後チェックリスト

- [ ] 新ドメイン `wave.masa86.com` でアップロードが可能
- [ ] 新規アップロードファイルのURLが `https://wave.masa86.com/...` になっている
- [ ] 旧ドメイン `wave.be2nd.com` からのリダイレクトが動作
- [ ] 音声ファイルの再生（シーク含む）が正常に動作
- [ ] 管理画面（一覧・削除）が正常に動作
- [ ] データベースに正しいURLが保存されている
- [ ] リダイレクトWorkerが正常に動作

## 今後の対応

### 6ヶ月後（2026年10月）

リダイレクトの継続確認:
- アクセスログを確認
- 旧ドメインへのアクセスが減少していることを確認
- 必要に応じてリダイレクト期間を延長

### 1年後（2027年4月）

リダイレクト終了の検討:
- 旧ドメインへのアクセスがほぼゼロであることを確認
- `wavestk-redirect` Workerを削除
- `wave.be2nd.com` のカスタムドメイン設定を削除
- `be2nd.com` ドメインの更新を停止（廃棄）

## 関連ドキュメント

- [DOMAIN_MIGRATION.md](DOMAIN_MIGRATION.md) - 移管概要
- [../DEPLOYMENT.md](../DEPLOYMENT.md) - 通常のデプロイ手順
- [../redirect-worker/README.md](../redirect-worker/README.md) - リダイレクトWorker詳細
- [../README.md](../README.md) - プロジェクト概要

## 作業記録

**実施日**: 2026年4月13日
**実施者**:
**作業時間**:
**問題点**:
**備考**:

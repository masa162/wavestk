# ドメイン移管について

## 移管概要

**実施日**: 2026年4月13日

**変更内容**:
```
旧ドメイン: wave.be2nd.com
    ↓
新ドメイン: wave.masa86.com
```

## 理由

1. **ドメイン統合**: `be2nd.com` を廃棄し、`masa86.com` に統一
2. **ブランド統一**: 個人ブランド `masa86` への集約
3. **管理効率化**: ドメイン数の削減によるコスト・管理負担の軽減

## 移行戦略

### 1. リダイレクト設定

`wave.be2nd.com` → `wave.masa86.com` への301リダイレクトを設定

**実装**: `redirect-worker/` ディレクトリ参照

**期間**: 最低6〜12ヶ月間維持

### 2. 環境変数化

ドメインをハードコードから環境変数 `CDN_DOMAIN` に変更

**メリット**:
- 将来的なドメイン変更が容易
- 開発環境・本番環境の切り替えが簡単
- コード変更なしでドメイン変更可能

### 3. デプロイ手順

詳細は [DEPLOYMENT.md](../DEPLOYMENT.md) を参照

**概要**:
1. Worker を `wave.masa86.com` にデプロイ
2. Pages の環境変数 `CDN_DOMAIN=https://wave.masa86.com` を設定
3. Redirect Worker を `wave.be2nd.com` にデプロイ

## 既存URLの互換性

### リダイレクト動作

```
https://wave.be2nd.com/jfgpumc7.m4a
  → 301 Permanent Redirect →
https://wave.masa86.com/jfgpumc7.m4a
```

### 影響範囲

- ブログ記事に埋め込まれた音声URL
- ブックマーク
- 検索エンジンのインデックス
- 外部リンク

**対策**: 301リダイレクトにより、すべて自動的に新URLに転送される

## 旧ドキュメントについて

`docs/` ディレクトリ内の以下のドキュメントには旧ドメイン (`wave.be2nd.com`) の記載が残っていますが、歴史的記録として保持しています:

- `requirements.md` - 初期要件定義書
- `setup-instructions.md` - 初期セットアップ手順
- `deployment-success.md` - 初回デプロイ記録
- `final-checklist.md` - 初回リリースチェックリスト

**最新情報**: 本リポジトリの `README.md` および `DEPLOYMENT.md` を参照してください

## タイムライン

| 日付 | アクション |
|------|----------|
| 2026-04-13 | ドメイン移管実施、リダイレクト設定開始 |
| 2026-10-13 (6ヶ月後) | リダイレクト継続確認、必要に応じて延長 |
| 2027-04-13 (1年後) | リダイレクト終了検討、be2nd.com ドメイン廃棄 |

## 関連ファイル

- [README.md](../README.md) - 最新のプロジェクト概要
- [DEPLOYMENT.md](../DEPLOYMENT.md) - 最新のデプロイ手順
- [redirect-worker/README.md](../redirect-worker/README.md) - リダイレクトWorkerの詳細
- [functions/types.ts](../functions/types.ts) - CDN_DOMAIN環境変数の型定義
- [functions/api/[[path]].ts](../functions/api/[[path]].ts) - 環境変数を使用したURL生成

## 注意事項

1. **環境変数の設定を忘れない**: `CDN_DOMAIN` が未設定の場合、デフォルトで `https://wave.masa86.com` が使用されます
2. **リダイレクトWorkerは削除しない**: 最低6ヶ月間は維持してください
3. **旧ドメインへのアップロード**: 新規アップロードは必ず新ドメイン (`wave.masa86.com`) のシステムを使用してください

## トラブルシューティング

### Q: 環境変数が反映されない

A: Cloudflare Dashboard で環境変数を設定後、Pagesを再デプロイしてください

### Q: リダイレクトが動作しない

A: `wave.be2nd.com` のカスタムドメインが `wavestk-redirect` Workerに正しく設定されているか確認してください

### Q: 既存の音声ファイルはどうなる?

A: R2バケット内のファイルはそのまま保持されます。ファイルパスは変更されないため、新ドメインでも同じファイル名でアクセス可能です

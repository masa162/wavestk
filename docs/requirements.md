# wavestk 要件定義書

**プロジェクト名**: wavestk
**バージョン**: 1.0.0
**作成日**: 2025-11-21
**最終更新**: 2025-11-21

---

## 1. プロジェクト概要

### 1.1 目的
雑記ブログや各種Webサイトで手軽に音声ファイルを埋め込めるユニバーサル音声CDNを構築する。

### 1.2 背景
- 現在、画像CDN（imgbase/imgstk）を活用してブログ記事に画像を配信している
- 音声メディアも同様にシンプルなURL形式で埋め込めるようにしたい
- 既存の特化型プロジェクト（clasicjlit、kampo、isk）とは別に、汎用的な音声置き場が必要

### 1.3 成功基準
- Markdownで `![](URL)` 形式のシンプルなURL埋め込みが可能
- 管理画面からのアップロード・削除が容易
- 音声プレーヤーでシーク（早送り・巻き戻し）が正常に動作
- 月額コスト$5以下で運用可能
- シンプル・高速・安定を重視

---

## 2. 技術要件

### 2.1 技術スタック

| レイヤー | 技術 | 備考 |
|---------|------|------|
| **配信CDN** | Cloudflare Workers | 音声ファイル配信専用 |
| **管理画面** | Cloudflare Pages | 静的HTML + JavaScript |
| **API** | Cloudflare Pages Functions + Hono | アップロード・削除API |
| **ストレージ** | Cloudflare R2 | 音声ファイル本体 |
| **データベース** | Cloudflare D1 (SQLite) | メタデータ管理 |
| **認証** | Basic認証 | 個人使用のため |
| **フロントエンド** | Vanilla JavaScript + Tailwind CSS (CDN) | 依存関係最小化 |

### 2.2 Cloudflare設定

**アカウント情報**:
- Account ID: (Cloudflare Dashboard から確認)
- Email: (Your Cloudflare account email)

**R2バケット**:
- 名前: `wavestk-audio`
- 用途: 音声ファイル本体の保存

**D1データベース**:
- 名前: `wavestk-db`
- 用途: 音声ファイルのメタデータ管理

**Basic認証**:
- ユーザー名: (Cloudflare Dashboard で設定)
- パスワード: (Cloudflare Dashboard で設定)

**カスタムドメイン**:
- 配信CDN: `wave.be2nd.com`（予定）
- 管理画面: `admin-wave.be2nd.com`（オプション）または Workers提供ドメイン

---

## 3. 機能要件

### 3.1 必須機能

#### 3.1.1 アップロード機能
- **対応フォーマット**: MP3, M4A, AAC, WAV, OGG, Opus, FLAC, WebM
- **アップロード方式**: Web管理画面からブラウザアップロード（Base64エンコード方式）
- **ファイルサイズ上限**: 100MB
- **ファイル命名規則**: ランダム8文字ID + 拡張子（例: `abc123de.mp3`）
- **重複チェック**: ランダムID生成時に重複回避
- **メタデータ保存**: D1データベースに以下を保存
  - ID（ランダム8文字）
  - ファイル名（例: `abc123de.mp3`）
  - 元のファイル名（アップロード時の名前）
  - MIME type
  - ファイルサイズ（バイト）
  - URL（配信用URL）
  - アップロード日時
- **UI要件**:
  - ドラッグ&ドロップ対応
  - 複数ファイル同時アップロード対応
  - プログレス表示
  - アップロード完了後にURLとMarkdownコードを表示

#### 3.1.2 配信機能
- **URL形式**: `https://wave.be2nd.com/{8文字ID}.{拡張子}`
- **HTTP Range Request対応**: 必須（音声プレーヤーのシーク機能に必要）
- **キャッシュ戦略**: `Cache-Control: public, max-age=31536000, immutable`（永久キャッシュ）
- **CORS設定**: `be2nd.com`ドメインからのアクセスを許可
- **ETag対応**: 304 Not Modified レスポンス対応
- **Content-Type**: 適切なMIME typeヘッダーを設定

#### 3.1.3 削除機能
- **削除対象**: R2ファイル + D1メタデータ
- **削除確認**: 削除前に確認ダイアログ表示
- **削除権限**: Basic認証済みユーザーのみ

#### 3.1.4 一覧・検索機能
- **一覧表示**: アップロード日時の降順で表示
- **検索機能**: ファイル名（元のファイル名含む）で部分一致検索
- **プレビュー機能**: `<audio>`タグでブラウザ内再生
- **情報表示**:
  - ファイル名
  - 元のファイル名
  - ファイルサイズ（MB表示）
  - アップロード日時
  - URL
- **操作機能**:
  - URLコピー
  - Markdownコピー（`![音声](URL)` 形式）
  - 削除

#### 3.1.5 認証機能
- **認証方式**: HTTP Basic認証
- **保護対象**: 全ページ・全API
- **認証情報**: Cloudflare環境変数で管理
- **セッション**: ブラウザの認証情報保持機能を利用

### 3.2 非機能要件

#### 3.2.1 パフォーマンス
- **配信速度**: Cloudflare CDNによるエッジキャッシュ活用
- **アップロード速度**: 100MBファイルを60秒以内にアップロード完了
- **一覧読み込み**: 50件の音声リストを2秒以内に表示

#### 3.2.2 可用性
- **稼働率**: 99.9%以上（Cloudflare SLA準拠）
- **障害対応**: Cloudflare Workersの自動フェイルオーバー

#### 3.2.3 セキュリティ
- **認証**: Basic認証による全画面・全API保護
- **ファイル検証**: MIME typeチェック、サイズ制限
- **CORS**: 許可されたドメインのみアクセス可能
- **入力検証**: ファイル名の正規表現バリデーション

#### 3.2.4 コスト
- **月額予算**: $5以下
- **想定コスト**:
  - R2ストレージ（100GB）: $1.50
  - R2操作（1000 PUT、10000 GET）: $0.01
  - Workers（10万リクエスト）: 無料
  - D1（5万読み取り、1000書き込み）: 無料
  - **合計**: 約$1.51/月

---

## 4. データ設計

### 4.1 D1データベーススキーマ

```sql
CREATE TABLE IF NOT EXISTS audio_files (
  id TEXT PRIMARY KEY,              -- ランダムID（8文字、例: abc123de）
  filename TEXT NOT NULL,            -- abc123de.mp3
  original_filename TEXT,            -- ユーザーアップロード時のファイル名
  mime TEXT NOT NULL,                -- audio/mpeg, audio/mp4, etc.
  bytes INTEGER NOT NULL,            -- ファイルサイズ
  url TEXT NOT NULL,                 -- https://wave.be2nd.com/abc123de.mp3
  uploaded_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_audio_files_filename ON audio_files(filename);
CREATE INDEX idx_audio_files_uploaded_at ON audio_files(uploaded_at);
```

### 4.2 R2オブジェクト構造

**オブジェクトキー**: `{8文字ID}.{拡張子}`（例: `abc123de.mp3`）

**httpMetadata**:
- `contentType`: `audio/mpeg` 等

**customMetadata**:
- `original-filename`: アップロード時のファイル名

---

## 5. 画面設計

### 5.1 アップロード画面（`/index.html`）

**URL**: `https://admin-wave.be2nd.com/`（または Workers提供ドメイン）

**機能**:
- ドラッグ&ドロップエリア
- ファイル選択ボタン
- 選択ファイル一覧表示
- アップロードボタン
- プログレスバー
- 成功メッセージ（URL、Markdownコード表示）
- エラーメッセージ

### 5.2 ライブラリ画面（`/library.html`）

**URL**: `https://admin-wave.be2nd.com/library.html`

**機能**:
- 検索フィルター
- 音声ファイル一覧カード表示
  - ファイル情報
  - 音声プレーヤー（`<audio>`タグ）
  - URLコピーボタン
  - Markdownコピーボタン
  - 削除ボタン
- ページネーション（50件/ページ）
- 空の状態表示

---

## 6. API設計

### 6.1 アップロードAPI

**エンドポイント**: `POST /api/upload`

**リクエスト**:
```json
{
  "files": [
    {
      "name": "sample.mp3",
      "data": "data:audio/mpeg;base64,/+MYxAAE...",
      "size": 5242880,
      "type": "audio/mpeg"
    }
  ]
}
```

**レスポンス**:
```json
{
  "uploaded": 1,
  "files": [
    {
      "id": "abc123de",
      "filename": "abc123de.mp3",
      "url": "https://wave.be2nd.com/abc123de.mp3",
      "originalFilename": "sample.mp3"
    }
  ]
}
```

### 6.2 一覧API

**エンドポイント**: `GET /api/audio?search={keyword}&limit={limit}&offset={offset}`

**レスポンス**:
```json
{
  "audio": [
    {
      "id": "abc123de",
      "filename": "abc123de.mp3",
      "original_filename": "sample.mp3",
      "mime": "audio/mpeg",
      "bytes": 5242880,
      "url": "https://wave.be2nd.com/abc123de.mp3",
      "uploaded_at": "2025-11-21T12:34:56.000Z",
      "created_at": "2025-11-21T12:34:56.000Z"
    }
  ],
  "count": 1,
  "limit": 50,
  "offset": 0
}
```

### 6.3 削除API

**エンドポイント**: `DELETE /api/audio/{id}`

**レスポンス**:
```json
{
  "deleted": "abc123de"
}
```

### 6.4 配信API（Worker）

**エンドポイント**: `GET /{filename}`（例: `GET /abc123de.mp3`）

**レスポンスヘッダー**:
- `Content-Type`: `audio/mpeg` 等
- `Cache-Control`: `public, max-age=31536000, immutable`
- `Accept-Ranges`: `bytes`
- `ETag`: R2オブジェクトのETag
- `Content-Range`: Range Requestの場合

**ステータスコード**:
- 200: 通常レスポンス
- 206: Partial Content（Range Request）
- 304: Not Modified（ETag一致）
- 404: Not Found
- 400: Bad Request（不正なファイル名）

---

## 7. ディレクトリ構成

```
wavestk/
├── worker/                    # CDN配信専用Worker
│   ├── src/
│   │   └── index.ts          # 音声配信ロジック（Range Request対応）
│   ├── wrangler.toml         # Worker設定
│   └── package.json
├── functions/                 # Pages Functions（API）
│   ├── _middleware.ts        # Basic認証
│   ├── api/
│   │   └── [[path]].ts       # Hono API（アップロード・削除・一覧）
│   ├── errors.ts             # エラーハンドリング
│   └── types.ts              # TypeScript型定義
├── public/                    # 管理画面（静的ファイル）
│   ├── index.html            # アップロード画面
│   ├── script.js             # アップロードロジック
│   ├── library.html          # 音声ライブラリ
│   └── library.js            # 一覧・削除・プレビュー
├── db/
│   ├── schema.sql            # D1スキーマ
│   └── migrations/
│       └── 0001_init.sql     # 初期マイグレーション
├── docs/
│   └── requirements.md       # 本要件定義書
├── wrangler.toml.example     # Pages開発環境設定例
├── package.json
├── tsconfig.json
└── README.md
```

---

## 8. 開発スケジュール

### Phase 1: 環境構築（30分）
- [x] GitHubリポジトリ作成
- [ ] プロジェクト初期化
- [ ] ディレクトリ構成作成
- [ ] R2バケット作成
- [ ] D1データベース作成
- [ ] D1マイグレーション実行

### Phase 2: 配信Worker実装（1時間）
- [ ] Worker TypeScript実装
- [ ] Range Request対応
- [ ] キャッシュ設定
- [ ] CORS設定
- [ ] ローカルテスト
- [ ] デプロイ

### Phase 3: アップロードAPI実装（2時間）
- [ ] Hono APIルーター実装
- [ ] ランダムID生成ロジック
- [ ] Base64デコード処理
- [ ] R2アップロード処理
- [ ] D1保存処理
- [ ] 一覧API実装
- [ ] 削除API実装

### Phase 4: Basic認証実装（30分）
- [ ] Pages Functions middleware実装
- [ ] 認証ロジック実装
- [ ] 環境変数設定

### Phase 5: 管理画面UI実装（2時間）
- [ ] アップロード画面HTML/CSS
- [ ] アップロード画面JavaScript
- [ ] ライブラリ画面HTML/CSS
- [ ] ライブラリ画面JavaScript
- [ ] レスポンシブデザイン対応

### Phase 6: デプロイ・ドメイン設定（1時間）
- [ ] Worker本番デプロイ
- [ ] Pages本番デプロイ
- [ ] カスタムドメイン設定
- [ ] 環境変数設定（Basic認証）
- [ ] 動作確認・テスト

**合計所要時間**: 約7時間

---

## 9. テスト要件

### 9.1 機能テスト

| テスト項目 | 内容 | 期待結果 |
|-----------|------|---------|
| アップロード | MP3ファイル（10MB）をアップロード | 成功、URLが発行される |
| アップロード | 100MB超のファイルをアップロード | エラー表示 |
| アップロード | 画像ファイルをアップロード | 除外される |
| 配信 | URLにアクセス | 音声が再生される |
| Range Request | 音声プレーヤーでシーク | 正常に動作 |
| 削除 | 音声ファイルを削除 | R2とD1から削除される |
| 検索 | ファイル名で検索 | 該当ファイルが表示される |
| Basic認証 | 認証情報なしでアクセス | 401エラー |
| Basic認証 | 正しい認証情報でアクセス | アクセス可能 |

### 9.2 パフォーマンステスト

| テスト項目 | 内容 | 期待結果 |
|-----------|------|---------|
| 配信速度 | 10MBファイルの配信 | 5秒以内 |
| アップロード速度 | 100MBファイルのアップロード | 60秒以内 |
| 一覧読み込み | 50件の一覧表示 | 2秒以内 |

### 9.3 セキュリティテスト

| テスト項目 | 内容 | 期待結果 |
|-----------|------|---------|
| CORS | 許可されていないドメインからアクセス | CORSエラー |
| ファイル検証 | 不正なファイル名でアクセス | 400エラー |
| Basic認証 | 誤った認証情報 | 401エラー |

---

## 10. 運用要件

### 10.1 監視
- Cloudflare Analyticsで以下を監視
  - リクエスト数
  - エラー率
  - レスポンス時間
  - R2ストレージ使用量

### 10.2 バックアップ
- R2のデータは自動的に複製される（Cloudflare側で管理）
- D1のバックアップは定期的にエクスポート推奨

### 10.3 メンテナンス
- Wrangler CLIでのデプロイ
- 環境変数の更新はCloudflare Dashboardから
- マイグレーションは`wrangler d1 execute`コマンドで実行

---

## 11. 制約事項

### 11.1 技術的制約
- Workers CPU時間上限: 10秒/リクエスト（Base64デコード処理に影響）
- R2 PUT上限: 5GB/リクエスト（実際は100MBに制限）
- D1クエリタイムアウト: 30秒

### 11.2 運用的制約
- 個人使用のためサポート体制なし
- Basic認証のため複数ユーザー管理不可
- アクセスログは限定的（Cloudflare Analytics のみ）

### 11.3 コスト的制約
- 月額予算$5以下のため、大量アップロード・配信は制限される
- 無料枠を超えた場合のコスト上昇に注意

---

## 12. 今後の拡張候補（オプション）

以下は初期リリースには含まれないが、将来的に検討可能な機能：

- [ ] プレイリスト機能
- [ ] タグ・カテゴリ管理
- [ ] 音声メタデータ抽出（再生時間、ビットレート等）
- [ ] Podcast RSS Feed生成
- [ ] 統計ダッシュボード（再生回数、帯域幅等）
- [ ] 署名付きURLアップロード（100MB超対応）
- [ ] 音声編集機能（トリミング、音量調整等）
- [ ] 複数ユーザー対応（認証強化）

---

## 13. 参考資料

### 13.1 既存実装
- imgstk: `D:\github\imgstk`（Vanilla JS + Hono、連番方式）
- imgbase: `D:\github\imgbase`（Next.js + itty-router、UUID方式）

### 13.2 Cloudflare ドキュメント
- Workers: https://developers.cloudflare.com/workers/
- R2: https://developers.cloudflare.com/r2/
- D1: https://developers.cloudflare.com/d1/
- Pages: https://developers.cloudflare.com/pages/

### 13.3 関連技術
- Hono: https://hono.dev/
- Tailwind CSS: https://tailwindcss.com/

---

**承認欄**:
- [ ] 要件定義承認
- [ ] 実装開始承認

---

**変更履歴**:
- 2025-11-21: 初版作成

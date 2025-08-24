# プロジェクト構造

このドキュメントは、プロジェクトのフォルダ構造と各ディレクトリの役割を説明します。

## 📁 ルートディレクトリ構造

```
firstapp/
├── 📁 docs/                      # ドキュメント
├── 📁 deploy/                    # デプロイ関連
├── 📁 scripts/                   # スクリプト・ユーティリティ
├── 📁 tests/                     # テストファイル
├── 📁 backups/                   # バックアップファイル
├── 📁 Blog/                      # 開発ブログ
├── 📁 prisma/                    # データベース設定
├── 📁 public/                    # 静的ファイル
├── 📁 src/                       # ソースコード
├── 📁 .vscode/                   # VS Code設定
├── .editorconfig                 # エディタ設定
├── .prettierrc                   # Prettier設定
├── CLAUDE.md                     # Claude開発指示書
├── package.json                  # npm設定
├── next.config.mjs              # Next.js設定
├── tailwind.config.js           # Tailwind設定
└── tsconfig.json                # TypeScript設定
```

## 📂 各ディレクトリの詳細

### `/docs` - ドキュメント
```
docs/
├── ARCHITECTURE.md              # アーキテクチャ設計書
├── DATA_PROTECTION.md          # データ保護ガイド
├── ENCODING_GUIDE.md           # 文字コード設定ガイド
├── OCR_SETUP.md                # OCR設定ガイド
├── README.md                   # プロジェクト概要
├── TEST_CHECKLIST.md          # テストチェックリスト
└── TEST_SPECIFICATIONS.md     # テスト仕様書
```

### `/deploy` - デプロイ関連
```
deploy/
├── deploy.sh                   # デプロイスクリプト
├── render-build.sh            # Render用ビルドスクリプト
├── render.yaml                # Render設定
└── vercel.json                # Vercel設定
```

### `/scripts` - スクリプト・ユーティリティ
```
scripts/
├── backup-db.js              # DB個別バックアップ
├── check-all-backups.js      # 全バックアップ確認
├── check-contacts.js         # 連絡先データ確認
├── check-claude-md.js        # CLAUDE.md確認
├── check-data.sql            # SQLデータ確認
├── check-db.js              # DB状態確認
├── db-backup.js             # 自動バックアップ
├── db-restore.js            # データ復元
├── fix-encoding.js          # 文字コード修正
├── merge-all-data.js        # データ統合
├── prepare-deploy.js        # デプロイ準備
├── restore-local.js         # ローカル復元
├── restore-old-data.js      # 旧データ復元
├── run-tests.js            # テスト実行
├── show-contacts.js        # 連絡先表示
└── unit-tests.js           # ユニットテスト
```

### `/tests` - テストファイル
```
tests/
├── README.md                  # テスト概要
├── basic-smoke-test.js       # 基本スモークテスト
├── package.json             # テスト用パッケージ
├── test-*.html             # HTMLテストファイル
├── test-*.js              # JSテストファイル
└── test-business-card.txt  # テスト用データ
```

### `/src` - ソースコード
```
src/
├── 📁 app/                    # Next.js App Router
│   ├── api/                  # API Routes
│   ├── contacts/            # 連絡先ページ
│   ├── dashboard/           # ダッシュボード
│   ├── network/             # ネットワーク分析
│   ├── reminders/           # リマインダー
│   ├── layout.tsx          # レイアウト
│   └── page.tsx            # ホームページ
│
├── 📁 components/             # Reactコンポーネント
│   ├── ui/                  # UI基本コンポーネント
│   ├── contacts/           # 連絡先関連
│   └── lazy/               # 遅延ロードコンポーネント
│
├── 📁 contexts/               # React Context
│   ├── ThemeContext.tsx    # テーマ管理
│   └── ToastContext.tsx    # 通知管理
│
├── 📁 hooks/                  # カスタムHooks
│   ├── useContacts.ts      # 連絡先操作
│   ├── useCompanies.ts     # 会社操作
│   ├── useDebounce.ts      # デバウンス処理
│   ├── useOCR.ts          # OCR機能
│   └── useLocalStorage.ts  # ローカルストレージ
│
├── 📁 lib/                    # ライブラリ・ユーティリティ
│   ├── api/                # API関連
│   ├── ocr/               # OCR関連
│   ├── prisma/            # Prisma関連
│   ├── apiResponse.ts     # API レスポンス
│   ├── errorHandler.ts    # エラーハンドリング
│   ├── networkAnalysis.ts # ネットワーク分析
│   └── prisma.ts         # Prisma設定
│
├── 📁 types/                  # TypeScript型定義
│   ├── index.ts           # 基本型定義
│   ├── dashboard.ts       # ダッシュボード型
│   └── network.ts         # ネットワーク型
│
├── 📁 constants/              # 定数定義
│   ├── navigation.ts      # ナビゲーション定数
│   ├── theme.ts          # テーマ定数
│   └── shared.ts         # 共通定数
│
├── 📁 core/                   # ビジネスロジック・アーキテクチャ
│   ├── controllers/       # コントローラー
│   ├── repositories/      # リポジトリ
│   ├── services/         # サービス
│   ├── domain/           # ドメインモデル
│   └── validators/       # バリデーター
│
└── 📁 infrastructure/         # インフラストラクチャ
    ├── cache/            # キャッシュ
    ├── database/         # データベース
    └── email/           # メール送信
```

## 🎯 設計原則

### 1. **関心の分離 (Separation of Concerns)**
- UI層 (`components/`, `app/`)
- ビジネスロジック層 (`core/`)
- インフラストラクチャ層 (`infrastructure/`)

### 2. **依存関係の方向**
```
UI → Core ← Infrastructure
```

### 3. **ファイル命名規則**
- **コンポーネント**: PascalCase (`ContactList.tsx`)
- **Hooks**: camelCase + use prefix (`useContacts.ts`)
- **ユーティリティ**: camelCase (`apiResponse.ts`)
- **型定義**: camelCase (`index.ts`)
- **定数**: camelCase (`navigation.ts`)

### 4. **フォルダ構造の原則**
- **機能別**: 関連するファイルを近くに配置
- **階層化**: 複雑な機能は子フォルダで整理
- **再利用性**: 共通コンポーネントは適切な場所に配置

## 🔧 開発時の注意点

### ファイル作成時
1. 適切なフォルダに配置
2. 命名規則に従う
3. 必要に応じてindex.tsでエクスポート

### インポート時
1. 相対パス（同一フォルダ内）: `./filename`
2. エイリアス（`@/`）: `@/components/...`
3. 外部ライブラリ: package名

### コード整理
1. 定期的にリファクタリング
2. 不要なファイルの削除
3. 適切なフォルダへの移動

## 📝 更新履歴

- **2025-08-12**: 初回プロジェクト構造整理
- 散在していたファイルを適切なフォルダに整理
- ドキュメント、スクリプト、テストファイルを分離
- 重複するフォルダ構造を統合
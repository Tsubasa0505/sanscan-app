# FirstApp - 名刺管理アプリケーション

## 📌 概要
Sansan風の名刺管理アプリケーションのMVP版。連絡先の管理、会社情報の自動紐付け、OCR機能による名刺読み取りが可能。

## 🚀 技術スタック
- **Framework**: Next.js 15 (App Router)
- **Database**: SQLite + Prisma ORM
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **OCR**: Tesseract.js

## 📋 前提条件
- Node.js 18.0.0以上
- Git
- npm または yarn

## 🔧 セットアップ手順

### 1. リポジトリのクローン
```bash
git clone [repository-url]
cd firstapp
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 環境変数の設定
`.env.local`ファイルを作成し、必要な環境変数を設定：
```env
DATABASE_URL="file:./dev.db"
```

### 4. データベースのセットアップ
```bash
# Prismaクライアントの生成
npx prisma generate

# マイグレーションの実行
npx prisma migrate dev
```

### 5. 開発サーバーの起動
```bash
npm run dev
```
アプリケーションは http://localhost:3010 でアクセス可能

## 👥 チーム開発のガイドライン

### ブランチ戦略
- `main`: 本番環境用の安定版
- `develop`: 開発用の統合ブランチ
- `feature/*`: 新機能開発用
- `fix/*`: バグ修正用
- `hotfix/*`: 緊急修正用

### ブランチの作成と作業フロー
```bash
# 最新のdevelopブランチから新しいfeatureブランチを作成
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# 作業後のコミット
git add .
git commit -m "feat: 機能の説明"

# プッシュ
git push origin feature/your-feature-name
```

### コミットメッセージ規約
- `feat:` 新機能
- `fix:` バグ修正
- `docs:` ドキュメント変更
- `style:` コードフォーマット（機能に影響なし）
- `refactor:` リファクタリング
- `test:` テスト追加・修正
- `chore:` ビルドプロセスやツールの変更

## 📁 プロジェクト構造
```
firstapp/
├── src/
│   ├── app/            # Next.js App Router
│   │   ├── api/        # APIルート
│   │   ├── contacts/   # 連絡先ページ
│   │   └── dashboard/  # ダッシュボード
│   ├── components/     # Reactコンポーネント
│   ├── lib/           # ユーティリティ関数
│   └── hooks/         # Reactフック
├── prisma/
│   └── schema.prisma  # データベーススキーマ
├── public/            # 静的ファイル
└── tests/             # テストファイル
```

## 🗃️ データベース管理

### ローカル開発での注意点
- SQLiteデータベース（`prisma/dev.db`）は`.gitignore`に追加済み
- 各開発者は自身のローカルDBを使用
- スキーマ変更時は必ずマイグレーションファイルを作成・共有

### マイグレーションの作成と適用
```bash
# 新しいマイグレーションの作成
npx prisma migrate dev --name describe_your_change

# 他の開発者のマイグレーションを適用
git pull origin develop
npx prisma migrate dev
```

## 🔄 同期とマージ

### 最新の変更を取得
```bash
# developブランチの最新を取得
git checkout develop
git pull origin develop

# 自分のfeatureブランチに統合
git checkout feature/your-feature
git merge develop
```

### プルリクエストの作成
1. GitHubでプルリクエストを作成
2. レビュー依頼
3. 承認後にマージ

## 📝 開発ルール
- **ポート番号**: 必ず3010を使用（package.jsonで設定済み）
- **型安全性**: TypeScriptの型を活用
- **コードフォーマット**: Prettierを使用（設定済み）
- **命名規則**: 
  - コンポーネント: PascalCase
  - 関数・変数: camelCase
  - ファイル名: kebab-case

## 🧪 テスト
```bash
# テストの実行
npm test

# 特定のテストファイルの実行
npm test -- tests/specific-test.js
```

## 🐛 トラブルシューティング

### ポート3010が使用中の場合
```bash
# Windows
netstat -ano | findstr :3010
taskkill /PID [PID番号] /F

# Mac/Linux
lsof -i :3010
kill -9 [PID番号]
```

### Prismaエラーの解決
```bash
# Prismaクライアントの再生成
npx prisma generate

# データベースのリセット
npx prisma migrate reset
```

## 📚 参考リンク
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🤝 コントリビューション
1. Issueを作成して機能提案やバグ報告
2. Featureブランチで開発
3. プルリクエストを作成
4. コードレビュー後にマージ

## 📄 ライセンス
[プロジェクトのライセンスを記載]
# 🚀 FirstApp チーム開発ガイド

## 📋 クイックスタート

### 1. 初回セットアップ（新メンバー向け）

```bash
# 1. リポジトリをクローン
git clone https://github.com/[your-org]/firstapp.git
cd firstapp

# 2. 依存関係をインストール
npm install

# 3. 環境変数を設定（.env.localファイルを作成）
echo "DATABASE_URL=\"file:./dev.db\"" > .env.local

# 4. データベースをセットアップ
npx prisma generate
npx prisma migrate dev

# 5. 開発サーバーを起動
npm run dev
```

## 🔄 日常の開発フロー

### 毎朝の作業開始時
```bash
# 最新の変更を取得
git checkout develop
git pull origin develop

# 自分の作業ブランチに移動
git checkout feature/your-feature
git merge develop  # または git rebase develop

# 依存関係を更新
npm install

# データベースマイグレーションを適用
npx prisma migrate dev
```

### 新機能の開発
```bash
# 1. developから新しいブランチを作成
git checkout develop
git checkout -b feature/new-feature-name

# 2. 開発作業...

# 3. コミット（こまめに）
git add .
git commit -m "feat: 機能の説明"

# 4. リモートにプッシュ
git push origin feature/new-feature-name

# 5. GitHubでPull Requestを作成
```

## 🗂️ Git管理ルール

### ブランチ命名規則
- `feature/`: 新機能開発
- `fix/`: バグ修正
- `hotfix/`: 緊急修正
- `refactor/`: リファクタリング
- `docs/`: ドキュメント更新

### コミットメッセージ
```
<type>: <subject>

<body>（オプション）

<footer>（オプション）
```

**タイプ一覧:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: フォーマット変更
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルド・ツール変更

### Pull Requestのルール
1. **developブランチ**へマージ
2. **最低1名のレビュー**が必要
3. **CIテストがパス**していること
4. **コンフリクトが解決**されていること

## 🗃️ データベース管理

### スキーマ変更時の手順
```bash
# 1. schema.prismaを編集

# 2. マイグレーションを作成
npx prisma migrate dev --name descriptive_change_name

# 3. 変更をコミット（マイグレーションファイルも含める）
git add prisma/
git commit -m "feat: データベーススキーマを更新"

# 4. プッシュ
git push origin feature/your-branch
```

### 他メンバーのDB変更を取り込む
```bash
# 最新を取得
git pull origin develop

# マイグレーションを適用
npx prisma migrate dev

# Prismaクライアントを再生成
npx prisma generate
```

## 🐳 Docker開発環境（統一環境）

### Docker環境のセットアップ
```bash
# 1. Dockerコンテナを起動
docker-compose up -d

# 2. コンテナ内で作業
docker-compose exec app bash

# 3. 停止
docker-compose down
```

### VS Code Dev Containerの使用
1. VS Codeで「Remote-Containers」拡張機能をインストール
2. コマンドパレット（F1）から「Reopen in Container」を選択
3. 自動的に環境が構築される

## 📦 依存関係の管理

### 新しいパッケージの追加
```bash
# 1. パッケージをインストール
npm install [package-name]

# 2. package.jsonとpackage-lock.jsonをコミット
git add package*.json
git commit -m "chore: [package-name]を追加"
```

### 依存関係の更新
```bash
# セキュリティアップデート
npm audit fix

# パッケージの更新確認
npm outdated

# 特定パッケージの更新
npm update [package-name]
```

## 🧪 テスト実行

```bash
# 全テスト実行
npm test

# 特定ファイルのテスト
npm test tests/specific-test.js

# ウォッチモード
npm test -- --watch
```

## 🚨 トラブルシューティング

### よくある問題と解決方法

#### 1. ポート3010が使用中
```bash
# プロセスを確認
lsof -i :3010

# プロセスを停止
kill -9 [PID]
```

#### 2. Prismaエラー
```bash
# クライアント再生成
npx prisma generate

# データベースリセット（注意：データが消える）
npx prisma migrate reset
```

#### 3. node_modulesの問題
```bash
# クリーンインストール
rm -rf node_modules package-lock.json
npm install
```

#### 4. Git mergeコンフリクト
```bash
# 1. コンフリクトを解決
# 2. ファイルを編集してコンフリクトマーカーを削除
# 3. 解決したファイルをステージング
git add [resolved-file]

# 4. マージを完了
git commit
```

## 📝 コードレビューチェックリスト

- [ ] コードが動作することを確認
- [ ] TypeScriptの型エラーがない
- [ ] ESLintエラーがない
- [ ] 適切なエラーハンドリング
- [ ] 必要に応じてテストを追加
- [ ] パフォーマンスへの影響を考慮
- [ ] セキュリティの観点で問題がない
- [ ] ドキュメント/コメントが適切

## 🔐 セキュリティ注意事項

### 絶対にやってはいけないこと
- ❌ APIキーやパスワードをコミット
- ❌ .envファイルをコミット
- ❌ console.logでセンシティブ情報を出力
- ❌ SQLインジェクション脆弱性のあるコード

### セキュリティベストプラクティス
- ✅ 環境変数を使用
- ✅ Prismaのパラメータバインディングを使用
- ✅ 入力値の検証
- ✅ 適切な認証・認可

## 📊 プロジェクト構成

```
firstapp/
├── .devcontainer/     # VS Code Dev Container設定
├── .github/           # GitHub Actions設定
├── prisma/
│   ├── schema.prisma  # データベーススキーマ
│   └── migrations/    # マイグレーション履歴
├── public/           # 静的ファイル
├── src/
│   ├── app/          # Next.js App Router
│   ├── components/   # Reactコンポーネント
│   ├── hooks/        # カスタムフック
│   └── lib/          # ユーティリティ
├── tests/            # テストファイル
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## 🤝 コミュニケーション

### 推奨ツール
- **Slack/Discord**: 日常のコミュニケーション
- **GitHub Issues**: タスク管理・バグトラッキング
- **GitHub Projects**: プロジェクト進捗管理
- **GitHub Wiki**: ドキュメント管理

### デイリースタンドアップ（推奨）
- 昨日やったこと
- 今日やること
- ブロッカー/困っていること

## 📚 参考資料

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)

## ❓ ヘルプ

問題が解決しない場合：
1. まずはこのドキュメントを確認
2. チームメンバーに相談
3. GitHub Issueを作成
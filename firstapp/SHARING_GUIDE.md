# 🚀 FirstApp 共有ガイド

## 管理者側の手順

### ステップ1: GitHubでリポジトリを作成

1. **GitHubにログイン** → https://github.com
2. **新規リポジトリ作成**
   - 右上の「+」→「New repository」
   - Repository name: `firstapp`
   - Description: 「名刺管理アプリケーション」
   - **Private**を選択（チーム内のみ共有の場合）
   - **Public**を選択（オープンソースの場合）
   - **DO NOT** initialize with README（既にあるため）
   - 「Create repository」をクリック

### ステップ2: ローカルリポジトリをGitHubに接続

```bash
# 1. 現在の変更をコミット
cd firstapp
git add -A
git commit -m "feat: チーム開発環境の構築"

# 2. GitHubリポジトリをリモートに追加
git remote add origin https://github.com/[あなたのユーザー名]/firstapp.git

# 3. mainブランチにプッシュ
git branch -M main
git push -u origin main

# 4. developブランチを作成してプッシュ
git checkout -b develop
git push -u origin develop
```

### ステップ3: チームメンバーを招待

1. GitHubのリポジトリページへ移動
2. **Settings** タブをクリック
3. 左メニューの **Manage access** → **Invite a collaborator**
4. メンバーのGitHubユーザー名またはメールアドレスを入力
5. **Add [ユーザー名] to this repository** をクリック

### ステップ4: ブランチ保護の設定（推奨）

1. **Settings** → **Branches**
2. **Add rule** をクリック
3. Branch name pattern: `main`
4. 以下を有効化：
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Include administrators
5. **Create** をクリック
6. 同様に`develop`ブランチも設定

---

## チームメンバー側の手順

### ステップ1: 招待を受け入れる

1. メールで届いた招待リンクをクリック
2. **Accept invitation** をクリック

### ステップ2: リポジトリをクローン

```bash
# 1. 作業ディレクトリに移動
cd C:\mywork  # または任意のディレクトリ

# 2. リポジトリをクローン
git clone https://github.com/[管理者のユーザー名]/firstapp.git

# 3. プロジェクトディレクトリに移動
cd firstapp

# 4. developブランチに切り替え
git checkout develop
```

### ステップ3: 環境をセットアップ

```bash
# 1. Node.jsの依存関係をインストール
npm install

# 2. 環境変数ファイルを作成
echo DATABASE_URL="file:./dev.db" > .env.local

# 3. Prismaのセットアップ
npx prisma generate
npx prisma migrate dev

# 4. 開発サーバーを起動
npm run dev
```

### ステップ4: 開発を開始

```bash
# 1. 最新のdevelopを取得
git pull origin develop

# 2. 新機能用のブランチを作成
git checkout -b feature/my-new-feature

# 3. 開発作業...

# 4. 変更をコミット
git add .
git commit -m "feat: 新機能の説明"

# 5. GitHubにプッシュ
git push origin feature/my-new-feature
```

### ステップ5: Pull Requestを作成

1. GitHubのリポジトリページへ移動
2. **Pull requests** タブ → **New pull request**
3. base: `develop` ← compare: `feature/my-new-feature`
4. タイトルと説明を記入
5. **Create pull request** をクリック
6. レビュー待ち → 承認後にマージ

---

## 🔧 代替方法

### A. プライベートな共有（GitHub以外）

#### 方法1: ZIP化して共有
```bash
# 不要ファイルを除外してZIP化
git archive --format=zip --output=firstapp.zip HEAD
```

#### 方法2: USBやネットワークドライブ
```bash
# .gitignoreのファイルを除外してコピー
rsync -av --exclude-from='.gitignore' . /path/to/shared/folder/
```

### B. 社内GitLabやBitbucket

基本的な手順はGitHubと同じ：
1. リポジトリを作成
2. リモートURLを設定
3. プッシュ
4. メンバーを招待

---

## 📱 連絡先の共有

共有する情報をメンバーに送信：

```
【FirstAppプロジェクト】
リポジトリURL: https://github.com/[ユーザー名]/firstapp
ブランチ戦略: Git Flow
開発ブランチ: develop
ポート番号: 3010

セットアップ手順:
1. リポジトリをクローン
2. npm install
3. .env.localを作成
4. npx prisma migrate dev
5. npm run dev

質問があれば連絡してください！
```

---

## ⚠️ 注意事項

### やってはいけないこと
- ❌ .envファイルをコミット
- ❌ node_modulesをコミット
- ❌ データベースファイル（*.db）をコミット
- ❌ APIキーやパスワードをコミット

### トラブルシューティング

#### Permission denied
```bash
# SSHキーの設定
ssh-keygen -t ed25519 -C "your_email@example.com"
# GitHubにSSH公開鍵を登録
```

#### Merge conflict
```bash
# 最新を取得してマージ
git fetch origin
git merge origin/develop
# コンフリクトを解決後
git add .
git commit -m "fix: コンフリクト解決"
```

---

## 📞 サポート

問題が発生した場合：
1. `TEAM_DEVELOPMENT.md`を確認
2. GitHub Issuesで質問
3. チームチャットで相談
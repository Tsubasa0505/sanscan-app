# CLAUDE.md

## プロジェクト概要
- **目的**: 名刺管理アプリ（Sansan風）のMVP開発。
- **主要機能**:
  1. 連絡先（Contacts）の登録・編集・削除
  2. 会社（Company）の自動生成・紐付け（`name`は一意制約）
  3. メモや役職など任意項目の保存
- **技術スタック**:
  - Next.js 15（App Router）
  - Prisma（SQLite, @prisma/client）
  - TypeScript
  - Tailwind CSS

---

## 作業ディレクトリ
- **ルート**: `C:\myapps\firstapp`
- **データベース**: `prisma/schema.prisma`
- **APIルート**: `app/api/**`
- **フロントエンド**: `app/**`

---

## 制約・禁止事項
1. **Company.name は `@unique`**  
   → 会社登録時は `connectOrCreate` を使う。  
2. **OneDrive配下やクラウド同期ディレクトリを使わない**  
   → 権限エラーや`EPERM`を避けるため。
3. **環境変数（.env）は出力しない／変更しない**
4. **外部APIキーやシークレットは絶対にコードに埋め込まない**
5. **大規模変更は事前確認必須**  
   - 複数ファイル変更や依存追加は必ず理由を添える。

---

## 実装ルール
- コードは**差分最小化**し、既存構造を優先して利用。
- Prisma Client の操作は**非同期/await**を明示。
- UIはTailwindで整える（既存スタイルに合わせる）。
- 日本語コメントを適宜入れて可読性を確保。
- **型安全性を重視**するが、実装の初期段階では`any`型の使用も許容。
- ESLintのWarningは許容し、Errorレベルの問題のみ対応必須。

---

## 依頼フォーマット（推奨）
1. **目的**: 何をしたいか（例: `/api/contacts に PUT/DELETE追加`）
2. **制約**: 守るべき条件（例: Company.nameはunique）
3. **出力形式**: ファイル差分 or 新規ファイル内容
4. **完了条件**: 動作確認方法まで提示

---

## レビュー基準
- Prismaスキーマ変更 → migrationファイル作成＆`npx prisma generate`まで。
- API追加 → Postmanや`fetch`での簡易テスト例を提示。
- UI変更 → 画面キャプチャ例またはスクリーンショット指示を出す。

---

## 例: 依頼テンプレ

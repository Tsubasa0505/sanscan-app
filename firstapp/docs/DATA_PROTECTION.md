# データ保護ガイドライン

## 問題の原因と対策

### 発生した問題
- データベース（SQLite）内のデータが消失
- Contacts: 0件、Companies: 0件の状態になった

### 考えられる原因
1. **Prismaマイグレーション**
   - `prisma migrate reset`が実行された可能性
   - スキーマ変更時のマイグレーションエラー

2. **手動削除**
   - dev.dbファイルの直接削除または上書き
   - SQL文による全データ削除

3. **開発環境のリセット**
   - npm scriptによる初期化処理
   - 環境構築時のクリーンアップ

## 恒久対策

### 1. 自動バックアップ機能
```bash
# 手動バックアップ
npm run backup

# リストア
npm run db:restore
```

### 2. バックアップファイル構成
```
prisma/
├── dev.db                      # 本番データベース
├── dev.db.auto_backup          # 最新の自動バックアップ
└── backups/                    # タイムスタンプ付きバックアップ
    ├── dev.db.backup_2025-08-12T14-00-00
    └── ...（最新5件を保持）
```

### 3. 運用ルール

#### 開発時の注意事項
- **Prismaコマンド実行前に必ずバックアップ**
  ```bash
  npm run backup
  npx prisma migrate dev
  ```

- **データベースリセット禁止**
  ```bash
  # 以下のコマンドは使用しない
  npx prisma migrate reset  # ❌ 使用禁止
  npx prisma db push --force-reset  # ❌ 使用禁止
  ```

#### 定期バックアップ
- 重要な変更前には必ず`npm run backup`を実行
- 開発終了時にバックアップを作成
- 新機能実装前にバックアップを作成

### 4. エラー時の復旧手順

1. **データ消失を確認**
   ```bash
   # Prismaでデータ数を確認
   node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.contact.count().then(c => console.log('Contacts:', c));"
   ```

2. **バックアップからリストア**
   ```bash
   npm run db:restore
   # 対話形式でバックアップを選択
   ```

3. **開発サーバー再起動**
   ```bash
   # 既存プロセスを停止
   taskkill /F /IM node.exe
   
   # サーバー再起動
   npm run dev
   ```

### 5. 予防的措置

#### .gitignoreの設定確認
```gitignore
# データベース本体は除外
prisma/dev.db
prisma/dev.db-journal

# バックアップは含める（オプション）
!prisma/dev.db.auto_backup
!prisma/backups/
```

#### 環境変数の保護
- `.env`ファイルのバックアップを別途保管
- データベースURLを変更しない

#### チーム開発時の注意
- マイグレーションファイルは必ずコミット
- スキーマ変更時は事前に通知
- データベースリセットは全員の承認後に実施

## トラブルシューティング

### Q: データが文字化けしている
A: UTF-8エンコーディングの問題。Prisma Clientの再生成で解決
```bash
npx prisma generate
```

### Q: バックアップが作成できない
A: 権限エラーの可能性。管理者権限でターミナルを実行

### Q: リストアしてもデータが表示されない
A: キャッシュの問題。以下を実行：
```bash
# .nextキャッシュをクリア
rm -rf .next
npm run dev
```

## 連絡先
問題が解決しない場合は、以下の情報とともに報告：
- エラーメッセージ
- 実行したコマンド
- prisma/schema.prismaの内容
- package.jsonのバージョン情報
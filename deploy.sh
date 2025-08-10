#!/bin/bash

echo "🚀 Renderデプロイ準備中..."

# schema.prismaをPostgreSQL用に切り替え
echo "📝 PostgreSQL用スキーマに切り替え..."
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

# コミット
git add .
git commit -m "Deploy: PostgreSQL設定に切り替え"

# プッシュ（Renderが自動デプロイ）
git push

echo "✅ デプロイ完了！"

# ローカル用に戻す
echo "🔄 ローカル用（SQLite）に戻す..."
sed -i 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
npx prisma generate

echo "📍 ローカル開発環境に戻りました"
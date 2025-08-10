#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
npx prisma generate
# Prismaスキーマをデータベースにプッシュ
npx prisma db push --accept-data-loss
npm run build
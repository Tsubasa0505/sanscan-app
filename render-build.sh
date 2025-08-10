#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
npx prisma generate
npx prisma migrate deploy || echo "Migration skipped"
npm run build
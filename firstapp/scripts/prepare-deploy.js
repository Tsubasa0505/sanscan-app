const fs = require('fs');
const path = require('path');

console.log('🚀 Renderデプロイ準備中...');

// schema.prismaのパス
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

// ファイル読み込み
let schema = fs.readFileSync(schemaPath, 'utf8');

// SQLiteからPostgreSQLに変更
if (schema.includes('provider = "sqlite"')) {
  schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, schema);
  console.log('✅ PostgreSQL用に変更しました');
  console.log('📌 次の手順:');
  console.log('  1. git add .');
  console.log('  2. git commit -m "Deploy: PostgreSQL設定"');
  console.log('  3. git push');
  console.log('  4. デプロイ後: npm run deploy:restore');
} else {
  console.log('⚠️ 既にPostgreSQL設定になっています');
}
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔄 ローカル開発環境に戻します...');

// schema.prismaのパス
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

// ファイル読み込み
let schema = fs.readFileSync(schemaPath, 'utf8');

// PostgreSQLからSQLiteに戻す
if (schema.includes('provider = "postgresql"')) {
  schema = schema.replace('provider = "postgresql"', 'provider = "sqlite"');
  fs.writeFileSync(schemaPath, schema);
  console.log('✅ SQLite用に戻しました');
  
  // Prismaクライアント再生成
  console.log('🔧 Prismaクライアントを再生成中...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('✅ ローカル開発環境の準備完了！');
} else {
  console.log('⚠️ 既にSQLite設定になっています');
}
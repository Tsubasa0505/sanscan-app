const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DB_PATH = path.join(__dirname, '../prisma/dev.db');
const BACKUP_DIR = path.join(__dirname, '../prisma/backups');
const AUTO_BACKUP_PATH = path.join(__dirname, '../prisma/dev.db.auto_backup');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function listBackups() {
  const backups = [];
  
  // 自動バックアップ
  if (fs.existsSync(AUTO_BACKUP_PATH)) {
    const stats = fs.statSync(AUTO_BACKUP_PATH);
    backups.push({
      name: 'dev.db.auto_backup',
      path: AUTO_BACKUP_PATH,
      date: stats.mtime
    });
  }
  
  // タイムスタンプ付きバックアップ
  if (fs.existsSync(BACKUP_DIR)) {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('dev.db.backup_'));
    
    files.forEach(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      backups.push({
        name: file,
        path: filePath,
        date: stats.mtime
      });
    });
  }
  
  // prismaディレクトリ内の他のバックアップ
  const prismaDir = path.join(__dirname, '../prisma');
  const prismaFiles = fs.readdirSync(prismaDir)
    .filter(f => f.includes('.backup') || f.includes('backup'));
  
  prismaFiles.forEach(file => {
    const filePath = path.join(prismaDir, file);
    if (fs.statSync(filePath).isFile()) {
      const stats = fs.statSync(filePath);
      backups.push({
        name: file,
        path: filePath,
        date: stats.mtime
      });
    }
  });
  
  return backups.sort((a, b) => b.date - a.date);
}

function restoreBackup(backupPath) {
  try {
    // 現在のDBをバックアップ
    const tempBackup = DB_PATH + '.temp_' + Date.now();
    fs.copyFileSync(DB_PATH, tempBackup);
    
    // リストア実行
    fs.copyFileSync(backupPath, DB_PATH);
    console.log(`✅ リストア成功: ${backupPath}`);
    console.log(`   一時バックアップ作成: ${tempBackup}`);
    
    // データ確認
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    Promise.all([
      prisma.contact.count(),
      prisma.company.count()
    ]).then(([contacts, companies]) => {
      console.log(`📊 データ確認:`);
      console.log(`   - Contacts: ${contacts}件`);
      console.log(`   - Companies: ${companies}件`);
      process.exit(0);
    }).catch(err => {
      console.error('データ確認エラー:', err);
      process.exit(1);
    });
  } catch (error) {
    console.error('リストアエラー:', error);
    process.exit(1);
  }
}

// メイン処理
console.log('🔄 データベースリストアツール');
console.log('================================\n');

const backups = listBackups();

if (backups.length === 0) {
  console.log('❌ バックアップが見つかりません');
  process.exit(1);
}

console.log('利用可能なバックアップ:');
backups.forEach((backup, index) => {
  console.log(`${index + 1}. ${backup.name}`);
  console.log(`   更新日時: ${backup.date.toLocaleString('ja-JP')}`);
});

rl.question('\nリストアするバックアップ番号を選択 (1-' + backups.length + '): ', (answer) => {
  const index = parseInt(answer) - 1;
  
  if (index >= 0 && index < backups.length) {
    const selected = backups[index];
    console.log(`\n選択: ${selected.name}`);
    
    rl.question('本当にリストアしますか？ (yes/no): ', (confirm) => {
      if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
        restoreBackup(selected.path);
      } else {
        console.log('キャンセルしました');
        process.exit(0);
      }
      rl.close();
    });
  } else {
    console.log('無効な番号です');
    rl.close();
    process.exit(1);
  }
});
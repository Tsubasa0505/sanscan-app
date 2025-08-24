const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../prisma/dev.db');
const BACKUP_DIR = path.join(__dirname, '../prisma/backups');

// バックアップディレクトリを作成
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0];
  const backupPath = path.join(BACKUP_DIR, `dev.db.backup_${timestamp}`);
  
  try {
    // 自動バックアップ（最新版を常に保持）
    const autoBackupPath = path.join(__dirname, '../prisma/dev.db.auto_backup');
    fs.copyFileSync(DB_PATH, autoBackupPath);
    console.log(`自動バックアップ作成: ${autoBackupPath}`);
    
    // タイムスタンプ付きバックアップ
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`バックアップ作成成功: ${backupPath}`);
    
    // 古いバックアップを削除（最新5つを保持）
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('dev.db.backup_'))
      .sort()
      .reverse();
    
    if (backups.length > 5) {
      backups.slice(5).forEach(oldBackup => {
        fs.unlinkSync(path.join(BACKUP_DIR, oldBackup));
        console.log(`古いバックアップを削除: ${oldBackup}`);
      });
    }
  } catch (error) {
    console.error('バックアップエラー:', error);
  }
}

// 即座に実行
createBackup();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const backupDir = path.join(__dirname, '..', 'backups');

// バックアップディレクトリを作成
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// バックアップを実行
function backupDatabase() {
  if (fs.existsSync(dbPath)) {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.db`);
    
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ データベースをバックアップしました: ${backupPath}`);
    
    // 古いバックアップを削除（最新10件を保持）
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtime
      }))
      .sort((a, b) => b.time - a.time);
    
    if (files.length > 10) {
      files.slice(10).forEach(f => {
        fs.unlinkSync(f.path);
        console.log(`🗑️ 古いバックアップを削除: ${f.name}`);
      });
    }
  } else {
    console.log('⚠️ データベースファイルが見つかりません');
  }
}

backupDatabase();
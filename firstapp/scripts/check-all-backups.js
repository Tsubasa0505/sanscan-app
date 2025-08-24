const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const backupFiles = [
  'prisma/dev.db',  // 現在のDB
  'prisma/dev.db.20250812_121144.backup',
  'prisma/dev.db.20250812_122509.backup',
  'prisma/dev.db.2025-08-12T03-25-38-536Z.backup',
  'prisma/dev.db.auto_backup',
  'prisma/dev.db.current_backup',
  'prisma/dev.db.check',
  'prisma/dev.db.temp',
  'prisma/backups/dev.db.backup_2025-08-12T14-02-52'
];

async function checkDatabase(filePath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(filePath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        resolve({ file: filePath, error: err.message });
        return;
      }

      const queries = {
        contacts: "SELECT COUNT(*) as count FROM Contact",
        companies: "SELECT COUNT(*) as count FROM Company",
        latestContact: "SELECT fullName, createdAt FROM Contact ORDER BY createdAt DESC LIMIT 1",
        oldestContact: "SELECT fullName, createdAt FROM Contact ORDER BY createdAt ASC LIMIT 1"
      };

      const results = { file: filePath };
      let completed = 0;
      const totalQueries = Object.keys(queries).length;

      Object.entries(queries).forEach(([key, query]) => {
        db.get(query, (err, row) => {
          if (err) {
            results[key] = `Error: ${err.message}`;
          } else {
            results[key] = row;
          }
          
          completed++;
          if (completed === totalQueries) {
            db.close();
            resolve(results);
          }
        });
      });
    });
  });
}

async function checkAllBackups() {
  console.log('=== すべてのバックアップファイルをチェック中 ===\n');
  
  for (const file of backupFiles) {
    const result = await checkDatabase(file);
    
    if (result.error) {
      console.log(`❌ ${file}`);
      console.log(`   エラー: ${result.error}\n`);
    } else {
      console.log(`✅ ${file}`);
      console.log(`   連絡先: ${result.contacts?.count || 0} 件`);
      console.log(`   会社: ${result.companies?.count || 0} 件`);
      if (result.latestContact?.fullName) {
        console.log(`   最新: ${result.latestContact.fullName} (${new Date(result.latestContact.createdAt).toLocaleString('ja-JP')})`);
      }
      if (result.oldestContact?.fullName) {
        console.log(`   最古: ${result.oldestContact.fullName} (${new Date(result.oldestContact.createdAt).toLocaleString('ja-JP')})`);
      }
      console.log();
    }
  }

  // 最もデータが多いファイルを特定
  const validResults = [];
  for (const file of backupFiles) {
    const result = await checkDatabase(file);
    if (!result.error && result.contacts) {
      validResults.push({
        file,
        contactCount: result.contacts.count,
        companyCount: result.companies.count
      });
    }
  }

  if (validResults.length > 0) {
    validResults.sort((a, b) => b.contactCount - a.contactCount);
    console.log('=== 最もデータが多いファイル ===');
    console.log(`📁 ${validResults[0].file}`);
    console.log(`   連絡先: ${validResults[0].contactCount} 件`);
    console.log(`   会社: ${validResults[0].companyCount} 件`);
  }
}

checkAllBackups().catch(console.error);
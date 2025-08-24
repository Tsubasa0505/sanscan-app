const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreOldData() {
  console.log('古いデータの復元を開始します...\n');

  try {
    // 現在のデータをバックアップ
    const currentDb = path.join(__dirname, 'prisma', 'dev.db');
    const backupName = `dev.db.${new Date().toISOString().replace(/[:.]/g, '-')}.backup`;
    const backupPath = path.join(__dirname, 'prisma', backupName);
    
    console.log(`現在のデータベースをバックアップ中: ${backupName}`);
    fs.copyFileSync(currentDb, backupPath);
    console.log('✅ バックアップ完了\n');

    // バックアップファイルから復元
    const oldBackup = path.join(__dirname, 'prisma', 'dev.db.20250812_121144.backup');
    
    if (fs.existsSync(oldBackup)) {
      console.log('古いバックアップファイルが見つかりました');
      console.log(`復元元: ${oldBackup}`);
      
      // サーバーを停止することを推奨
      console.log('\n⚠️  重要: データベースを復元する前に、開発サーバーを停止してください。');
      console.log('Ctrl+C を押してこのスクリプトを中止し、サーバーを停止してから再実行してください。');
      console.log('\n10秒後に復元を開始します...');
      
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // データベースファイルを置き換え
      console.log('\nデータベースを復元中...');
      fs.copyFileSync(oldBackup, currentDb);
      console.log('✅ データベースファイルの復元完了');
      
      // 復元されたデータを確認
      console.log('\n=== 復元されたデータの確認 ===');
      const contacts = await prisma.contact.findMany({
        include: {
          company: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      });

      console.log(`\n復元された連絡先（最新10件）:`);
      contacts.forEach(contact => {
        console.log(`- ${contact.fullName} (${contact.email || 'メールなし'}) - ${contact.company?.name || '会社なし'}`);
      });

      const totalContacts = await prisma.contact.count();
      const totalCompanies = await prisma.company.count();
      
      console.log(`\n統計:`);
      console.log(`- 連絡先総数: ${totalContacts}件`);
      console.log(`- 会社総数: ${totalCompanies}件`);
      
      console.log('\n✅ データの復元が完了しました！');
      console.log('開発サーバーを再起動してください: npm run dev');
      
    } else {
      console.error('❌ バックアップファイルが見つかりません:', oldBackup);
    }

  } catch (error) {
    console.error('エラーが発生しました:', error);
    console.log('\nトラブルシューティング:');
    console.log('1. 開発サーバーが停止していることを確認してください');
    console.log('2. prisma/dev.db.20250812_121144.backup ファイルが存在することを確認してください');
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
restoreOldData();
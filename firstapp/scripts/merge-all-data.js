const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const prisma = new PrismaClient();

// 統合するバックアップファイル（ユニークなデータを含む可能性があるもの）
const backupFiles = [
  'prisma/dev.db.20250812_121144.backup',  // 8件の連絡先
  'prisma/dev.db.20250812_122509.backup',  // 11件の連絡先
];

async function getBackupData(filePath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(filePath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }

      const query = `
        SELECT 
          c.*,
          comp.name as companyName
        FROM Contact c
        LEFT JOIN Company comp ON c.companyId = comp.id
      `;

      db.all(query, (err, rows) => {
        if (err) {
          db.close();
          reject(err);
        } else {
          db.close();
          resolve(rows);
        }
      });
    });
  });
}

async function mergeData() {
  console.log('=== データ統合処理を開始 ===\n');

  try {
    // 現在のデータを確認
    const currentContacts = await prisma.contact.findMany({
      include: { company: true }
    });
    console.log(`現在のデータ: ${currentContacts.length} 件の連絡先\n`);

    // 既存のメールアドレスとフルネームのセットを作成
    const existingEmails = new Set(
      currentContacts
        .filter(c => c.email)
        .map(c => c.email.toLowerCase())
    );
    const existingNames = new Set(
      currentContacts.map(c => c.fullName.toLowerCase())
    );

    let totalAdded = 0;
    let totalSkipped = 0;

    // 各バックアップファイルからデータを取得して統合
    for (const file of backupFiles) {
      console.log(`📁 ${file} を処理中...`);
      
      try {
        const backupContacts = await getBackupData(file);
        console.log(`   ${backupContacts.length} 件の連絡先を発見`);

        let added = 0;
        let skipped = 0;

        for (const contact of backupContacts) {
          // 重複チェック（メールまたは名前で）
          const isDuplicate = 
            (contact.email && existingEmails.has(contact.email.toLowerCase())) ||
            existingNames.has(contact.fullName.toLowerCase());

          if (!isDuplicate) {
            try {
              // 会社データの処理
              let companyConnect = undefined;
              if (contact.companyName) {
                const company = await prisma.company.upsert({
                  where: { name: contact.companyName },
                  update: {},
                  create: {
                    name: contact.companyName,
                    domain: contact.companyDomain || null
                  }
                });
                companyConnect = { connect: { id: company.id } };
              }

              // 連絡先を作成
              await prisma.contact.create({
                data: {
                  fullName: contact.fullName,
                  email: contact.email,
                  phone: contact.phone,
                  position: contact.position,
                  notes: contact.notes || `バックアップから復元 (${new Date().toLocaleString('ja-JP')})`,
                  businessCardImage: contact.businessCardImage,
                  profileImage: contact.profileImage,
                  importance: contact.importance || 1,
                  lastContactAt: contact.lastContactAt ? new Date(contact.lastContactAt) : null,
                  company: companyConnect
                }
              });

              // 追加したデータをセットに追加
              if (contact.email) {
                existingEmails.add(contact.email.toLowerCase());
              }
              existingNames.add(contact.fullName.toLowerCase());

              added++;
              console.log(`   ✅ 追加: ${contact.fullName} (${contact.email || 'メールなし'})`);
            } catch (err) {
              console.log(`   ⚠️ スキップ: ${contact.fullName} - ${err.message}`);
              skipped++;
            }
          } else {
            skipped++;
          }
        }

        console.log(`   結果: ${added} 件追加, ${skipped} 件スキップ\n`);
        totalAdded += added;
        totalSkipped += skipped;

      } catch (err) {
        console.log(`   ❌ エラー: ${err.message}\n`);
      }
    }

    // 最終結果を確認
    const finalContacts = await prisma.contact.count();
    const finalCompanies = await prisma.company.count();

    console.log('=== 統合完了 ===');
    console.log(`総計: ${totalAdded} 件追加, ${totalSkipped} 件スキップ`);
    console.log(`最終データ数:`);
    console.log(`  連絡先: ${finalContacts} 件`);
    console.log(`  会社: ${finalCompanies} 件`);

    // 最近追加されたデータを表示
    const recentContacts = await prisma.contact.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { company: true }
    });

    console.log('\n最近のデータ:');
    recentContacts.forEach(c => {
      console.log(`  - ${c.fullName} (${c.email || 'メールなし'}) - ${c.company?.name || '会社なし'}`);
    });

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

mergeData();
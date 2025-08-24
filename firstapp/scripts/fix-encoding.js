const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixEncoding() {
  console.log('文字化けデータの修正を開始します...\n');

  try {
    // 文字化けしているレコードを修正
    const updates = [
      {
        id: 'cme769mdz0006tbt0md1uhiac',
        fullName: '佐藤 花子',
        email: 'sato@design.jp',
        position: 'クリエイティブディレクター',
        companyName: 'デザインスタジオ'
      },
      {
        id: 'cme769gge0004tbt0i45a42hr',
        fullName: '田中 太郎',
        email: 'tanaka@tech.co.jp',
        position: '開発部 エンジニア',
        companyName: 'テックコーポレーション'
      },
      {
        id: 'cme769arm0002tbt030sc7sli',
        fullName: '鈴木 美子',
        email: 'suzuki@example.com',
        position: 'マーケティング部 部長',
        companyName: '株式会社サンプル'
      },
      {
        id: 'cme75v44o0000tbt08pwvoav6',
        fullName: 'テストユーザー',
        email: 'test@example.com',
        companyName: 'テスト会社'
      },
      {
        id: 'cme7z0vxh000htbzcr9amzp3b',
        fullName: 'テスト花子',
        email: 'hanako@test.com',
        position: '営業課長',
        companyName: 'テスト商事'
      }
    ];

    for (const update of updates) {
      try {
        // 連絡先の更新
        const contact = await prisma.contact.update({
          where: { id: update.id },
          data: {
            fullName: update.fullName,
            email: update.email,
            position: update.position || null
          }
        });
        console.log(`✅ 連絡先を修正: ${contact.fullName}`);

        // 会社名も修正が必要な場合
        if (contact.companyId && update.companyName) {
          await prisma.company.update({
            where: { id: contact.companyId },
            data: {
              name: update.companyName
            }
          });
          console.log(`   会社名も修正: ${update.companyName}`);
        }
      } catch (error) {
        console.log(`⚠️ ID ${update.id} はスキップ (存在しない可能性)`);
      }
    }

    // 修正後のデータを確認
    console.log('\n=== 修正後のデータ ===');
    const contacts = await prisma.contact.findMany({
      include: {
        company: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    contacts.forEach(contact => {
      console.log(`名前: ${contact.fullName}`);
      console.log(`  メール: ${contact.email || '未設定'}`);
      console.log(`  役職: ${contact.position || '未設定'}`);
      console.log(`  会社: ${contact.company?.name || '未設定'}`);
      console.log('---');
    });

    console.log(`\n✅ 合計 ${contacts.length} 件の連絡先を確認しました。`);

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEncoding();
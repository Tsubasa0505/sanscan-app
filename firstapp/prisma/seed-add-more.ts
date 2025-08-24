import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 既存データは削除せず、新しいデータのみ追加する
  console.log('既存データを保持して新しいデータを追加します...')

  // 高野さんと豊田さんが所属する会社があるか確認、なければ作成
  let toyotaCompany = await prisma.company.findFirst({
    where: { name: '豊田商事株式会社' }
  })
  if (!toyotaCompany) {
    toyotaCompany = await prisma.company.create({
      data: {
        name: '豊田商事株式会社',
        address: '愛知県豊田市トヨタ町1番地',
        domain: 'toyota-shoji.co.jp'
      }
    })
  }

  let takanoCompany = await prisma.company.findFirst({
    where: { name: '高野総合コンサルティング' }
  })
  if (!takanoCompany) {
    takanoCompany = await prisma.company.create({
      data: {
        name: '高野総合コンサルティング',
        address: '東京都千代田区丸の内1-1-1',
        domain: 'takano-consulting.co.jp'
      }
    })
  }

  // 高野さんと豊田さんを復元
  const restoredContacts = [
    {
      fullName: '高野 誠',
      email: 'takano@takano-consulting.co.jp',
      phone: '03-1111-2222',
      position: '代表取締役社長',
      companyId: takanoCompany.id,
      notes: '戦略コンサルティングのエキスパート。M&A案件多数',
      importance: 5,
      legacyTags: JSON.stringify(['経営者', 'コンサル', 'VIP'])
    },
    {
      fullName: '豊田 章男',
      email: 'toyota@toyota-shoji.co.jp',
      phone: '052-3333-4444',
      position: '会長',
      companyId: toyotaCompany.id,
      notes: '自動車業界のキーパーソン。イノベーション推進',
      importance: 5,
      legacyTags: JSON.stringify(['自動車', '経営者', 'VIP'])
    }
  ]

  // 高野さんと豊田さんが既に存在するか確認
  for (const contact of restoredContacts) {
    const existing = await prisma.contact.findFirst({
      where: {
        fullName: contact.fullName,
        email: contact.email
      }
    })
    if (!existing) {
      await prisma.contact.create({ data: contact })
      console.log(`✅ ${contact.fullName}を追加しました`)
    } else {
      console.log(`⏭️ ${contact.fullName}は既に存在します`)
    }
  }

  // 追加の会社を作成
  const additionalCompanies = [
    { name: 'フィンテック株式会社', address: '東京都千代田区大手町1-1-1', domain: 'fintech.co.jp' },
    { name: '医療システム株式会社', address: '大阪府大阪市中央区本町2-2-2', domain: 'medical-systems.co.jp' },
    { name: 'グリーンエネルギー株式会社', address: '福岡県福岡市中央区天神3-3-3', domain: 'green-energy.co.jp' },
    { name: 'ロボティクス株式会社', address: '愛知県名古屋市中村区名駅4-4-4', domain: 'robotics.co.jp' },
    { name: 'セキュリティソリューション株式会社', address: '東京都渋谷区恵比寿5-5-5', domain: 'security-sol.co.jp' }
  ]

  const companies = []
  for (const companyData of additionalCompanies) {
    let company = await prisma.company.findFirst({
      where: { name: companyData.name }
    })
    if (!company) {
      company = await prisma.company.create({ data: companyData })
    }
    companies.push(company)
  }

  // 追加の連絡先（25名）
  const additionalContacts = [
    // フィンテック
    { fullName: '金融 太郎', email: 'kinyu@fintech.co.jp', phone: '03-5555-0001', position: 'CEO', companyId: companies[0].id, notes: 'ブロックチェーン専門家', importance: 5, legacyTags: JSON.stringify(['フィンテック', 'CEO']) },
    { fullName: '仮想 通貨', email: 'kasou@fintech.co.jp', phone: '03-5555-0002', position: 'CTO', companyId: companies[0].id, notes: '暗号資産の技術責任者', importance: 4, legacyTags: JSON.stringify(['フィンテック', 'CTO']) },
    { fullName: '決済 花子', email: 'kessai@fintech.co.jp', phone: '03-5555-0003', position: 'プロダクトマネージャー', companyId: companies[0].id, notes: 'キャッシュレス決済担当', importance: 3, legacyTags: JSON.stringify(['フィンテック', 'PM']) },
    { fullName: '投資 一郎', email: 'toushi@fintech.co.jp', phone: '03-5555-0004', position: 'ファンドマネージャー', companyId: companies[0].id, notes: 'ロボアドバイザー開発', importance: 4, legacyTags: JSON.stringify(['フィンテック', '投資']) },
    { fullName: '銀行 次郎', email: 'ginko@fintech.co.jp', phone: '03-5555-0005', position: 'コンプライアンス責任者', companyId: companies[0].id, notes: '金融規制対応', importance: 3, legacyTags: JSON.stringify(['フィンテック', 'コンプライアンス']) },

    // 医療システム
    { fullName: '医療 健太', email: 'iryo@medical-systems.co.jp', phone: '06-6666-0001', position: '代表取締役', companyId: companies[1].id, notes: '電子カルテシステム開発', importance: 5, legacyTags: JSON.stringify(['医療', '経営者']) },
    { fullName: '診療 美穂', email: 'shinryo@medical-systems.co.jp', phone: '06-6666-0002', position: '医療情報技師', companyId: companies[1].id, notes: 'HL7/FHIR専門家', importance: 4, legacyTags: JSON.stringify(['医療', 'IT']) },
    { fullName: '薬事 法子', email: 'yakuji@medical-systems.co.jp', phone: '06-6666-0003', position: '薬事コンサルタント', companyId: companies[1].id, notes: '薬事法対応', importance: 3, legacyTags: JSON.stringify(['医療', '薬事']) },
    { fullName: '画像 診断', email: 'gazou@medical-systems.co.jp', phone: '06-6666-0004', position: 'AIエンジニア', companyId: companies[1].id, notes: '医療画像AI開発', importance: 4, legacyTags: JSON.stringify(['医療', 'AI']) },
    { fullName: '遠隔 医子', email: 'enkaku@medical-systems.co.jp', phone: '06-6666-0005', position: 'プロジェクトマネージャー', companyId: companies[1].id, notes: '遠隔医療システム', importance: 3, legacyTags: JSON.stringify(['医療', 'PM']) },

    // グリーンエネルギー
    { fullName: '太陽 光男', email: 'taiyou@green-energy.co.jp', phone: '092-7777-0001', position: 'エネルギーコンサルタント', companyId: companies[2].id, notes: '太陽光発電事業', importance: 4, legacyTags: JSON.stringify(['エネルギー', '太陽光']) },
    { fullName: '風力 発子', email: 'furyoku@green-energy.co.jp', phone: '092-7777-0002', position: '技術開発部長', companyId: companies[2].id, notes: '洋上風力発電', importance: 4, legacyTags: JSON.stringify(['エネルギー', '風力']) },
    { fullName: '蓄電 池美', email: 'chikuden@green-energy.co.jp', phone: '092-7777-0003', position: 'R&Dマネージャー', companyId: companies[2].id, notes: '次世代蓄電池開発', importance: 3, legacyTags: JSON.stringify(['エネルギー', '蓄電']) },
    { fullName: '水素 燃料', email: 'suiso@green-energy.co.jp', phone: '092-7777-0004', position: '水素事業部長', companyId: companies[2].id, notes: '水素エネルギー推進', importance: 4, legacyTags: JSON.stringify(['エネルギー', '水素']) },
    { fullName: '省エネ 効子', email: 'shouene@green-energy.co.jp', phone: '092-7777-0005', position: 'サステナビリティ責任者', companyId: companies[2].id, notes: 'カーボンニュートラル', importance: 3, legacyTags: JSON.stringify(['エネルギー', 'SDGs']) },

    // ロボティクス
    { fullName: 'ロボ 太朗', email: 'robo@robotics.co.jp', phone: '052-8888-0001', position: 'ロボットエンジニア', companyId: companies[3].id, notes: '産業用ロボット開発', importance: 4, legacyTags: JSON.stringify(['ロボット', 'エンジニア']) },
    { fullName: '自動 化子', email: 'jidou@robotics.co.jp', phone: '052-8888-0002', position: 'オートメーション部長', companyId: companies[3].id, notes: '工場自動化システム', importance: 4, legacyTags: JSON.stringify(['ロボット', '自動化']) },
    { fullName: '協働 ロボ美', email: 'kyoudou@robotics.co.jp', phone: '052-8888-0003', position: 'プロダクトデザイナー', companyId: companies[3].id, notes: '協働ロボット設計', importance: 3, legacyTags: JSON.stringify(['ロボット', 'デザイン']) },
    { fullName: 'AI 制御', email: 'ai-control@robotics.co.jp', phone: '052-8888-0004', position: 'AIエンジニア', companyId: companies[3].id, notes: 'ロボット制御AI', importance: 4, legacyTags: JSON.stringify(['ロボット', 'AI']) },
    { fullName: 'センサー 感知', email: 'sensor@robotics.co.jp', phone: '052-8888-0005', position: 'センサーエンジニア', companyId: companies[3].id, notes: 'IoTセンサー開発', importance: 3, legacyTags: JSON.stringify(['ロボット', 'IoT']) },

    // セキュリティソリューション
    { fullName: '防御 守', email: 'bougyo@security-sol.co.jp', phone: '03-9999-0001', position: 'セキュリティアナリスト', companyId: companies[4].id, notes: 'サイバー攻撃対策', importance: 5, legacyTags: JSON.stringify(['セキュリティ', 'アナリスト']) },
    { fullName: '暗号 化美', email: 'angou@security-sol.co.jp', phone: '03-9999-0002', position: '暗号技術責任者', companyId: companies[4].id, notes: '量子暗号研究', importance: 4, legacyTags: JSON.stringify(['セキュリティ', '暗号']) },
    { fullName: '監査 太郎', email: 'kansa@security-sol.co.jp', phone: '03-9999-0003', position: 'セキュリティ監査役', companyId: companies[4].id, notes: 'ISO27001対応', importance: 3, legacyTags: JSON.stringify(['セキュリティ', '監査']) },
    { fullName: 'ゼロトラスト 実', email: 'zerotrust@security-sol.co.jp', phone: '03-9999-0004', position: 'ネットワークエンジニア', companyId: companies[4].id, notes: 'ゼロトラスト構築', importance: 4, legacyTags: JSON.stringify(['セキュリティ', 'ネットワーク']) },
    { fullName: 'インシデント 対子', email: 'incident@security-sol.co.jp', phone: '03-9999-0005', position: 'CSIRT責任者', companyId: companies[4].id, notes: 'インシデント対応', importance: 4, legacyTags: JSON.stringify(['セキュリティ', 'CSIRT']) }
  ]

  // 追加の連絡先を作成
  let addedCount = 0
  for (const contact of additionalContacts) {
    const existing = await prisma.contact.findFirst({
      where: {
        fullName: contact.fullName,
        email: contact.email
      }
    })
    if (!existing) {
      await prisma.contact.create({ data: contact })
      addedCount++
    }
  }

  // 既存の連絡先数を取得
  const totalContacts = await prisma.contact.count()
  const totalCompanies = await prisma.company.count()

  console.log('='.repeat(50))
  console.log(`✅ データ追加が完了しました`)
  console.log(`  新規追加: ${addedCount}件`)
  console.log(`  総連絡先数: ${totalContacts}件`)
  console.log(`  総会社数: ${totalCompanies}件`)
  console.log('='.repeat(50))
}

main()
  .catch((e) => {
    console.error('❌ データ追加に失敗しました:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
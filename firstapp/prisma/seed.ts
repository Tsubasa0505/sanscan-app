import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 既存データをクリア
  await prisma.contactHistory.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.company.deleteMany()

  // サンプル会社を作成
  const companies = await Promise.all([
    prisma.company.create({
      data: {
        name: '株式会社テックイノベーション',
        address: '東京都渋谷区渋谷1-1-1',
        domain: 'tech-innovation.co.jp',
      }
    }),
    prisma.company.create({
      data: {
        name: 'グローバルソリューションズ株式会社',
        address: '大阪府大阪市北区梅田2-2-2',
        domain: 'global-solutions.co.jp',
      }
    }),
    prisma.company.create({
      data: {
        name: '未来デザイン合同会社',
        address: '福岡県福岡市博多区博多駅前3-3-3',
        domain: 'mirai-design.co.jp',
      }
    }),
    prisma.company.create({
      data: {
        name: '株式会社クリエイティブワークス',
        address: '東京都港区六本木4-4-4',
        domain: 'creative-works.co.jp',
      }
    }),
    prisma.company.create({
      data: {
        name: 'デジタルマーケティング株式会社',
        address: '東京都新宿区西新宿5-5-5',
        domain: 'digital-marketing.co.jp',
      }
    }),
    prisma.company.create({
      data: {
        name: 'エンタープライズシステム株式会社',
        address: '神奈川県横浜市西区みなとみらい6-6-6',
        domain: 'enterprise-systems.co.jp',
      }
    }),
    prisma.company.create({
      data: {
        name: '株式会社イーコマース',
        address: '愛知県名古屋市中区栄7-7-7',
        domain: 'e-commerce.co.jp',
      }
    }),
    prisma.company.create({
      data: {
        name: 'AIテクノロジー株式会社',
        address: '京都府京都市下京区烏丸通8-8-8',
        domain: 'ai-technology.co.jp',
      }
    }),
    prisma.company.create({
      data: {
        name: '株式会社モバイルソリューション',
        address: '北海道札幌市中央区大通西9-9-9',
        domain: 'mobile-solution.co.jp',
      }
    }),
    prisma.company.create({
      data: {
        name: 'クラウドサービス株式会社',
        address: '宮城県仙台市青葉区中央10-10-10',
        domain: 'cloud-service.co.jp',
      }
    }),
  ])

  // サンプル連絡先を作成（50件）
  const contacts = [
    // テックイノベーション
    { fullName: '山田太郎', email: 'yamada@tech-innovation.co.jp', phone: '090-1234-5678', position: '代表取締役', companyId: companies[0].id, notes: '新規プロジェクトの決裁者', importance: 5, legacyTags: JSON.stringify(['経営層', 'VIP']) },
    { fullName: '鈴木花子', email: 'suzuki@tech-innovation.co.jp', phone: '080-2345-6789', position: 'CTO', companyId: companies[0].id, notes: '技術面の責任者', importance: 5, legacyTags: JSON.stringify(['技術', 'VIP']) },
    { fullName: '田中一郎', email: 'tanaka@tech-innovation.co.jp', phone: '070-3456-7890', position: 'エンジニアマネージャー', companyId: companies[0].id, notes: 'フロントエンド開発のリーダー', importance: 4, legacyTags: JSON.stringify(['エンジニア', 'マネージャー']) },
    { fullName: '佐藤美穂', email: 'sato@tech-innovation.co.jp', phone: '090-4567-8901', position: 'プロダクトマネージャー', companyId: companies[0].id, notes: '新製品の企画担当', importance: 4, legacyTags: JSON.stringify(['PM', 'プロダクト']) },
    { fullName: '高橋健太', email: 'takahashi@tech-innovation.co.jp', phone: '080-5678-9012', position: 'シニアエンジニア', companyId: companies[0].id, notes: 'React専門家', importance: 3, legacyTags: JSON.stringify(['エンジニア', 'React']) },
    
    // グローバルソリューションズ
    { fullName: '伊藤真理', email: 'ito@global-solutions.co.jp', phone: '070-6789-0123', position: '営業部長', companyId: companies[1].id, notes: '大型案件の担当者', importance: 4, legacyTags: JSON.stringify(['営業', '部長']) },
    { fullName: '渡辺俊介', email: 'watanabe@global-solutions.co.jp', phone: '090-7890-1234', position: 'セールスマネージャー', companyId: companies[1].id, notes: '関西エリア担当', importance: 3, legacyTags: JSON.stringify(['営業', '関西']) },
    { fullName: '小林由美', email: 'kobayashi@global-solutions.co.jp', phone: '080-8901-2345', position: 'アカウントマネージャー', companyId: companies[1].id, notes: '既存顧客のフォロー担当', importance: 3, legacyTags: JSON.stringify(['営業', 'CS']) },
    { fullName: '山本隆', email: 'yamamoto@global-solutions.co.jp', phone: '070-9012-3456', position: 'マーケティングディレクター', companyId: companies[1].id, notes: 'デジタルマーケティング責任者', importance: 4, legacyTags: JSON.stringify(['マーケティング', 'ディレクター']) },
    { fullName: '中村愛', email: 'nakamura@global-solutions.co.jp', phone: '090-0123-4567', position: 'PRマネージャー', companyId: companies[1].id, notes: '広報・PR担当', importance: 3, legacyTags: JSON.stringify(['PR', '広報']) },
    
    // 未来デザイン
    { fullName: '加藤晋也', email: 'kato@mirai-design.co.jp', phone: '080-1234-5678', position: 'デザインディレクター', companyId: companies[2].id, notes: 'UIデザインの責任者', importance: 4, legacyTags: JSON.stringify(['デザイン', 'UI']) },
    { fullName: '吉田香織', email: 'yoshida@mirai-design.co.jp', phone: '070-2345-6789', position: 'UXデザイナー', companyId: companies[2].id, notes: 'ユーザー体験設計のスペシャリスト', importance: 3, legacyTags: JSON.stringify(['デザイン', 'UX']) },
    { fullName: '松本大輔', email: 'matsumoto@mirai-design.co.jp', phone: '090-3456-7890', position: 'グラフィックデザイナー', companyId: companies[2].id, notes: 'ビジュアルデザイン担当', importance: 3, legacyTags: JSON.stringify(['デザイン', 'グラフィック']) },
    { fullName: '木村梨花', email: 'kimura@mirai-design.co.jp', phone: '080-4567-8901', position: 'アートディレクター', companyId: companies[2].id, notes: 'ブランディング担当', importance: 4, legacyTags: JSON.stringify(['デザイン', 'ブランディング']) },
    { fullName: '斉藤翔', email: 'saito@mirai-design.co.jp', phone: '070-5678-9012', position: 'モーションデザイナー', companyId: companies[2].id, notes: 'アニメーション制作', importance: 3, legacyTags: JSON.stringify(['デザイン', 'アニメーション']) },
    
    // クリエイティブワークス
    { fullName: '橋本美咲', email: 'hashimoto@creative-works.co.jp', phone: '090-6789-0123', position: 'クリエイティブディレクター', companyId: companies[3].id, notes: '広告制作の責任者', importance: 5, legacyTags: JSON.stringify(['クリエイティブ', 'ディレクター']) },
    { fullName: '森田健一', email: 'morita@creative-works.co.jp', phone: '080-7890-1234', position: 'コピーライター', companyId: companies[3].id, notes: 'キャッチコピー制作', importance: 3, legacyTags: JSON.stringify(['クリエイティブ', 'コピー']) },
    { fullName: '清水由紀', email: 'shimizu@creative-works.co.jp', phone: '070-8901-2345', position: 'プランナー', companyId: companies[3].id, notes: 'キャンペーン企画', importance: 3, legacyTags: JSON.stringify(['企画', 'プランナー']) },
    { fullName: '岡田慎二', email: 'okada@creative-works.co.jp', phone: '090-9012-3456', position: 'プロデューサー', companyId: companies[3].id, notes: '制作進行管理', importance: 4, legacyTags: JSON.stringify(['プロデューサー', '制作']) },
    { fullName: '藤井麻衣', email: 'fujii@creative-works.co.jp', phone: '080-0123-4567', position: 'ディレクター', companyId: companies[3].id, notes: '映像制作担当', importance: 3, legacyTags: JSON.stringify(['映像', 'ディレクター']) },
    
    // デジタルマーケティング
    { fullName: '石川博之', email: 'ishikawa@digital-marketing.co.jp', phone: '070-1234-5678', position: 'CMO', companyId: companies[4].id, notes: 'マーケティング戦略の責任者', importance: 5, legacyTags: JSON.stringify(['経営層', 'マーケティング']) },
    { fullName: '宮崎あゆみ', email: 'miyazaki@digital-marketing.co.jp', phone: '090-2345-6789', position: 'グロースハッカー', companyId: companies[4].id, notes: '成長戦略担当', importance: 4, legacyTags: JSON.stringify(['グロース', 'マーケティング']) },
    { fullName: '村上拓也', email: 'murakami@digital-marketing.co.jp', phone: '080-3456-7890', position: 'SEOスペシャリスト', companyId: companies[4].id, notes: '検索エンジン最適化', importance: 3, legacyTags: JSON.stringify(['SEO', 'マーケティング']) },
    { fullName: '西田さくら', email: 'nishida@digital-marketing.co.jp', phone: '070-4567-8901', position: 'コンテンツマーケター', companyId: companies[4].id, notes: 'コンテンツ戦略立案', importance: 3, legacyTags: JSON.stringify(['コンテンツ', 'マーケティング']) },
    { fullName: '前田光', email: 'maeda@digital-marketing.co.jp', phone: '090-5678-9012', position: 'SNSマネージャー', companyId: companies[4].id, notes: 'ソーシャルメディア運用', importance: 3, legacyTags: JSON.stringify(['SNS', 'マーケティング']) },
    
    // エンタープライズシステム
    { fullName: '後藤正樹', email: 'goto@enterprise-systems.co.jp', phone: '080-6789-0123', position: 'システムアーキテクト', companyId: companies[5].id, notes: '大規模システム設計', importance: 5, legacyTags: JSON.stringify(['アーキテクト', 'システム']) },
    { fullName: '野村恵子', email: 'nomura@enterprise-systems.co.jp', phone: '070-7890-1234', position: 'インフラエンジニア', companyId: companies[5].id, notes: 'AWS専門家', importance: 4, legacyTags: JSON.stringify(['インフラ', 'AWS']) },
    { fullName: '太田勇気', email: 'ota@enterprise-systems.co.jp', phone: '090-8901-2345', position: 'セキュリティエンジニア', companyId: companies[5].id, notes: 'セキュリティ監査担当', importance: 4, legacyTags: JSON.stringify(['セキュリティ', 'エンジニア']) },
    { fullName: '川口智子', email: 'kawaguchi@enterprise-systems.co.jp', phone: '080-9012-3456', position: 'データベースエンジニア', companyId: companies[5].id, notes: 'DB設計・チューニング', importance: 3, legacyTags: JSON.stringify(['DB', 'エンジニア']) },
    { fullName: '池田健', email: 'ikeda@enterprise-systems.co.jp', phone: '070-0123-4567', position: 'DevOpsエンジニア', companyId: companies[5].id, notes: 'CI/CD構築', importance: 3, legacyTags: JSON.stringify(['DevOps', 'エンジニア']) },
    
    // イーコマース
    { fullName: '上田涼子', email: 'ueda@e-commerce.co.jp', phone: '090-1234-5678', position: 'ECディレクター', companyId: companies[6].id, notes: 'ECサイト運営責任者', importance: 4, legacyTags: JSON.stringify(['EC', 'ディレクター']) },
    { fullName: '横山大地', email: 'yokoyama@e-commerce.co.jp', phone: '080-2345-6789', position: 'カスタマーサクセス', companyId: companies[6].id, notes: '顧客満足度向上担当', importance: 3, legacyTags: JSON.stringify(['CS', 'カスタマー']) },
    { fullName: '松田奈々', email: 'matsuda@e-commerce.co.jp', phone: '070-3456-7890', position: 'ロジスティクスマネージャー', companyId: companies[6].id, notes: '物流最適化', importance: 3, legacyTags: JSON.stringify(['物流', 'マネージャー']) },
    { fullName: '竹内修', email: 'takeuchi@e-commerce.co.jp', phone: '090-4567-8901', position: 'バイヤー', companyId: companies[6].id, notes: '商品仕入れ担当', importance: 3, legacyTags: JSON.stringify(['バイヤー', '仕入れ']) },
    { fullName: '原田百合', email: 'harada@e-commerce.co.jp', phone: '080-5678-9012', position: 'MDマネージャー', companyId: companies[6].id, notes: 'マーチャンダイジング', importance: 4, legacyTags: JSON.stringify(['MD', 'マーチャンダイジング']) },
    
    // AIテクノロジー
    { fullName: '安藤圭介', email: 'ando@ai-technology.co.jp', phone: '070-6789-0123', position: 'AIリサーチャー', companyId: companies[7].id, notes: '機械学習モデル開発', importance: 5, legacyTags: JSON.stringify(['AI', 'リサーチ']) },
    { fullName: '中島早紀', email: 'nakajima@ai-technology.co.jp', phone: '090-7890-1234', position: 'データサイエンティスト', companyId: companies[7].id, notes: 'ビッグデータ分析', importance: 4, legacyTags: JSON.stringify(['データサイエンス', 'AI']) },
    { fullName: '福田龍', email: 'fukuda@ai-technology.co.jp', phone: '080-8901-2345', position: 'MLエンジニア', companyId: companies[7].id, notes: '深層学習実装', importance: 4, legacyTags: JSON.stringify(['ML', 'エンジニア']) },
    { fullName: '長谷川美月', email: 'hasegawa@ai-technology.co.jp', phone: '070-9012-3456', position: 'AIプロダクトマネージャー', companyId: companies[7].id, notes: 'AI製品企画', importance: 4, legacyTags: JSON.stringify(['AI', 'PM']) },
    { fullName: '内田正人', email: 'uchida@ai-technology.co.jp', phone: '090-0123-4567', position: 'AIエシックスオフィサー', companyId: companies[7].id, notes: 'AI倫理担当', importance: 3, legacyTags: JSON.stringify(['AI', '倫理']) },
    
    // モバイルソリューション
    { fullName: '黒田優太', email: 'kuroda@mobile-solution.co.jp', phone: '080-1234-5678', position: 'iOSエンジニア', companyId: companies[8].id, notes: 'Swift開発専門', importance: 3, legacyTags: JSON.stringify(['iOS', 'モバイル']) },
    { fullName: '白石彩香', email: 'shiraishi@mobile-solution.co.jp', phone: '070-2345-6789', position: 'Androidエンジニア', companyId: companies[8].id, notes: 'Kotlin開発', importance: 3, legacyTags: JSON.stringify(['Android', 'モバイル']) },
    { fullName: '青木健司', email: 'aoki@mobile-solution.co.jp', phone: '090-3456-7890', position: 'モバイルアーキテクト', companyId: companies[8].id, notes: 'アプリ設計責任者', importance: 4, legacyTags: JSON.stringify(['アーキテクト', 'モバイル']) },
    { fullName: '赤井美紀', email: 'akai@mobile-solution.co.jp', phone: '080-4567-8901', position: 'QAエンジニア', companyId: companies[8].id, notes: 'テスト自動化', importance: 3, legacyTags: JSON.stringify(['QA', 'テスト']) },
    { fullName: '緑川隼人', email: 'midorikawa@mobile-solution.co.jp', phone: '070-5678-9012', position: 'モバイルUXデザイナー', companyId: companies[8].id, notes: 'アプリUI/UX設計', importance: 3, legacyTags: JSON.stringify(['UX', 'モバイル']) },
    
    // クラウドサービス
    { fullName: '金子直樹', email: 'kaneko@cloud-service.co.jp', phone: '090-6789-0123', position: 'クラウドアーキテクト', companyId: companies[9].id, notes: 'マルチクラウド戦略', importance: 5, legacyTags: JSON.stringify(['クラウド', 'アーキテクト']) },
    { fullName: '銀田桃子', email: 'ginda@cloud-service.co.jp', phone: '080-7890-1234', position: 'SREエンジニア', companyId: companies[9].id, notes: 'サービス信頼性向上', importance: 4, legacyTags: JSON.stringify(['SRE', 'クラウド']) },
    { fullName: '銅山武志', email: 'doyama@cloud-service.co.jp', phone: '070-8901-2345', position: 'Kubernetesエンジニア', companyId: companies[9].id, notes: 'コンテナ基盤構築', importance: 4, legacyTags: JSON.stringify(['Kubernetes', 'クラウド']) },
    { fullName: '鉄田沙織', email: 'tetsuda@cloud-service.co.jp', phone: '090-9012-3456', position: 'クラウドセキュリティエンジニア', companyId: companies[9].id, notes: 'クラウドセキュリティ', importance: 4, legacyTags: JSON.stringify(['セキュリティ', 'クラウド']) },
    { fullName: '鋼野達也', email: 'hagano@cloud-service.co.jp', phone: '080-0123-4567', position: 'FinOpsスペシャリスト', companyId: companies[9].id, notes: 'クラウドコスト最適化', importance: 3, legacyTags: JSON.stringify(['FinOps', 'クラウド']) },
  ]

  // 連絡先を作成
  for (const contact of contacts) {
    await prisma.contact.create({ data: contact })
  }

  console.log(`✅ シードデータの作成が完了しました`)
  console.log(`  会社: ${companies.length}件`)
  console.log(`  連絡先: ${contacts.length}件`)
}

main()
  .catch((e) => {
    console.error('❌ シードデータの作成に失敗しました:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

// バックアップデータベースに接続するための設定
const backupDbPath = path.join(__dirname, 'dev.db.20250812_122509.backup')
const backupDbUrl = `file:${backupDbPath}`

// バックアップ用のPrismaクライアントを作成
const backupPrisma = new PrismaClient({
  datasources: {
    db: {
      url: backupDbUrl
    }
  }
})

// 現在のデータベース用のPrismaクライアント
const currentPrisma = new PrismaClient()

async function checkAndRestoreData() {
  try {
    console.log('バックアップデータベースから古いデータを確認中...\n')
    
    // バックアップから連絡先データを取得
    const backupContacts = await backupPrisma.contact.findMany({
      include: {
        company: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
    
    console.log(`バックアップデータベースに ${backupContacts.length} 件の連絡先が見つかりました\n`)
    
    // データをリストアップ
    console.log('=== バックアップデータベースの連絡先一覧 ===')
    backupContacts.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.fullName} - ${contact.company?.name || '会社なし'} - ${contact.position || '役職なし'}`)
    })
    
    console.log('\n=== 現在のデータベースにない連絡先を復元します ===\n')
    
    // 現在のデータベースにない連絡先を探す
    let restoredCount = 0
    for (const contact of backupContacts) {
      const exists = await currentPrisma.contact.findFirst({
        where: {
          OR: [
            { fullName: contact.fullName },
            { email: contact.email }
          ]
        }
      })
      
      if (!exists) {
        // 会社が存在するか確認、なければ作成
        let company = null
        if (contact.company) {
          company = await currentPrisma.company.findFirst({
            where: { name: contact.company.name }
          })
          
          if (!company) {
            company = await currentPrisma.company.create({
              data: {
                name: contact.company.name,
                address: contact.company.address,
                domain: contact.company.domain
              }
            })
            console.log(`  ✅ 会社を作成: ${company.name}`)
          }
        }
        
        // 連絡先を復元
        const restored = await currentPrisma.contact.create({
          data: {
            fullName: contact.fullName,
            email: contact.email,
            phone: contact.phone,
            position: contact.position,
            companyId: company?.id,
            notes: contact.notes,
            businessCardImage: contact.businessCardImage,
            profileImage: contact.profileImage,
            legacyTags: contact.legacyTags,
            importance: contact.importance,
            lastContactAt: contact.lastContactAt
          }
        })
        console.log(`  ✅ 連絡先を復元: ${restored.fullName} (${company?.name || '会社なし'})`)
        restoredCount++
      }
    }
    
    // 最終的な統計
    const totalContacts = await currentPrisma.contact.count()
    const totalCompanies = await currentPrisma.company.count()
    
    console.log('\n' + '='.repeat(50))
    console.log('✅ データ復元が完了しました')
    console.log(`  復元した連絡先: ${restoredCount}件`)
    console.log(`  総連絡先数: ${totalContacts}件`)
    console.log(`  総会社数: ${totalCompanies}件`)
    console.log('='.repeat(50))
    
  } catch (error) {
    console.error('エラーが発生しました:', error)
  } finally {
    await backupPrisma.$disconnect()
    await currentPrisma.$disconnect()
  }
}

checkAndRestoreData()
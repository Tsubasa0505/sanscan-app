const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkData() {
  try {
    const contacts = await prisma.contact.findMany({
      include: {
        company: true
      }
    })
    
    const companies = await prisma.company.findMany()
    
    console.log('=== データベースの内容 ===')
    console.log(`連絡先数: ${contacts.length}件`)
    console.log(`会社数: ${companies.length}件`)
    
    if (contacts.length > 0) {
      console.log('\n=== 連絡先リスト ===')
      contacts.forEach(contact => {
        console.log(`- ${contact.fullName} (${contact.email || 'メールなし'}) - ${contact.company?.name || '会社なし'}`)
      })
    }
    
    if (companies.length > 0) {
      console.log('\n=== 会社リスト ===')
      companies.forEach(company => {
        console.log(`- ${company.name} (${company.domain || 'ドメインなし'})`)
      })
    }
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkData()
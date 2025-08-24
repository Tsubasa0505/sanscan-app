const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    // 全フィールドを含む最初の5件を取得
    const contacts = await prisma.contact.findMany({
      take: 5,
      include: {
        company: true
      }
    });
    
    console.log('First 5 contacts with all fields:');
    contacts.forEach((contact, index) => {
      console.log(`\n--- Contact ${index + 1} ---`);
      console.log('ID:', contact.id);
      console.log('fullName:', contact.fullName);
      console.log('email:', contact.email);
      console.log('phone:', contact.phone);
      console.log('position:', contact.position);
      console.log('companyId:', contact.companyId);
      console.log('company:', contact.company);
      console.log('notes:', contact.notes);
      console.log('importance:', contact.importance);
    });
    
  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
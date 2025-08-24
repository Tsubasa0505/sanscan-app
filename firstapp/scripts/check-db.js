const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const contacts = await prisma.contact.count();
    const companies = await prisma.company.count();
    
    console.log('=== Database Status ===');
    console.log('Contacts:', contacts);
    console.log('Companies:', companies);
    
    if (contacts > 0) {
      const recentContacts = await prisma.contact.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { company: true }
      });
      console.log('\n=== Recent Contacts ===');
      recentContacts.forEach(c => {
        console.log(`- ${c.fullName} (${c.email}) - Company: ${c.company?.name || 'N/A'}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
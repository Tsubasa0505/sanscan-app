const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const count = await prisma.contact.count();
    console.log('Total contacts in database:', count);
    
    const contacts = await prisma.contact.findMany({
      take: 5,
      include: {
        company: true
      }
    });
    
    console.log('\nFirst 5 contacts:');
    contacts.forEach(contact => {
      console.log(`- ${contact.name} (${contact.email}) - Company: ${contact.company?.name || 'N/A'}`);
    });
    
    const companies = await prisma.company.count();
    console.log('\nTotal companies:', companies);
    
  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
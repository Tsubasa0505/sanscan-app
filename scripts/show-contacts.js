const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contacts = await prisma.contact.findMany({
    include: {
      company: true
    }
  });
  
  console.log(`Found ${contacts.length} contacts:`);
  contacts.forEach(contact => {
    console.log(`- ${contact.fullName} (${contact.company?.name || 'No company'})`);
  });
  
  const companies = await prisma.company.findMany();
  console.log(`\nFound ${companies.length} companies:`);
  companies.forEach(company => {
    console.log(`- ${company.name}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
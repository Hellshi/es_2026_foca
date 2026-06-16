import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const disciplinas = [
  'Matemática',
  'Português',
  'Ciências Biológicas',
  'História',
  'Geografia',
  'Inglês',
  'Artes',
  'Educação Física',
  'Filosofia',
  'Sociologia',
  'Física',
  'Química',
];

async function main() {
  for (const nome of disciplinas) {
    await prisma.disciplina.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

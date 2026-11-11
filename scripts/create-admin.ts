// Cria um usuário admin ou promove/redefine a senha de um usuário existente.
// Uso: npm run admin:create -- email@exemplo.com "senha-forte" "Nome"
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [email, password, name = "Cantina"] = process.argv.slice(2);

if (!email?.includes("@") || !password || password.length < 8) {
  console.error('Uso: npm run admin:create -- email@exemplo.com "senha (mín. 8 caracteres)" "Nome"');
  process.exit(1);
}

async function main() {
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { role: "ADMIN", passwordHash },
    create: { email: email.toLowerCase(), name, role: "ADMIN", passwordHash },
  });
  console.log(`Admin pronto: ${email.toLowerCase()}`);
  await prisma.$disconnect();
}

main();

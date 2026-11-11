// Seed: cria configurações, usuário admin e produtos de exemplo.
// É idempotente: pode ser executado várias vezes sem duplicar dados.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEMO_PIX_KEY = "00000000-0000-4000-8000-000000000000";

const SAMPLE: { category: string; products: [name: string, description: string, priceCents: number, stock?: number][] }[] = [
  {
    category: "Salgados",
    products: [
      ["Coxinha de frango", "Massa de batata, recheio de frango desfiado com catupiry.", 750],
      ["Pão de queijo", "Tradicional mineiro, assado na hora. Porção com 3 unidades.", 600],
      ["Esfiha de carne", "Massa aberta, carne temperada com limão.", 700],
      ["Empada de palmito", "Massa amanteigada com recheio cremoso de palmito.", 800, 12],
    ],
  },
  {
    category: "Lanches",
    products: [
      ["Misto quente", "Pão de forma, presunto e queijo mussarela na chapa.", 950],
      ["X-salada", "Hambúrguer bovino, queijo, alface, tomate e maionese da casa.", 1800],
      ["Sanduíche natural", "Pão integral, frango, cenoura, alface e requeijão.", 1400, 8],
      ["Tapioca de queijo coalho", "Tapioca fresca com queijo coalho e orégano.", 1300],
    ],
  },
  {
    category: "Bebidas",
    products: [
      ["Café expresso", "Grãos 100% arábica, 50 ml.", 500],
      ["Suco de laranja", "Natural, feito na hora. 300 ml.", 900],
      ["Refrigerante lata", "350 ml. Informe o sabor na observação.", 650],
      ["Água mineral", "500 ml, com ou sem gás.", 400],
    ],
  },
  {
    category: "Doces",
    products: [
      ["Brigadeiro", "Chocolate belga, unidade.", 450],
      ["Bolo de cenoura", "Fatia com cobertura de chocolate.", 850, 10],
      ["Pudim de leite", "Receita caseira, fatia.", 900],
    ],
  },
];

async function main() {
  // 1) Configurações (horário amplo e todos os dias, para facilitar os testes;
  //    ajuste depois em Painel → Configurações).
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      cantinaName: "Cantina",
      openTime: "06:00",
      closeTime: "23:00",
      openDays: "0,1,2,3,4,5,6",
      pixKey: DEMO_PIX_KEY,
    },
  });

  // 2) Admin, a partir das variáveis de ambiente.
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          name: process.env.ADMIN_NAME || "Cantina",
          email,
          role: "ADMIN",
          passwordHash: await bcrypt.hash(password, 12),
        },
      });
      console.log(`Admin criado: ${email}`);
    }
  } else {
    console.log("ADMIN_EMAIL/ADMIN_PASSWORD não definidos: nenhum admin criado.");
  }

  // 3) Produtos de exemplo, somente se o cardápio estiver vazio.
  if (process.env.SEED_SAMPLE_DATA !== "false" && (await prisma.category.count()) === 0) {
    for (const [ci, group] of SAMPLE.entries()) {
      await prisma.category.create({
        data: {
          name: group.category,
          sortOrder: ci,
          products: {
            create: group.products.map(([name, description, priceCents, stock], pi) => ({
              name,
              description,
              priceCents,
              sortOrder: pi,
              trackStock: stock !== undefined,
              stock: stock ?? 0,
            })),
          },
        },
      });
    }
    console.log("Produtos de exemplo criados.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

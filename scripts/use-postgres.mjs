// Troca o provider do Prisma de SQLite para PostgreSQL.
// É executado automaticamente pelo "npm run vercel-build" em produção.
// Para voltar ao SQLite localmente: git checkout prisma/schema.prisma
import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("../prisma/schema.prisma", import.meta.url);
let schema = readFileSync(file, "utf8");

// Conexão direta (sem pooler) para o "db push", quando o provedor oferece uma.
const directVar = ["DIRECT_URL", "DATABASE_URL_UNPOOLED"].find((v) => process.env[v]);
const directLine = directVar ? `\n  directUrl = env("${directVar}")` : "";

schema = schema.replace(
  /datasource db \{[^}]*\}/,
  `datasource db {\n  provider  = "postgresql"\n  url       = env("DATABASE_URL")${directLine}\n}`,
);
writeFileSync(file, schema);
console.log("prisma/schema.prisma configurado para PostgreSQL");

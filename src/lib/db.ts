import { PrismaClient } from "@prisma/client";

// Em desenvolvimento o hot-reload recriaria o cliente a cada alteração;
// guardamos uma única instância no escopo global.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

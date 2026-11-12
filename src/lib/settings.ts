import { prisma } from "./db";

/** Lê as configurações da cantina (cria a linha padrão se ainda não existir). */
export async function getSettings() {
  return prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

export type CantinaSettings = Awaited<ReturnType<typeof getSettings>>;

export const parseOpenDays = (openDays: string) =>
  openDays
    .split(",")
    .filter(Boolean)
    .map(Number);

import { getSettings, parseOpenDays } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata = { title: "Configurações · Painel" };

export default async function SettingsPage() {
  const { id: _id, openDays, ...settings } = await getSettings();
  return <SettingsForm initial={{ ...settings, openDays: parseOpenDays(openDays) }} />;
}

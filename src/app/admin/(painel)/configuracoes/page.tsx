import { getSettings } from "@/lib/settings";
import { parseClosedDates, parseSchedule } from "@/lib/schedule";
import { localInfo } from "@/lib/time";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata = { title: "Configurações · Painel" };

export default async function SettingsPage() {
  const { id: _id, schedule, closedDates, ...settings } = await getSettings();
  const today = localInfo().date;
  return (
    <SettingsForm
      today={today}
      initial={{
        ...settings,
        schedule: parseSchedule(schedule),
        // Datas que já passaram não aparecem mais na lista.
        closedDates: parseClosedDates(closedDates).filter((d) => d >= today),
      }}
    />
  );
}

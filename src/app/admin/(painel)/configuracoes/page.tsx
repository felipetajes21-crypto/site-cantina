import { getSettings } from "@/lib/settings";
import { parseClosedDates, parseSchedule } from "@/lib/schedule";
import { localInfo } from "@/lib/time";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getPaymentProvider, providerOptions } from "@/lib/payments";

export const metadata = { title: "Configurações · Painel" };

export default async function SettingsPage() {
  const all = await getSettings();
  const { id: _id, schedule, closedDates, ...settings } = all;
  const today = localInfo().date;
  return (
    <SettingsForm
      today={today}
      payments={{ options: providerOptions(), active: getPaymentProvider(all).id }}
      initial={{
        ...settings,
        paymentProvider: settings.paymentProvider || getPaymentProvider(all).id,
        schedule: parseSchedule(schedule),
        // Datas que já passaram não aparecem mais na lista.
        closedDates: parseClosedDates(closedDates).filter((d) => d >= today),
      }}
    />
  );
}

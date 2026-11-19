import { getSettings } from "@/lib/settings";
import { parseClosedDates, parseSchedule } from "@/lib/schedule";
import { localInfo } from "@/lib/time";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { activePaymentProvider, providerOptions } from "@/lib/payments";

export const metadata = { title: "Configurações · Painel" };

export default async function SettingsPage() {
  const all = await getSettings();
  // Campos de Pix antigos ficam no banco, mas não são mais usados.
  const { id: _id, schedule, closedDates, pixKey: _k, pixMerchantName: _m, pixCity: _c, ...settings } = all;
  const today = localInfo().date;
  return (
    <SettingsForm
      today={today}
      payments={{ options: providerOptions(), active: activePaymentProvider(all)?.id ?? "" }}
      initial={{
        ...settings,
        paymentProvider: settings.paymentProvider || activePaymentProvider(all)?.id || "",
        schedule: parseSchedule(schedule),
        // Datas que já passaram não aparecem mais na lista.
        closedDates: parseClosedDates(closedDates).filter((d) => d >= today),
      }}
    />
  );
}

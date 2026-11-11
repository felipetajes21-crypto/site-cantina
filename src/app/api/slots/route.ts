import { handle, ok } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { getAvailability } from "@/lib/slots";

export const dynamic = "force-dynamic";

export const GET = handle(async () => ok(await getAvailability(await getSettings())));

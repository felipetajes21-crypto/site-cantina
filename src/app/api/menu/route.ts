import { handle, ok } from "@/lib/api";
import { getMenu } from "@/lib/menu";

export const dynamic = "force-dynamic";

export const GET = handle(async () => ok({ categories: await getMenu() }));

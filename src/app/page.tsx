import { AdminApp } from "@/components/admin-app";
import { listDisplays } from "@/lib/display/registry";
import { defaultDisplayStore } from "@/lib/display/store";
import { defaultTapStore } from "@/lib/tap-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [menu, display] = await Promise.all([
    defaultTapStore.load(),
    defaultDisplayStore.load(),
  ]);
  return (
    <AdminApp
      initialTitle={menu.title}
      initialSubtitle={menu.subtitle}
      initialTaps={menu.taps}
      initialDisplay={display}
      displays={listDisplays().map((adapter) => adapter.manifest)}
    />
  );
}

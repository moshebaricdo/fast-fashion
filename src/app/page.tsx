import { OutfitBuilder } from "@/components/OutfitBuilder/OutfitBuilder";
import { FLOATING_NAV_INSET } from "@/lib/navLayout";

export default function Home() {
  return (
    <div
      className="flex min-w-0 flex-col overflow-hidden overscroll-none"
      style={{
        height: "100dvh",
        maxHeight: "100dvh",
        // Overlap layout `main` bottom padding so content can extend under the nav
        marginBottom: `calc(-1 * (${FLOATING_NAV_INSET}))`,
      }}
    >
      <OutfitBuilder />
    </div>
  );
}

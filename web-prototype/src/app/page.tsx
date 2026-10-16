import { OutfitBuilder } from "@/components/OutfitBuilder/OutfitBuilder";

export default function Home() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden overscroll-none">
      <OutfitBuilder />
    </div>
  );
}

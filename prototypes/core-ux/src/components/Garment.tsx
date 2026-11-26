import type { Item } from "../engine/types";

function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const mix = (channel: number) => Math.max(0, Math.min(255, Math.round(channel * (1 - amount))));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function light(hex: string): boolean {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 214;
}

export function Garment({ item }: { item: Item }) {
  const fill = item.colors[0]?.hex ?? "#C8C2B8";
  const second = item.colors[1]?.hex ?? shade(fill, 0.28);
  const ink = shade(fill, light(fill) ? 0.18 : 0.3);
  const id = `g-${item.id}`;
  return (
    <svg viewBox="0 0 120 120" className="garment" aria-hidden>
      <GarmentShape item={item} fill={fill} second={second} ink={ink} clip={id} />
    </svg>
  );
}

function GarmentShape({
  item,
  fill,
  second,
  ink,
  clip,
}: {
  item: Item;
  fill: string;
  second: string;
  ink: string;
  clip: string;
}) {
  const stroke = light(fill) ? shade(fill, 0.16) : "none";
  const common = { fill, stroke, strokeWidth: stroke === "none" ? 0 : 1.4 };
  switch (item.silhouette) {
    case "oxford":
    case "camp":
      return (
        <g>
          <path {...common} d="M36 30 24 40 18 62 32 66 36 48 40 96h40l4-48 4 18 14-4-6-22-12-10c-6 8-28 8-40 0Z" />
          <path d="M46 32c4 8 24 8 28 0" fill="none" stroke={ink} strokeWidth="2" />
          <path d="M60 40v48" stroke={ink} strokeWidth="1.4" />
          {item.pattern === "print" && (
            <g fill={second}>
              <circle cx="48" cy="58" r="2.2" />
              <circle cx="70" cy="64" r="2.2" />
              <circle cx="56" cy="74" r="1.8" />
              <circle cx="74" cy="80" r="1.6" />
            </g>
          )}
        </g>
      );
    case "knit":
      return (
        <g>
          <path {...common} d="M40 32c-8 6-16 10-20 18l8 8 8-10v46h48V48l8 10 8-8c-4-8-12-12-20-18-6 8-24 8-40 0Z" />
          <path d="M44 94h32" stroke={ink} strokeWidth="3" strokeLinecap="round" />
          <path d="M52 36c4 6 12 6 16 0" fill="none" stroke={ink} strokeWidth="2" />
        </g>
      );
    case "polo":
      return (
        <g>
          <path {...common} d="M38 34 26 44 20 64 34 68 38 50v44h44V50l4 18 14-4-6-20-12-10c-4 7-22 8-32 0Z" />
          <path d="M48 34c2 8 22 8 24 0 0 6-24 8-24 0Z" fill={ink} />
        </g>
      );
    case "overshirt":
      return (
        <g>
          <path {...common} d="M34 28 22 40 16 66 32 70 36 48v50h48V48l4 22 16-4-6-26-12-12c-6 8-30 8-40 0Z" />
          <rect x="44" y="56" width="12" height="10" rx="1.5" fill={ink} opacity="0.55" />
          <rect x="64" y="56" width="12" height="10" rx="1.5" fill={ink} opacity="0.55" />
          <path d="M60 42v52" stroke={second} strokeWidth="1.5" />
        </g>
      );
    case "quarterzip":
      return (
        <g>
          <path {...common} d="M40 26h40l8 14-6 10v48H38V50l-6-10 8-14Z" />
          <path d="M52 26v16h16V26" fill={ink} />
          <path d="M60 42v18" stroke={second} strokeWidth="2" />
        </g>
      );
    case "tee":
      return (
        <g>
          <defs>
            <clipPath id={clip}>
              <path d="M38 32 26 42 20 62 34 66 38 48v46h44V48l4 18 14-4-6-20-12-10c-6 8-26 8-36 0Z" />
            </clipPath>
          </defs>
          <path {...common} d="M38 32 26 42 20 62 34 66 38 48v46h44V48l4 18 14-4-6-20-12-10c-6 8-26 8-36 0Z" />
          {item.pattern === "stripe" && (
            <g clipPath={`url(#${clip})`} stroke={second} strokeWidth="4">
              <path d="M18 50h84M18 62h84M18 74h84M18 86h84" />
            </g>
          )}
        </g>
      );
    case "trousers":
      return (
        <path
          {...common}
          d="M40 18h40l2 10-4 78H62l-2-46-2 46H42L38 28l2-10Z"
        />
      );
    case "shorts":
      return <path {...common} d="M40 28h40l2 8-6 36H64l-4-20-4 20H44L38 36l2-8Z" />;
    case "dress":
      return (
        <path
          {...common}
          d="M46 24h28l6 12-4 8 16 62H28L44 44l-4-8 6-12Z"
        />
      );
    case "jumpsuit":
      return (
        <path {...common} d="M42 20h36l6 12-2 18 8 58H66l-4-36h-4l-4 36H30l8-58-2-18 6-12Z" />
      );
    case "sneaker":
      return (
        <g>
          <path {...common} d="M18 70c8-16 22-22 36-18 8 2 16 0 28 6 6 3 12 10 12 16H22c-6 0-10-2-4-4Z" />
          <path d="M22 74h78" stroke={ink} strokeWidth="4" strokeLinecap="round" />
          <path d="M46 58c6 4 16 4 24-2" fill="none" stroke={ink} strokeWidth="2" />
        </g>
      );
    case "loafer":
      return (
        <g>
          <path {...common} d="M22 72c6-14 18-20 32-16 10 2 20 0 32 8 4 8 2 14-4 14H26c-6 0-8-2-4-6Z" />
          <path d="M48 62h16" stroke={ink} strokeWidth="3" strokeLinecap="round" />
          <path d="M24 78h74" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case "derby":
      return (
        <g>
          <path {...common} d="M28 74c4-22 16-32 28-28 12 2 22 2 30 12 4 6 8 16 6 20H30c-4 0-6-2-2-4Z" />
          <path d="M46 52l4 16M58 50l2 18" stroke={ink} strokeWidth="1.6" />
          <path d="M28 80h70" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case "boot":
      return (
        <g>
          <path {...common} d="M34 40h28l4 8 10 28c6 4 14 8 16 14H28c0-8 6-10 8-16l6-26-8-8Z" />
          <path d="M36 52h26" stroke={ink} strokeWidth="2" />
          <path d="M28 90h64" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case "chelsea":
      return (
        <g>
          <path {...common} d="M30 48h34l6 10 12 22c4 4 10 8 8 12H26c-2-6 4-8 6-14l8-22V48Z" />
          <path d="M40 58h10" stroke={second} strokeWidth="4" strokeLinecap="round" />
          <path d="M26 92h68" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case "runner":
      return (
        <g>
          <path {...common} d="M16 68c10-16 24-20 40-14 12 4 22 2 34 8l6 10H24c-8 0-12-2-8-4Z" />
          <path d="M18 78h86c-2 6-10 8-86 4 2-2 2-4 0-4Z" fill={ink} />
        </g>
      );
    case "jacket":
      return (
        <g>
          <path {...common} d="M34 26 20 40 16 70 32 74 36 52v40h48V52l4 22 16-4-4-30-14-14c-6 8-32 8-40 0Z" />
          <path d="M60 40v48" stroke={ink} strokeWidth="1.6" />
        </g>
      );
    case "coat":
      return (
        <g>
          <path {...common} d="M38 20 24 34 20 78 34 80 36 48v52h48V48l2 32 14-2-4-44-14-14c-6 8-28 8-36 0Z" />
          <path d="M52 24c4 8 12 8 16 0" fill="none" stroke={ink} strokeWidth="2" />
          <path d="M60 36v60" stroke={ink} strokeWidth="1.5" />
        </g>
      );
    case "hoodie":
      return (
        <g>
          <path {...common} d="M40 34c-10 4-16 12-18 20l10 6 6-8v42h44V52l6 8 10-6c-2-8-8-16-18-20-4 10-28 10-40 0Z" />
          <path d="M46 28c4 10 24 10 28 0 0 8-28 12-28 0Z" fill={ink} />
        </g>
      );
    case "puffer":
      return (
        <g>
          <path {...common} d="M36 28h48l8 12v58H28V40l8-12Z" />
          <path d="M30 48h60M30 62h60M30 76h60" stroke={second} strokeWidth="2" />
        </g>
      );
    case "shell":
      return (
        <g>
          <path {...common} d="M38 30 26 42 24 72 36 70 40 52v36h40V52l4 18 12 2-2-30-12-12c-4 6-24 6-32 0Z" />
          <path d="M58 36v40" stroke={second} strokeWidth="1.4" />
        </g>
      );
    default:
      return <rect x="34" y="28" width="52" height="64" rx="8" fill={fill} />;
  }
}

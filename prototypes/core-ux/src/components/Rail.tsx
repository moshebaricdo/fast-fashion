import { useDrag } from "@use-gesture/react";
import { motion } from "framer-motion";
import { useState } from "react";
import type { Item } from "../engine/types";
import { spring } from "../ui";
import { Garment } from "./Garment";

export function Rail({
  title,
  items,
  onPick,
  onClose,
}: {
  title: string;
  items: Item[];
  onPick: (item: Item) => void;
  onClose: () => void;
}) {
  const [x, setX] = useState(0);
  const bind = useDrag(
    ({ first, last, movement: [mx], memo }) => {
      if (first) memo = x;
      const next = Math.min(0, (memo as number) + mx);
      setX(next);
      if (last && Math.abs(mx) < 6) return memo;
      return memo;
    },
    { axis: "x", filterTaps: true },
  );

  return (
    <div className="scrim" onPointerDown={onClose} data-gesture-stop data-testid="rail">
      <motion.div
        className="sheet"
        initial={{ y: 280 }}
        animate={{ y: 0 }}
        exit={{ y: 280 }}
        transition={spring}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="grabber" />
        <p className="sheet-title">{title}</p>
        <div className="rail-clip" {...bind()}>
          <div className="rail-track" style={{ transform: `translateX(${x}px)` }}>
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="rail-card"
                data-testid={index === 0 ? "rail-first" : undefined}
                onClick={() => onPick(item)}
              >
                <span className="well">
                  <Garment item={item} />
                </span>
                <span className="rail-name">{item.short}</span>
                {index === 0 && <em>Next best</em>}
              </button>
            ))}
            {items.length === 0 && <p className="empty-rail">Nothing else fits this outfit.</p>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

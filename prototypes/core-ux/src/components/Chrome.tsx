import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function StatusBar({ backTo }: { backTo?: string }) {
  return (
    <header className="status">
      {backTo ? (
        <Link to={backTo} className="back" aria-label="All concepts" data-gesture-stop>
          <Chevron />
        </Link>
      ) : (
        <span className="status-time">9:41</span>
      )}
      {backTo && <span className="status-time centered">9:41</span>}
      <span className="status-icons" aria-hidden>
        <svg viewBox="0 0 18 12" width="17" height="12">
          <rect x="0" y="7" width="3" height="5" rx="0.6" fill="currentColor" />
          <rect x="5" y="4.5" width="3" height="7.5" rx="0.6" fill="currentColor" />
          <rect x="10" y="2" width="3" height="10" rx="0.6" fill="currentColor" />
          <rect x="15" y="0" width="3" height="12" rx="0.6" fill="currentColor" />
        </svg>
        <svg viewBox="0 0 25 12" width="25" height="12">
          <rect x="0.6" y="0.6" width="21" height="10.8" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <rect x="2" y="2" width="16" height="8" rx="1.2" fill="currentColor" />
          <rect x="22.4" y="3.6" width="1.6" height="4.8" rx="0.6" fill="currentColor" />
        </svg>
      </span>
    </header>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden>
      <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Dots({ count, index }: { count: number; index: number }) {
  return (
    <div className="dots" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <i key={i} className={i === index ? "on" : ""} />
      ))}
    </div>
  );
}

export function TabStandIn() {
  const tabs = [
    { id: "outfit", label: "Outfit", active: true },
    { id: "wardrobe", label: "Wardrobe", active: false },
    { id: "saved", label: "Saved", active: false },
  ];
  return (
    <nav className="tabbar" aria-hidden>
      {tabs.map((tab) => (
        <span key={tab.id} className={tab.active ? "active" : ""}>
          <i />
          {tab.label}
        </span>
      ))}
    </nav>
  );
}

export function HomeBar() {
  return <div className="homebar" aria-hidden />;
}

export function WeatherMark() {
  return <p className="weather-mark"> Weather</p>;
}

export function HeartButton({ saved, onClick }: { saved: boolean; onClick: () => void }) {
  return (
    <button type="button" className={saved ? "heart on" : "heart"} onClick={onClick} aria-label={saved ? "Saved" : "Save outfit"} data-gesture-stop>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path
          d="M12 19s-7-4.4-7-8.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 2.5C19 14.6 12 19 12 19Z"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function SaveButton({ saved, onClick, label = "Save" }: { saved: boolean; onClick: () => void; label?: string }) {
  return (
    <button type="button" className="save" onClick={onClick} data-gesture-stop data-testid="save">
      {saved ? "Saved" : label}
    </button>
  );
}

export function Toast({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="toast" role="status" data-testid="toast" data-gesture-stop>
      <p>{title}</p>
      <div className="collection">
        <i />
        <span>Everyday</span>
        {detail && <em>{detail}</em>}
      </div>
    </div>
  );
}

export function Eyebrow({ children, tone }: { children: ReactNode; tone?: "olive" | "plain" }) {
  return <p className={tone === "olive" ? "eyebrow olive" : "eyebrow"}>{children}</p>;
}

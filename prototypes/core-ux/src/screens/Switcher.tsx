import { Link, useSearchParams } from "react-router-dom";
import { HomeBar, StatusBar, TabStandIn } from "../components/Chrome";

const CONCEPTS = [
  {
    to: "/edition",
    kicker: "A · Curated",
    title: "Daily Edition",
    body: "Four prepared looks. Swipe between them, drag up or down to dress them up or down, tap a piece to change it.",
  },
  {
    to: "/orbit",
    kicker: "C · One piece",
    title: "Anchor & Orbit",
    body: "The day starts from one under-used piece. Turn the dial from easy to sharp. Swipe the piece to change it.",
  },
  {
    to: "/reels",
    kicker: "B · Direct",
    title: "Smart Reels",
    body: "Each row is the next good option for the others. Swipe a row, long-press to pin, pull down to respin.",
  },
] as const;

export function Switcher() {
  const [params] = useSearchParams();
  const keep = (path: string, extra?: Record<string, string>) => {
    const query = new URLSearchParams();
    const seed = params.get("seed");
    const debug = params.get("debug");
    if (seed) query.set("seed", seed);
    if (debug) query.set("debug", debug);
    if (extra) {
      for (const [key, value] of Object.entries(extra)) query.set(key, value);
    }
    const text = query.toString();
    return text ? `${path}?${text}` : path;
  };

  return (
    <div className="screen switcher">
      <StatusBar />
      <div className="switcher-body">
        <p className="eyebrow">FastFashion</p>
        <h1>Today's outfit, three ways</h1>
        <p className="lede">A sample wardrobe of 36 pieces. Nothing to fill in. Try the gesture each idea is built on.</p>
        <div className="concept-list">
          {CONCEPTS.map((concept) => (
            <Link key={concept.to} to={keep(concept.to)} className="concept">
              <span className="concept-kicker">{concept.kicker}</span>
              <strong>{concept.title}</strong>
              <span>{concept.body}</span>
            </Link>
          ))}
          <Link to={keep("/reels", { baseline: "1" })} className="concept quiet">
            <span className="concept-kicker">Baseline</span>
            <strong>Random reels</strong>
            <span>Unconditioned shuffles and Casual / Formal / Athletic chips, for comparison.</span>
          </Link>
        </div>
      </div>
      <TabStandIn />
      <HomeBar />
    </div>
  );
}

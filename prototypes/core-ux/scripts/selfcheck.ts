import { DEAD_IDS, WARDROBE } from "../src/data/wardrobe";
import { generateEdition, hardOk, makeContext, suggestOutfit, anchorCandidates, completions, alternatives, variantOutfit, outfitItems } from "../src/engine/generate";
import { countNovelPairs, outfitBlocked, seedHistory } from "../src/engine/history";
import { lineOk } from "../src/engine/explain";
import { RECENCY_DAYS } from "../src/engine/types";

const history = seedHistory();
const problems: string[] = [];
const fail = (msg: string) => problems.push(msg);

if (WARDROBE.length !== 36) fail(`wardrobe ${WARDROBE.length}`);
for (const id of DEAD_IDS) {
  if ((history.itemShown[id] ?? 0) !== 0) fail(`${id} was shown`);
}
const shown = history.shown.length;
if (shown < 36 || shown > 46) fail(`shown count ${shown}`);
const saves = history.shown.filter((s) => s.saved);
if (saves.length !== 6) fail(`saves ${saves.length}`);
const rustSaves = saves.filter((s) => s.ids.includes("rust") && s.ids.includes("jeans"));
if (rustSaves.length !== 2) fail(`rust saves ${rustSaves.length}`);

const today = 0;
const recent = history.shown.filter((s) => today - s.day <= RECENCY_DAYS && today - s.day >= 0);
const sigs = new Set(recent.map((s) => s.signature));
if (sigs.size !== recent.length) fail("duplicate recent outfits");

const ctx = makeContext("thu", 0, 0.45);
const edition = generateEdition(history, ctx, "fastfashion");
console.log("\nTHU edition");
for (const look of edition) {
  const names = outfitItems(look.outfit).map((i) => i.short).join(" · ");
  console.log(`- ${look.outfit.angle} | ${look.eyebrow} | ${look.headline}`);
  console.log(`  ${names}`);
  console.log(`  ${look.line} (${look.line.length}) novel=${look.outfit.novelPairs}`);
  if (!lineOk(look.line)) fail(`line length ${look.line}`);
  if (!hardOk(outfitItems(look.outfit))) fail(`hard fail ${look.headline}`);
  if (outfitBlocked(history, look.outfit.ids, 0)) fail(`blocked outfit ${names}`);
  if (countNovelPairs(history, look.outfit.ids) > 2) fail(`novel budget ${names}`);
}
if (edition.length < 4) fail(`edition length ${edition.length}`);
const angles = edition.map((l) => l.outfit.angle);
for (const angle of ["safe", "novel", "rediscover", "weather"]) {
  if (!angles.includes(angle as never)) fail(`missing ${angle}`);
}
for (let i = 0; i < edition.length; i++) {
  for (let j = i + 1; j < edition.length; j++) {
    const a = new Set(edition[i].outfit.ids);
    const share = edition[j].outfit.ids.filter((id) => a.has(id)).length;
    if (share > 1) fail(`diversity ${edition[i].headline} / ${edition[j].headline} share ${share}`);
  }
}

const safe = edition.find((l) => l.outfit.angle === "safe");
if (safe && safe.outfit.ids.some((id) => ["oxford", "navy-knit", "grey-tee", "white-tee"].includes(id))) {
  console.log("note: safe look uses a shirt from the 4-day window");
}

const novel = edition.find((l) => l.outfit.angle === "novel");
if (novel && novel.outfit.novelPairs !== 1) fail("novel angle pair count");

const anchors = anchorCandidates(ctx, history, "fastfashion");
console.log("\nanchors", anchors.map((a) => a.short).join(", "));
if (!anchors.some((a) => a.id === "rust")) fail("rust not an anchor candidate");
if (anchors[0]?.id !== "rust") console.log("note: rust is not the default anchor");

if (anchors[0]) {
  const comps = completions(anchors[0], ctx, history, "fastfashion");
  console.log("completions", comps.length);
  for (let i = 1; i < comps.length; i++) {
    const prev = comps[i - 1].ids.reduce((s, id) => s + (WARDROBE.find((w) => w.id === id)?.formality ?? 0), 0);
    const cur = comps[i].ids.reduce((s, id) => s + (WARDROBE.find((w) => w.id === id)?.formality ?? 0), 0);
    if (cur + 0.01 < prev) fail("completions not sorted");
  }
  if (comps.length < 3) fail("too few completions");
}

const open = suggestOutfit(history, ctx, "fastfashion");
if (!open) fail("no opening outfit");
else {
  console.log("\nopen", outfitItems(open).map((i) => i.short).join(" · "));
  const shoes = alternatives("shoes", outfitItems(open), ctx, history, "fastfashion", 8);
  console.log("shoe alts", shoes.map((s) => s.short).join(", "));
  if (shoes.some((s) => s.id === open.bySlot.shoes?.id)) fail("alt includes current");
  if (shoes.length < 3) fail("too few alts");
  const dressier = variantOutfit(open, 1, ctx, history, "fastfashion");
  console.log("dressier", dressier ? outfitItems(dressier).map((i) => i.short).join(" · ") : "none");
  console.log("dressier line", dressier?.reasons[0]?.text);
}

const sat = makeContext("sat", 0, 0.45);
const satEd = generateEdition(history, sat, "fastfashion");
console.log("\nSAT", satEd.map((l) => l.outfit.angle).join(", "));
if (!satEd.some((l) => l.outfit.angle === "remix")) fail("saturday missing remix");

const wed = makeContext("wed", 0, 0.45);
if (wed.outer !== "required") fail("wednesday outer");
const mon = makeContext("mon", 0, 0.45);
if (mon.outer !== "none") fail(`monday outer ${mon.outer}`);

// Next-day recency: an item shown today should be penalised tomorrow and the outfit blocked.
console.log("\nshown outfits", shown, "recent", recent.length);
if (problems.length) {
  console.error("\nFAILED");
  for (const p of problems) console.error(" -", p);
  process.exit(1);
}
console.log("\nselfcheck ok");

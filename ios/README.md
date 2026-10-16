# FastFashion for iOS

Native iOS outfit planner: a wardrobe catalog plus a daily outfit built by guardrailed
randomness. SwiftUI, iOS 26, SwiftData behind a repository layer (CloudKit sync later).

This is Milestone 0 plus the core of the outfit engine. The UI is deliberately bare until the
Figma designs land.

## Layout

```
ios/
├── project.yml                  XcodeGen spec (the .xcodeproj is generated, not committed)
├── App/
│   ├── Sources/
│   │   ├── FastFashionApp.swift Entry point, tab root, onboarding gate
│   │   ├── Support/             AppEnvironment (DI root), shown-log store, weather stub
│   │   └── Screens/             Today, Catalog, Saved, Onboarding (placeholder UI)
│   └── Resources/               Asset catalog
└── Packages/
    ├── OutfitEngine/            Pure Swift (Foundation only). Builds and tests on Linux.
    │   ├── Sources/WardrobeCore Taxonomy, domain values, repository protocols,
    │   │                        in-memory repositories, sample wardrobe
    │   ├── Sources/OutfitEngine Hard filters, soft scoring, seeded sampling
    │   └── Tests/               Swift Testing suites for both modules
    └── FastFashionKit/          Apple-only modules
        ├── Sources/Persistence  SwiftData schema (V1), model-actor repositories
        └── Tests/               In-memory SwiftData tests
```

Dependencies point one way: `App → FastFashionKit → OutfitEngine`. Features talk to the
repository protocols in `WardrobeCore` and only ever receive plain value types, never SwiftData
objects, so the storage backend can change without touching features.

## Build on a Mac

Requirements: Xcode 26 (Swift 6.2) and [XcodeGen](https://github.com/yonaskolb/XcodeGen).

```bash
brew install xcodegen
cd ios
xcodegen generate
open FastFashion.xcodeproj
```

Run the `FastFashion` scheme on an iOS 26 simulator. To run on a device, set your team in
Signing & Capabilities (or `DEVELOPMENT_TEAM` in `project.yml`). Run `xcodegen generate` again
whenever you add or remove files or edit `project.yml`.

Command-line build and test:

```bash
cd ios
xcodebuild -scheme FastFashion -destination 'platform=iOS Simulator,name=iPhone 17' build
xcodebuild -scheme FastFashion -destination 'platform=iOS Simulator,name=iPhone 17' test
```

The scheme's test action runs every package test target, including the SwiftData tests, which
need an Apple platform. You can also test the packages directly:

```bash
cd ios/Packages/FastFashionKit && swift test   # macOS 26 host
```

## Run the engine tests (macOS or Linux)

```bash
cd ios/Packages/OutfitEngine
swift test
```

On Linux, install a Swift 6.2+ toolchain with [swiftly](https://www.swift.org/install/linux/).
CI runs these tests on Linux for every push and pull request.

## How the engine works

`OutfitEngine.suggest(wardrobe:context:history:locked:seed:)` is a pure function. The same
inputs and seed always give the same outfit.

1. **Slots.** Shoes plus a base, which is either a top and a bottom or one one-piece garment
   (dress, jumpsuit, romper) filling both. An outer layer is added depending on the weather.
   `Outfit.Base` makes "dress plus skirt" impossible to represent.
2. **Hard filters.** These remove items that aren't available (laundry, archived, deleted),
   items outside the mode's formality band ±1 (formal 4–5, casual 2–3, sporty 1–2 and
   athletic; "any" centers on the wardrobe's median), and items whose warmth doesn't match the
   forecast. If a category ends up empty, its filters relax step by step (warmth, then a wider
   band, then mode), and each relaxation is reported. Pairwise rules: formality spread ≤ 2, at
   most two bold patterns, never graphic with print, at most two accent color families.
3. **Soft scores.** Color harmony over color families (neutrals, monochrome, a 12-step wheel,
   and a small clash list), an accent rule, formality coherence (shoes count double), weather
   fit (warmth and rain handling), recently shown items and top+bottom pairs, a variety bonus,
   favorites, and pattern penalties. All weights and thresholds live in `EngineConfig`.
4. **Sampling.** The engine builds 40 candidates by weighted sequential sampling (softmax,
   T = 0.35), drops outfits shown in the last 10 suggestions, and draws the result from the
   top 20%. It never just returns the single best outfit.

There is no wear tracking. The only history is a rolling log of the last 50 shown
suggestions, stored in `UserDefaults` on the device. Locks and per-slot rerolls are supported
(`locked:` and `reroll(_:slot:...)`). Each suggestion carries a `ScoreBreakdown` that the Today
screen shows under "Debug".

## Not built yet

Photo import and segmentation (M1), AI tagging and the proxy (M2), WeatherKit (M3; the app
currently passes no forecast), StoreKit (M6), CloudKit sync (post-launch), and all visual
design.

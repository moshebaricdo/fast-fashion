# FastFashion

An outfit planner built on top of a wardrobe app: catalog your clothes, then get a daily outfit
from guardrailed randomness. This repo holds the native iOS app and the earlier web prototype.

| Folder | What it is | Start here |
|---|---|---|
| [`ios/`](ios/) | Native iOS app (SwiftUI, iOS 26, SwiftData), generated with XcodeGen, plus the `OutfitEngine` and `FastFashionKit` Swift packages. Active development. | [ios/README.md](ios/README.md) |
| [`web-prototype/`](web-prototype/) | The original Next.js/TypeScript prototype, kept for reference. It will be cleaned out later. | [web-prototype/README.md](web-prototype/README.md) |

Quick commands:

```bash
# iOS app (on a Mac with Xcode 26 and XcodeGen)
cd ios && xcodegen generate && open FastFashion.xcodeproj

# Outfit engine tests (macOS or Linux, Swift 6.2+)
cd ios/Packages/OutfitEngine && swift test

# Web prototype
cd web-prototype && npm ci && npm run dev
```

CI: [`.github/workflows/outfit-engine.yml`](.github/workflows/outfit-engine.yml) runs the engine
tests on Linux whenever the package changes.

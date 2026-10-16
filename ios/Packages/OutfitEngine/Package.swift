// swift-tools-version: 6.2
import PackageDescription

// Pure Swift (Foundation only) so it builds and tests on Linux as well as Apple platforms.
let package = Package(
    name: "OutfitEngine",
    platforms: [.iOS(.v26), .macOS(.v26)],
    products: [
        .library(name: "WardrobeCore", targets: ["WardrobeCore"]),
        .library(name: "OutfitEngine", targets: ["OutfitEngine"]),
    ],
    targets: [
        .target(name: "WardrobeCore"),
        .target(name: "OutfitEngine", dependencies: ["WardrobeCore"]),
        .testTarget(name: "WardrobeCoreTests", dependencies: ["WardrobeCore"]),
        .testTarget(name: "OutfitEngineTests", dependencies: ["OutfitEngine", "WardrobeCore"]),
    ]
)

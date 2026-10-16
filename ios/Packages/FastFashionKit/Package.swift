// swift-tools-version: 6.2
import PackageDescription

// Apple-only modules (SwiftData and later Vision, WeatherKit, StoreKit). Build with Xcode 26.
let package = Package(
    name: "FastFashionKit",
    platforms: [.iOS(.v26), .macOS(.v26)],
    products: [
        .library(name: "Persistence", targets: ["Persistence"]),
    ],
    dependencies: [
        .package(path: "../OutfitEngine"),
    ],
    targets: [
        .target(
            name: "Persistence",
            dependencies: [.product(name: "WardrobeCore", package: "OutfitEngine")]
        ),
        .testTarget(name: "PersistenceTests", dependencies: ["Persistence"]),
    ]
)

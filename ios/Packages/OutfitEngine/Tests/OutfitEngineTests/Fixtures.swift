import Foundation
import Testing
@testable import OutfitEngine
@testable import WardrobeCore

enum Fixtures {
    nonisolated(unsafe) private static var counter = 10_000
    private static let lock = NSLock()

    /// A taxonomy-backed item with a fresh stable ID.
    static func item(
        _ key: String, _ families: ColorFamily..., pattern: WardrobeCore.Pattern = .solid,
        status: ItemStatus = .active, name: String? = nil
    ) -> WardrobeItem {
        let n = lock.withLock { counter += 1; return counter }
        let colors = families.enumerated().map { index, family in
            ItemColor(family: family, share: families.count == 1 ? 1 : (index == 0 ? 0.7 : 0.3 / Double(families.count - 1)))
        }
        return WardrobeItem(
            id: SampleWardrobe.id(n), name: name ?? "\(key) \(n)", subcategory: Taxonomy.subcategory(key)!,
            colors: colors, pattern: pattern, status: status
        )
    }

    static let modes = OutfitMode.allCases

    static let weathers: [WeatherInput?] = [
        nil,
        WeatherInput(feelsLikeHighC: 31, feelsLikeLowC: 23, precipitationChance: 0.05),  // hot
        WeatherInput(feelsLikeHighC: 23, feelsLikeLowC: 15, precipitationChance: 0.1),   // warm
        WeatherInput(feelsLikeHighC: 17, feelsLikeLowC: 10, precipitationChance: 0.1),   // cool
        WeatherInput(feelsLikeHighC: 4, feelsLikeLowC: -3, precipitationChance: 0.2),    // cold
        WeatherInput(feelsLikeHighC: 16, feelsLikeLowC: 11, precipitationChance: 0.8),   // cool + rain
        WeatherInput(feelsLikeHighC: 29, feelsLikeLowC: 22, precipitationChance: 0.7),   // hot + rain
    ]

    static var contexts: [SuggestionContext] {
        modes.flatMap { mode in weathers.map { SuggestionContext(mode: mode, weather: $0) } }
    }

    /// Six interchangeable neutral, solid, casual options per slot.
    static func balancedWardrobe() -> [WardrobeItem] {
        let neutrals: [ColorFamily] = [.white, .grey, .beige, .white, .grey, .beige]
        return neutrals.map { item("t_shirt", $0) }
            + neutrals.map { item("chinos", $0) }
            + neutrals.map { item("sneakers", $0) }
    }
}

/// Checks every hard rule the engine promises. Rules a reported relaxation explicitly loosened
/// are skipped for that role.
func expectInvariants(
    _ suggestion: OutfitSuggestion, wardrobe: [WardrobeItem], context: SuggestionContext,
    config: EngineConfig = .default, locked: [WardrobeItem] = [],
    sourceLocation: SourceLocation = #_sourceLocation
) {
    let outfit = suggestion.outfit
    let lockedIDs = Set(locked.map(\.id))
    let wardrobeIDs = Set(wardrobe.map(\.id))

    #expect(HardRules.violations(in: outfit.items, config: config).isEmpty, "\(outfit.items.map(\.name))", sourceLocation: sourceLocation)
    #expect(Set(outfit.items.map(\.id)).count == outfit.items.count, sourceLocation: sourceLocation)

    let band = FormalityBand.band(for: context.mode, wardrobe: wardrobe.filter(\.isAvailable))
    let target = WeatherRules.targetWarmth(context.weather, config: config)

    for (role, item) in outfit.pieces where !lockedIDs.contains(item.id) {
        #expect(wardrobeIDs.contains(item.id) && item.isAvailable, "\(item.name)", sourceLocation: sourceLocation)
        #expect(item.category == role, sourceLocation: sourceLocation)

        let ignoredMode = suggestion.relaxations.contains(.ignoredMode(role))
        let widened = suggestion.relaxations.contains(.widenedFormality(role))
        let ignoredWeather = suggestion.relaxations.contains(.ignoredWeather(role))

        if !ignoredMode {
            let tolerance = config.bandTolerance + (widened ? 1 : 0)
            #expect(band.widened(by: tolerance).contains(item.formality), "\(item.name) \(item.formality) vs \(band)", sourceLocation: sourceLocation)
            if context.mode == .sporty, role != .outer {
                #expect(item.hasStyle(.athletic), "\(item.name) in sporty mode", sourceLocation: sourceLocation)
            }
        }
        if let target, !ignoredWeather, !ignoredMode, !widened {
            switch role {
            case .bottom, .outer:
                #expect(abs(item.warmth - target) <= 1, "\(item.name) warmth \(item.warmth) target \(target)", sourceLocation: sourceLocation)
            case .shoes:
                #expect(abs(item.warmth - target) <= 2, "\(item.name)", sourceLocation: sourceLocation)
            case .top, .onePiece:
                #expect(item.warmth <= target + 1 && item.warmth >= target - 2, "\(item.name)", sourceLocation: sourceLocation)
            }
        }
    }

    switch WeatherRules.outerRule(context.weather, config: config) {
    case .required:
        if !suggestion.relaxations.contains(.noOuterLayerAvailable) {
            #expect(outfit.outer != nil, "cold weather needs an outer layer", sourceLocation: sourceLocation)
        }
    case .none:
        if !locked.contains(where: { $0.category == .outer }) {
            #expect(outfit.outer == nil, "no outer layer in warm, dry weather", sourceLocation: sourceLocation)
        }
    case .optional:
        break
    }
}

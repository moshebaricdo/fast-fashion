import Foundation
import WardrobeCore

/// Ways the engine loosened its filters to produce an outfit. Surfaced for the debug screen and
/// for UI hints such as "add athletic shoes for better sporty outfits".
public enum Relaxation: Hashable, Sendable {
    /// No item in this category matched the weather, so warmth was ignored for it.
    case ignoredWeather(GarmentCategory)
    /// The formality band was widened by one more step for this category.
    case widenedFormality(GarmentCategory)
    /// Mode (formality band and the sporty rule) was ignored for this category.
    case ignoredMode(GarmentCategory)
    /// The weather called for an outer layer but none was available.
    case noOuterLayerAvailable
}

/// The filters that decide which items are allowed at all. Scoring only ranks what passes here.
struct HardRules {
    let config: EngineConfig
    let mode: OutfitMode
    let band: FormalityBand
    let targetWarmth: Int?
    let outerPossible: Bool

    /// Relaxation levels, tried in order until a category has candidates.
    enum Level: Int, CaseIterable {
        case strict, noWeather, widerBand, noMode
    }

    func passes(_ item: WardrobeItem, as category: GarmentCategory, level: Level) -> Bool {
        guard item.isAvailable, item.category == category else { return false }
        if level.rawValue < Level.noMode.rawValue {
            let tolerance = config.bandTolerance + (level == .widerBand ? 1 : 0)
            guard band.widened(by: tolerance).contains(item.formality) else { return false }
            if mode == .sporty, category != .outer, !item.hasStyle(.athletic) { return false }
        }
        if level == .strict, let target = targetWarmth, !warmthOK(item.warmth, category: category, target: target) {
            return false
        }
        return true
    }

    private func warmthOK(_ warmth: Int, category: GarmentCategory, target: Int) -> Bool {
        switch category {
        case .top, .onePiece:
            // A lighter base layer is fine when a coat may go over it.
            let lower = target - (outerPossible ? 2 : 1)
            return (lower...(target + 1)).contains(warmth)
        case .bottom, .outer:
            return abs(warmth - target) <= 1
        case .shoes:
            return abs(warmth - target) <= 2
        }
    }

    /// Whether `item` can join the already-picked items without breaking a pairwise rule.
    func compatible(_ item: WardrobeItem, with picked: [WardrobeItem]) -> Bool {
        let all = picked + [item]
        return Self.violations(in: all, config: config).isEmpty
    }

    enum Violation: Hashable {
        case formalitySpread, tooManyPatterns, graphicWithPrint, twoGraphics, tooManyAccents
    }

    static func violations(in items: [WardrobeItem], config: EngineConfig) -> [Violation] {
        var result: [Violation] = []
        let formalities = items.map(\.formality)
        if let lo = formalities.min(), let hi = formalities.max(), hi - lo > config.maxFormalitySpread {
            result.append(.formalitySpread)
        }
        let bold = items.filter { $0.category != .shoes && $0.pattern.isBold }.map(\.pattern)
        if bold.count > config.maxBoldPatterns { result.append(.tooManyPatterns) }
        if bold.contains(.graphic), bold.contains(.print) { result.append(.graphicWithPrint) }
        if bold.filter({ $0 == .graphic }).count > 1 { result.append(.twoGraphics) }
        if ColorHarmony.accentFamilies(items).count > config.maxAccentFamilies { result.append(.tooManyAccents) }
        return result
    }
}

import Foundation
import WardrobeCore

/// Soft-score components for one item or a whole outfit. Positive components help, penalties
/// hurt; `total` applies the configured weights. Shown on the debug score-breakdown screen.
public struct ScoreBreakdown: Hashable, Sendable {
    /// −1…1
    public var color = 0.0
    /// 0…1, accents that clash or exceed one harmonious pair
    public var accentPenalty = 0.0
    /// −1…1, band distance and spread (shoes count double)
    public var formality = 0.0
    /// −1…1 for warmth distance, then −1…+1 for rain handling; 0 without a forecast
    public var weather = 0.0
    /// 0…~2, recently shown items and repeated top+bottom pairs
    public var recencyPenalty = 0.0
    /// 0…1, items rarely shown
    public var variety = 0.0
    /// 0…1
    public var favorite = 0.0
    /// 0…~1.3, multiple bold patterns
    public var patternPenalty = 0.0

    public var total = 0.0

    mutating func computeTotal(_ w: EngineConfig.Weights) {
        total = w.color * color - w.accent * accentPenalty + w.formality * formality
            + w.weather * weather - w.recency * recencyPenalty + w.variety * variety
            + w.favorite * favorite - w.pattern * patternPenalty
    }
}

struct Scorer {
    let config: EngineConfig
    let band: FormalityBand
    let targetWarmth: Int?
    let rainy: Bool
    let history: HistoryIndex

    /// Score for adding `item` (in `role`) to the already-picked items.
    func itemScore(_ item: WardrobeItem, role: GarmentCategory, picked: [Picked], includesOuter: Bool) -> Double {
        let others = picked.map(\.item)
        var b = ScoreBreakdown()
        b.color = others.isEmpty ? 0 : mean(others.map { ColorHarmony.itemScore(item, $0) })
        b.accentPenalty = ColorHarmony.accentPenalty(others + [item])
        b.formality = formalityFit(item, others: others)
        b.weather = weatherFit(item, role: role, includesOuter: includesOuter)
        b.recencyPenalty = history.recencyPenalty(item.id) + pairPenalty(adding: item, role: role, picked: picked)
        b.variety = history.varietyBonus(item.id)
        b.favorite = item.isFavorite ? 1 : 0
        b.patternPenalty = patternPenalty(others + [item])
        b.computeTotal(config.weights)
        return b.total
    }

    func outfitBreakdown(_ outfit: Outfit) -> ScoreBreakdown {
        let pieces = outfit.pieces
        let items = pieces.map(\.item)
        var b = ScoreBreakdown()
        var pairScores: [Double] = []
        for i in items.indices {
            for j in items.indices where j > i {
                pairScores.append(ColorHarmony.itemScore(items[i], items[j]))
            }
        }
        b.color = mean(pairScores)
        b.accentPenalty = ColorHarmony.accentPenalty(items)
        b.formality = mean(items.indices.map { i in
            formalityFit(items[i], others: items.enumerated().filter { $0.offset != i }.map(\.element))
        })
        b.weather = mean(pieces.map { weatherFit($0.item, role: $0.role, includesOuter: outfit.outer != nil) })
        b.recencyPenalty = mean(items.map { history.recencyPenalty($0.id) })
        if case let .separates(top, bottom) = outfit.base, history.pairShown(top: top.id, bottom: bottom.id) {
            b.recencyPenalty += config.pairRepeatPenalty
        }
        b.variety = mean(items.map { history.varietyBonus($0.id) })
        b.favorite = mean(items.map { $0.isFavorite ? 1 : 0 })
        b.patternPenalty = patternPenalty(items)
        b.computeTotal(config.weights)
        return b
    }

    /// 1 when inside the band and level with everything picked; falls with band distance and
    /// with formality gaps. Gaps involving shoes count double.
    func formalityFit(_ item: WardrobeItem, others: [WardrobeItem]) -> Double {
        var fit = 1 - 0.5 * Double(band.distance(to: item.formality))
        if !others.isEmpty {
            let gaps = others.map { other -> Double in
                let gap = Double(abs(item.formality - other.formality))
                return (item.category == .shoes || other.category == .shoes) ? gap * 2 : gap
            }
            fit -= 0.4 * mean(gaps)
        }
        return clamp(fit)
    }

    func weatherFit(_ item: WardrobeItem, role: GarmentCategory, includesOuter: Bool) -> Double {
        guard let target = targetWarmth else { return 0 }
        var itemTarget = target
        if includesOuter, role == .top || role == .onePiece { itemTarget = max(0, target - 1) }
        let warmthFit = clamp(1 - 0.6 * Double(abs(item.warmth - itemTarget)))
        guard rainy else { return warmthFit }
        // Applied after the clamp so a well-matched raincoat still beats a well-matched cardigan.
        var rainAdjustment = 0.0
        if item.isWaterResistant, role == .outer { rainAdjustment += 1.0 }
        if item.isWaterResistant, role == .shoes { rainAdjustment += 0.5 }
        if item.isRainSensitive { rainAdjustment -= 1.0 }
        return warmthFit + rainAdjustment
    }

    /// Two bold patterns (shoes excluded) is a heavy penalty; a bold shoe alongside a bold
    /// garment is a light one.
    func patternPenalty(_ items: [WardrobeItem]) -> Double {
        let garments = items.filter { $0.category != .shoes && $0.pattern.isBold }.count
        let boldShoes = items.contains { $0.category == .shoes && $0.pattern.isBold }
        var penalty = garments >= 2 ? Double(garments - 1) : 0
        if boldShoes, garments >= 1 { penalty += 0.3 }
        return penalty
    }

    private func pairPenalty(adding item: WardrobeItem, role: GarmentCategory, picked: [Picked]) -> Double {
        let counterpart: GarmentCategory
        switch role {
        case .top: counterpart = .bottom
        case .bottom: counterpart = .top
        default: return 0
        }
        guard let other = picked.first(where: { $0.role == counterpart })?.item else { return 0 }
        let shown = role == .top
            ? history.pairShown(top: item.id, bottom: other.id)
            : history.pairShown(top: other.id, bottom: item.id)
        return shown ? config.pairRepeatPenalty : 0
    }

    private func mean(_ values: [Double]) -> Double {
        values.isEmpty ? 0 : values.reduce(0, +) / Double(values.count)
    }

    private func clamp(_ value: Double) -> Double { min(1, max(-1, value)) }
}

struct Picked {
    let role: GarmentCategory
    let item: WardrobeItem
}

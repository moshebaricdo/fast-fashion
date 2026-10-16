import Foundation
import WardrobeCore

public enum SuggestionError: Error, Hashable, Sendable {
    public enum Requirement: String, Hashable, Sendable, CaseIterable {
        case shoes, top, bottom
    }

    case emptyWardrobe
    /// The wardrobe can't form an outfit, e.g. no shoes, or tops without bottoms or one-pieces.
    case missingPieces(Set<Requirement>)
    /// Two locked items fill the same slot.
    case conflictingLocks
    /// Every candidate broke a pairwise rule (formality spread, patterns, accents).
    case noValidCombination
}

public struct OutfitSuggestion: Hashable, Sendable {
    public var outfit: Outfit
    public var breakdown: ScoreBreakdown
    public var relaxations: [Relaxation]
    /// Distinct valid candidates the final pick was drawn from.
    public var candidatesConsidered: Int
}

/// Guardrailed randomness: hard filters decide what is allowed, soft scores weight a random pick,
/// and the result is sampled from the best of many candidates rather than taking the argmax.
///
/// A pure function of (wardrobe, context, history, locks, random source).
public struct OutfitEngine: Sendable {
    public var config: EngineConfig

    public init(config: EngineConfig = .default) {
        self.config = config
    }

    public func suggest(
        wardrobe: [WardrobeItem], context: SuggestionContext, history: SuggestionHistory = SuggestionHistory(),
        locked: [WardrobeItem] = [], seed: UInt64
    ) throws(SuggestionError) -> OutfitSuggestion {
        var rng = SplitMix64(seed: seed)
        return try suggest(wardrobe: wardrobe, context: context, history: history, locked: locked, using: &rng)
    }

    /// - Parameter locked: Items to keep (e.g. "keep this top, reroll the rest").
    public func suggest(
        wardrobe: [WardrobeItem], context: SuggestionContext, history: SuggestionHistory = SuggestionHistory(),
        locked: [WardrobeItem] = [], using rng: inout some RandomNumberGenerator
    ) throws(SuggestionError) -> OutfitSuggestion {
        try generate(
            wardrobe: wardrobe, context: context, history: history, locked: locked,
            excluded: [], outerOverride: nil, rng: &rng
        )
    }

    /// Replaces whatever fills `slot`, keeping the rest. Rerolling `.top` or `.bottom` on a one-piece
    /// outfit replaces the one-piece; rerolling `.outer` adds a layer if there wasn't one.
    public func reroll(
        _ outfit: Outfit, slot: Slot, wardrobe: [WardrobeItem], context: SuggestionContext,
        history: SuggestionHistory = SuggestionHistory(), seed: UInt64
    ) throws(SuggestionError) -> OutfitSuggestion {
        var rng = SplitMix64(seed: seed)
        return try reroll(outfit, slot: slot, wardrobe: wardrobe, context: context, history: history, using: &rng)
    }

    public func reroll(
        _ outfit: Outfit, slot: Slot, wardrobe: [WardrobeItem], context: SuggestionContext,
        history: SuggestionHistory = SuggestionHistory(), using rng: inout some RandomNumberGenerator
    ) throws(SuggestionError) -> OutfitSuggestion {
        let locked = outfit.items.filter { !$0.slots.contains(slot) }
        let excluded = Set(outfit.item(filling: slot).map { [$0.id] } ?? [])
        // Rerolling another slot must not add or drop a layer; a kept outer layer is locked.
        let outerOverride: OuterRule? = slot == .outer ? .required : (outfit.outer == nil ? OuterRule.none : nil)
        return try generate(
            wardrobe: wardrobe, context: context, history: history, locked: locked,
            excluded: excluded, outerOverride: outerOverride, rng: &rng
        )
    }

    // MARK: - Generation

    private enum Form { case separates, onePiece }

    private struct Candidate {
        let outfit: Outfit
        let key: String
        let breakdown: ScoreBreakdown
    }

    private func generate(
        wardrobe: [WardrobeItem], context: SuggestionContext, history: SuggestionHistory,
        locked: [WardrobeItem], excluded: Set<UUID>, outerOverride: OuterRule?, rng: inout some RandomNumberGenerator
    ) throws(SuggestionError) -> OutfitSuggestion {
        // Sorting makes the result independent of input order.
        let available = wardrobe.filter(\.isAvailable).sorted { $0.id.uuidString < $1.id.uuidString }
        guard !available.isEmpty || !locked.isEmpty else { throw .emptyWardrobe }

        var lockedByRole: [GarmentCategory: WardrobeItem] = [:]
        var lockedSlots: Set<Slot> = []
        for item in locked {
            guard lockedSlots.isDisjoint(with: item.slots) else { throw .conflictingLocks }
            lockedSlots.formUnion(item.slots)
            lockedByRole[item.category] = item
        }

        let band = FormalityBand.band(for: context.mode, wardrobe: available)
        let targetWarmth = WeatherRules.targetWarmth(context.weather, config: config)
        var outerRule = outerOverride ?? WeatherRules.outerRule(context.weather, config: config)
        if lockedByRole[.outer] != nil { outerRule = .required }

        let rules = HardRules(
            config: config, mode: context.mode, band: band, targetWarmth: targetWarmth,
            outerPossible: outerRule != .none
        )

        // 1. Hard filters per category, relaxing progressively where a category comes up empty.
        var pools: [GarmentCategory: [WardrobeItem]] = [:]
        var levels: [GarmentCategory: HardRules.Level] = [:]
        for category in GarmentCategory.allCases {
            if let item = lockedByRole[category] {
                pools[category] = [item]
                levels[category] = .strict
                continue
            }
            if !lockedSlots.isDisjoint(with: category.slots) {
                pools[category] = []
                continue
            }
            let inCategory = available.filter { $0.category == category }
            let maxLevel: HardRules.Level = (category == .outer && outerRule != .required) ? .strict : .noMode
            let result = Self.relaxedPool(inCategory.filter { !excluded.contains($0.id) }, category, rules, maxLevel)
                ?? Self.relaxedPool(inCategory, category, rules, maxLevel)
            pools[category] = result?.items ?? []
            levels[category] = result?.level
        }

        let shoes = pools[.shoes] ?? []
        let tops = pools[.top] ?? []
        let bottoms = pools[.bottom] ?? []
        let onePieces = pools[.onePiece] ?? []
        let outers = pools[.outer] ?? []

        let separatesLevel = (tops.isEmpty || bottoms.isEmpty)
            ? nil : max(levels[.top]!.rawValue, levels[.bottom]!.rawValue)
        let onePieceLevel = onePieces.isEmpty ? nil : levels[.onePiece]!.rawValue

        var missing: Set<SuggestionError.Requirement> = []
        if shoes.isEmpty { missing.insert(.shoes) }
        if separatesLevel == nil, onePieceLevel == nil {
            if tops.isEmpty { missing.insert(.top) }
            if bottoms.isEmpty { missing.insert(.bottom) }
        }
        guard missing.isEmpty else { throw .missingPieces(missing) }

        // Prefer whichever base form needed less relaxation; if tied, choose by pool size.
        let bestLevel = [separatesLevel, onePieceLevel].compactMap { $0 }.min()!
        var forms: [(Form, Double)] = []
        if separatesLevel == bestLevel { forms.append((.separates, Double(tops.count * bottoms.count).squareRoot())) }
        if onePieceLevel == bestLevel { forms.append((.onePiece, config.onePieceBias * Double(onePieces.count))) }

        var relaxations: [Relaxation] = []
        if outerRule == .required, outers.isEmpty {
            relaxations.append(.noOuterLayerAvailable)
            outerRule = .none
        }

        let scorer = Scorer(
            config: config, band: band, targetWarmth: targetWarmth,
            rainy: WeatherRules.isRainy(context.weather, config: config),
            history: HistoryIndex(history, config: config)
        )

        // Decided once per suggestion: per candidate, the ranking would quietly favor outfits
        // without a layer and override the weather's odds.
        let includeOuter: Bool
        switch outerRule {
        case .none: includeOuter = false
        case let .optional(p): includeOuter = !outers.isEmpty && Double.random(in: 0..<1, using: &rng) < p
        case .required: includeOuter = true
        }

        // 2. Build candidates by weighted sequential sampling.
        var candidates: [Candidate] = []
        var seenKeys: Set<String> = []
        for _ in 0..<max(1, config.candidateCount) {
            let formIndex = WeightedSampling.index(weights: forms.map(\.1), using: &rng)!
            let form = forms[formIndex].0

            var roles: [GarmentCategory] = form == .separates ? [.top, .bottom, .shoes] : [.onePiece, .shoes]
            roles.shuffle(using: &rng)
            // Anchor on the scarcest pool; the shuffle breaks ties randomly.
            roles = roles.enumerated()
                .sorted { (pools[$0.element]!.count, $0.offset) < (pools[$1.element]!.count, $1.offset) }
                .map(\.element)
            if includeOuter { roles.append(.outer) }

            var picked: [Picked] = roles.compactMap { role in lockedByRole[role].map { Picked(role: role, item: $0) } }
            var complete = true
            for role in roles where lockedByRole[role] == nil {
                let pickedItems = picked.map(\.item)
                let options = pools[role]!.filter { rules.compatible($0, with: pickedItems) }
                guard !options.isEmpty else { complete = false; break }
                let scores = options.map {
                    scorer.itemScore($0, role: role, picked: picked, includesOuter: includeOuter)
                }
                let weights = WeightedSampling.softmaxWeights(scores, temperature: config.temperature)
                let index = WeightedSampling.index(weights: weights, using: &rng)!
                picked.append(Picked(role: role, item: options[index]))
            }
            guard complete, let outfit = Self.assemble(picked) else { continue }
            let key = HistoryIndex.outfitKey(outfit.items.map(\.id))
            guard seenKeys.insert(key).inserted else { continue }
            candidates.append(Candidate(outfit: outfit, key: key, breakdown: scorer.outfitBreakdown(outfit)))
        }
        guard !candidates.isEmpty else { throw .noValidCombination }

        // 3. Skip recently shown outfits, then sample from the top slice instead of taking the best.
        let fresh = candidates.filter { !scorer.history.outfitShown($0.outfit.items.map(\.id)) }
        // Shuffle before the sort so equal scores are ordered randomly, not by item ID.
        var pool = fresh.isEmpty ? candidates : fresh
        pool.shuffle(using: &rng)
        let ranked = pool.enumerated()
            .sorted { ($0.element.breakdown.total, $1.offset) > ($1.element.breakdown.total, $0.offset) }
            .map(\.element)
        let topCount = max(config.minTopCandidates, Int((Double(ranked.count) * config.topFraction).rounded(.up)))
        let top = Array(ranked.prefix(topCount))
        let weights = WeightedSampling.softmaxWeights(top.map(\.breakdown.total), temperature: config.temperature)
        let chosen = top[WeightedSampling.index(weights: weights, using: &rng)!]

        for piece in chosen.outfit.pieces where lockedByRole[piece.role] == nil {
            relaxations += Self.relaxations(for: piece.role, level: levels[piece.role] ?? .strict, hasWeather: targetWarmth != nil)
        }
        return OutfitSuggestion(
            outfit: chosen.outfit, breakdown: chosen.breakdown, relaxations: relaxations,
            candidatesConsidered: ranked.count
        )
    }

    private static func relaxedPool(
        _ items: [WardrobeItem], _ category: GarmentCategory, _ rules: HardRules, _ maxLevel: HardRules.Level
    ) -> (items: [WardrobeItem], level: HardRules.Level)? {
        for level in HardRules.Level.allCases where level.rawValue <= maxLevel.rawValue {
            let pool = items.filter { rules.passes($0, as: category, level: level) }
            if !pool.isEmpty { return (pool, level) }
        }
        return nil
    }

    private static func assemble(_ picked: [Picked]) -> Outfit? {
        func item(_ role: GarmentCategory) -> WardrobeItem? { picked.first { $0.role == role }?.item }
        guard let shoes = item(.shoes) else { return nil }
        if let onePiece = item(.onePiece) { return Outfit(onePiece: onePiece, shoes: shoes, outer: item(.outer)) }
        guard let top = item(.top), let bottom = item(.bottom) else { return nil }
        return Outfit(top: top, bottom: bottom, shoes: shoes, outer: item(.outer))
    }

    private static func relaxations(for role: GarmentCategory, level: HardRules.Level, hasWeather: Bool) -> [Relaxation] {
        var result: [Relaxation] = []
        if level.rawValue >= HardRules.Level.noWeather.rawValue, hasWeather { result.append(.ignoredWeather(role)) }
        if level == .widerBand { result.append(.widenedFormality(role)) }
        if level == .noMode { result.append(.ignoredMode(role)) }
        return result
    }
}

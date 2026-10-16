import Foundation
import Testing
@testable import OutfitEngine
@testable import WardrobeCore

@Suite("Outfit engine: properties")
struct EnginePropertyTests {
    let engine = OutfitEngine()
    let wardrobe = SampleWardrobe.items

    @Test("No hard rule is violated across modes, weathers, and seeds", arguments: Fixtures.contexts)
    func hardRulesHoldAcrossSeeds(_ context: SuggestionContext) throws {
        for seed in UInt64(0)..<250 {
            let suggestion = try engine.suggest(wardrobe: wardrobe, context: context, seed: seed)
            expectInvariants(suggestion, wardrobe: wardrobe, context: context)
        }
    }

    @Test("Hard rules hold while the shown history grows")
    func hardRulesHoldWithHistory() throws {
        for context in Fixtures.contexts {
            var history = SuggestionHistory()
            for seed in UInt64(0)..<60 {
                let suggestion = try engine.suggest(wardrobe: wardrobe, context: context, history: history, seed: seed)
                expectInvariants(suggestion, wardrobe: wardrobe, context: context)
                history.record(suggestion.outfit)
            }
        }
    }

    @Test func sameSeedSameOutfit() throws {
        let context = SuggestionContext(mode: .casual, weather: Fixtures.weathers[3])
        for seed in UInt64(0)..<50 {
            let a = try engine.suggest(wardrobe: wardrobe, context: context, seed: seed)
            let b = try engine.suggest(wardrobe: wardrobe, context: context, seed: seed)
            #expect(a == b)
        }
    }

    @Test func resultDoesNotDependOnWardrobeOrder() throws {
        var rng = SplitMix64(seed: 99)
        let shuffled = wardrobe.shuffled(using: &rng)
        let context = SuggestionContext(mode: .any, weather: Fixtures.weathers[2])
        for seed in UInt64(0)..<50 {
            let a = try engine.suggest(wardrobe: wardrobe, context: context, seed: seed)
            let b = try engine.suggest(wardrobe: shuffled, context: context, seed: seed)
            #expect(a.outfit == b.outfit)
        }
    }

    @Test func differentSeedsGiveVariety() throws {
        let context = SuggestionContext(mode: .casual)
        let outfits = try (UInt64(0)..<100).map { try engine.suggest(wardrobe: wardrobe, context: context, seed: $0).outfit }
        #expect(Set(outfits).count >= 30)
    }

    @Test func balancedWardrobeHasNoDominantItem() throws {
        let balanced = Fixtures.balancedWardrobe()
        var counts: [UUID: Int] = [:]
        let runs = 1_500
        for seed in UInt64(0)..<UInt64(runs) {
            let outfit = try engine.suggest(wardrobe: balanced, context: SuggestionContext(mode: .casual), seed: seed).outfit
            for item in outfit.items { counts[item.id, default: 0] += 1 }
        }
        // Six options per slot: a fair share is ~17%.
        for item in balanced {
            let share = Double(counts[item.id] ?? 0) / Double(runs)
            #expect(share < 0.35, "\(item.name) picked \(share)")
            #expect(share > 0.04, "\(item.name) picked \(share)")
        }
    }

    @Test func doublePatternsAreRare() throws {
        var doubles = 0
        for seed in UInt64(0)..<500 {
            let items = try engine.suggest(wardrobe: wardrobe, context: SuggestionContext(mode: .casual), seed: seed).outfit.items
            if items.filter({ $0.category != .shoes && $0.pattern.isBold }).count >= 2 { doubles += 1 }
        }
        #expect(doubles < 25)
    }
}

@Suite("Outfit engine: modes and weather")
struct EngineContextTests {
    let engine = OutfitEngine()
    let wardrobe = SampleWardrobe.items

    @Test func formalModeStaysFormal() throws {
        for seed in UInt64(0)..<200 {
            let suggestion = try engine.suggest(wardrobe: wardrobe, context: SuggestionContext(mode: .formal), seed: seed)
            #expect(suggestion.outfit.items.allSatisfy { $0.formality >= 3 })
            #expect(suggestion.relaxations.isEmpty)
        }
    }

    @Test func sportyModeUsesAthleticPieces() throws {
        for seed in UInt64(0)..<200 {
            let outfit = try engine.suggest(wardrobe: wardrobe, context: SuggestionContext(mode: .sporty), seed: seed).outfit
            for (role, item) in outfit.pieces where role != .outer {
                #expect(item.hasStyle(.athletic), "\(item.name)")
            }
        }
    }

    @Test func sportyWithoutAthleticShoesRelaxesOnlyShoes() throws {
        let noAthleticShoes = wardrobe.filter { !($0.category == .shoes && $0.style == .athletic) }
        let suggestion = try engine.suggest(wardrobe: noAthleticShoes, context: SuggestionContext(mode: .sporty), seed: 7)
        #expect(suggestion.relaxations.contains(.ignoredMode(.shoes)))
        #expect(suggestion.outfit.item(filling: .top)!.hasStyle(.athletic))
        #expect(!suggestion.relaxations.contains(.ignoredMode(.top)))
    }

    @Test func hotWeatherAvoidsHeavyItemsAndCoats() throws {
        let hot = SuggestionContext(mode: .any, weather: Fixtures.weathers[1])
        for seed in UInt64(0)..<300 {
            let outfit = try engine.suggest(wardrobe: wardrobe, context: hot, seed: seed).outfit
            #expect(outfit.outer == nil)
            #expect(outfit.items.allSatisfy { $0.warmth <= 1 }, "\(outfit.items.map(\.name))")
        }
    }

    @Test func coldWeatherAlwaysAddsAWarmLayer() throws {
        let cold = SuggestionContext(mode: .any, weather: Fixtures.weathers[4])
        for seed in UInt64(0)..<300 {
            let outfit = try engine.suggest(wardrobe: wardrobe, context: cold, seed: seed).outfit
            let outer = try #require(outfit.outer)
            #expect(outer.warmth >= 2)
        }
    }

    @Test func coolWeatherSometimesAddsALayer() throws {
        let cool = SuggestionContext(mode: .casual, weather: Fixtures.weathers[3])
        let withOuter = try (UInt64(0)..<300).filter {
            try engine.suggest(wardrobe: wardrobe, context: cool, seed: $0).outfit.outer != nil
        }.count
        #expect((90...210).contains(withOuter))
    }

    @Test func rainFavorsWaterResistantAndAvoidsSuede() throws {
        let dry = SuggestionContext(mode: .casual, weather: WeatherInput(feelsLikeHighC: 16, feelsLikeLowC: 11, precipitationChance: 0))
        let wet = SuggestionContext(mode: .casual, weather: WeatherInput(feelsLikeHighC: 16, feelsLikeLowC: 11, precipitationChance: 0.9))
        func tally(_ context: SuggestionContext) throws -> (resistantOuter: Double, suede: Int) {
            var outers = 0, resistant = 0, suede = 0
            for seed in UInt64(0)..<400 {
                let outfit = try engine.suggest(wardrobe: wardrobe, context: context, seed: seed).outfit
                if let outer = outfit.outer {
                    outers += 1
                    if outer.isWaterResistant { resistant += 1 }
                }
                if outfit.shoes.isRainSensitive { suede += 1 }
            }
            return (Double(resistant) / Double(max(outers, 1)), suede)
        }
        let d = try tally(dry), w = try tally(wet)
        #expect(w.resistantOuter > d.resistantOuter + 0.15)
        #expect(w.suede * 3 < max(d.suede, 1))
    }

    @Test func coldWithoutOuterwearStillSuggests() throws {
        let noOuter = wardrobe.filter { $0.category != .outer }
        let suggestion = try engine.suggest(wardrobe: noOuter, context: SuggestionContext(weather: Fixtures.weathers[4]), seed: 1)
        #expect(suggestion.outfit.outer == nil)
        #expect(suggestion.relaxations.contains(.noOuterLayerAvailable))
    }

    @Test func noWeatherMeansNoWeatherScore() throws {
        let suggestion = try engine.suggest(wardrobe: wardrobe, context: SuggestionContext(), seed: 3)
        #expect(suggestion.breakdown.weather == 0)
        #expect(!suggestion.relaxations.contains { if case .ignoredWeather = $0 { true } else { false } })
    }

    @Test func breakdownTotalMatchesWeights() throws {
        let b = try engine.suggest(wardrobe: wardrobe, context: SuggestionContext(weather: Fixtures.weathers[3]), seed: 5).breakdown
        let w = EngineConfig.default.weights
        let expected = w.color * b.color - w.accent * b.accentPenalty + w.formality * b.formality + w.weather * b.weather
            - w.recency * b.recencyPenalty + w.variety * b.variety + w.favorite * b.favorite - w.pattern * b.patternPenalty
        #expect(abs(b.total - expected) < 1e-9)
    }
}

@Suite("Outfit engine: one-piece garments")
struct EngineOnePieceTests {
    let engine = OutfitEngine()

    @Test func onePiecesOnlyWardrobe() throws {
        let items = [Fixtures.item("sundress", .yellow), Fixtures.item("jumpsuit", .navy), Fixtures.item("sandals", .brown)]
        for seed in UInt64(0)..<50 {
            let outfit = try engine.suggest(wardrobe: items, context: SuggestionContext(), seed: seed).outfit
            #expect(outfit.isOnePiece)
            #expect(outfit.item(filling: .top) == outfit.item(filling: .bottom))
        }
    }

    @Test func mixedWardrobeProducesBothForms() throws {
        let outfits = try (UInt64(0)..<300).map {
            try engine.suggest(wardrobe: SampleWardrobe.items, context: SuggestionContext(mode: .casual), seed: $0).outfit
        }
        let onePieces = outfits.filter(\.isOnePiece).count
        #expect(onePieces > 10)
        #expect(onePieces < 200)
    }

    @Test func formalModeCanPickACocktailDress() throws {
        let picked = try (UInt64(0)..<300).contains {
            try engine.suggest(wardrobe: SampleWardrobe.items, context: SuggestionContext(mode: .formal), seed: $0)
                .outfit.item(filling: .top)?.subcategoryKey == "cocktail_dress"
        }
        #expect(picked)
    }
}

@Suite("Outfit engine: edge cases")
struct EngineEdgeCaseTests {
    let engine = OutfitEngine()

    @Test func emptyWardrobe() {
        #expect(throws: SuggestionError.emptyWardrobe) {
            try engine.suggest(wardrobe: [], context: SuggestionContext(), seed: 0)
        }
    }

    @Test func onlyUnavailableItems() {
        let items = [Fixtures.item("t_shirt", .white, status: .laundry), Fixtures.item("jeans", .denim, status: .archived)]
        #expect(throws: SuggestionError.emptyWardrobe) {
            try engine.suggest(wardrobe: items, context: SuggestionContext(), seed: 0)
        }
    }

    @Test func missingShoes() {
        let items = [Fixtures.item("t_shirt", .white), Fixtures.item("jeans", .denim)]
        #expect(throws: SuggestionError.missingPieces([.shoes])) {
            try engine.suggest(wardrobe: items, context: SuggestionContext(), seed: 0)
        }
    }

    @Test func topsWithoutBottomsOrOnePieces() {
        let items = [Fixtures.item("t_shirt", .white), Fixtures.item("sneakers", .white)]
        #expect(throws: SuggestionError.missingPieces([.bottom])) {
            try engine.suggest(wardrobe: items, context: SuggestionContext(), seed: 0)
        }
    }

    @Test func onePairOfShoesIsAlwaysUsed() throws {
        let shoes = Fixtures.item("loafers", .brown)
        let items = SampleWardrobe.items.filter { $0.category != .shoes } + [shoes]
        for context in Fixtures.contexts {
            for seed in UInt64(0)..<20 {
                let suggestion = try engine.suggest(wardrobe: items, context: context, seed: seed)
                #expect(suggestion.outfit.shoes == shoes)
                expectInvariants(suggestion, wardrobe: items, context: context)
            }
        }
    }

    @Test func allBlackWardrobe() throws {
        let items = ["t_shirt", "turtleneck", "jeans", "dress_trousers", "ankle_boots", "sneakers", "leather_jacket"]
            .map { Fixtures.item($0, .black) }
        for seed in UInt64(0)..<50 {
            let suggestion = try engine.suggest(wardrobe: items, context: SuggestionContext(), seed: seed)
            #expect(suggestion.breakdown.color > 0)
            #expect(suggestion.breakdown.accentPenalty == 0)
        }
    }

    @Test func unavailableItemsAreNeverChosen() throws {
        var items = SampleWardrobe.items
        items[0].status = .laundry
        items[1].status = .archived
        items[2].deletedAt = Date()
        let excluded = Set(items[0...2].map(\.id))
        for seed in UInt64(0)..<300 {
            let outfit = try engine.suggest(wardrobe: items, context: SuggestionContext(mode: .casual), seed: seed).outfit
            #expect(outfit.itemIDs.isDisjoint(with: excluded))
        }
    }

    @Test func impossibleCombinationsThrow() {
        // The only shoes are far too casual for the only (formal) garments, and nothing else exists.
        let items = [Fixtures.item("evening_gown", .black), Fixtures.item("slides", .black)]
        #expect(throws: SuggestionError.noValidCombination) {
            try engine.suggest(wardrobe: items, context: SuggestionContext(mode: .formal), seed: 0)
        }
    }
}

@Suite("Outfit engine: locks and rerolls")
struct EngineLockTests {
    let engine = OutfitEngine()
    let wardrobe = SampleWardrobe.items
    var byID: [UUID: WardrobeItem] { Dictionary(uniqueKeysWithValues: wardrobe.map { ($0.id, $0) }) }

    @Test func lockedTopIsKept() throws {
        let top = byID[SampleWardrobe.id(3)]!
        for seed in UInt64(0)..<100 {
            let suggestion = try engine.suggest(wardrobe: wardrobe, context: SuggestionContext(mode: .casual), locked: [top], seed: seed)
            #expect(suggestion.outfit.item(filling: .top) == top)
            #expect(!suggestion.outfit.isOnePiece)
            expectInvariants(suggestion, wardrobe: wardrobe, context: SuggestionContext(mode: .casual), locked: [top])
        }
    }

    @Test func lockedDressFillsTopAndBottom() throws {
        let dress = byID[SampleWardrobe.id(40)]!
        let outfit = try engine.suggest(wardrobe: wardrobe, context: SuggestionContext(), locked: [dress], seed: 4).outfit
        #expect(outfit.base == .onePiece(dress))
    }

    @Test func lockedOuterIsKeptEvenWhenHot() throws {
        let blazer = byID[SampleWardrobe.id(81)]!
        let outfit = try engine.suggest(wardrobe: wardrobe, context: SuggestionContext(weather: Fixtures.weathers[1]), locked: [blazer], seed: 4).outfit
        #expect(outfit.outer == blazer)
    }

    @Test func conflictingLocks() {
        let top = byID[SampleWardrobe.id(1)]!
        let dress = byID[SampleWardrobe.id(40)]!
        #expect(throws: SuggestionError.conflictingLocks) {
            try engine.suggest(wardrobe: wardrobe, context: SuggestionContext(), locked: [top, dress], seed: 0)
        }
    }

    @Test func rerollChangesOnlyThatSlot() throws {
        let context = SuggestionContext(mode: .casual)
        for seed in UInt64(0)..<100 {
            let original = try engine.suggest(wardrobe: wardrobe, context: context, seed: seed).outfit
            let rerolled = try engine.reroll(original, slot: .shoes, wardrobe: wardrobe, context: context, seed: seed &+ 1).outfit
            #expect(rerolled.shoes != original.shoes)
            #expect(rerolled.base == original.base)
            #expect(rerolled.outer == original.outer)
        }
    }

    @Test func rerollingTopOfADressReplacesTheDress() throws {
        let dress = byID[SampleWardrobe.id(41)]!
        let sandals = byID[SampleWardrobe.id(66)]!
        let original = Outfit(onePiece: dress, shoes: sandals)
        let rerolled = try engine.reroll(original, slot: .top, wardrobe: wardrobe, context: SuggestionContext(mode: .casual), seed: 2).outfit
        #expect(rerolled.shoes == sandals)
        #expect(rerolled.item(filling: .top) != dress)
    }

    @Test func rerollingOuterAddsALayer() throws {
        let original = Outfit(top: byID[SampleWardrobe.id(1)]!, bottom: byID[SampleWardrobe.id(20)]!, shoes: byID[SampleWardrobe.id(60)]!)
        let rerolled = try engine.reroll(original, slot: .outer, wardrobe: wardrobe, context: SuggestionContext(mode: .casual), seed: 9).outfit
        #expect(rerolled.outer != nil)
        #expect(rerolled.base == original.base)
    }

    @Test func rerollWithOnlyOneOptionKeepsIt() throws {
        let shoes = Fixtures.item("sneakers", .white)
        let items = [Fixtures.item("t_shirt", .white), Fixtures.item("t_shirt", .grey), Fixtures.item("jeans", .denim), shoes]
        let original = try engine.suggest(wardrobe: items, context: SuggestionContext(), seed: 0).outfit
        let rerolled = try engine.reroll(original, slot: .shoes, wardrobe: items, context: SuggestionContext(), seed: 1).outfit
        #expect(rerolled.shoes == shoes)
    }
}

@Suite("Outfit engine: recently shown avoidance")
struct EngineRecencyTests {
    let engine = OutfitEngine()

    @Test func recentlyShownItemsArePickedLessOften() throws {
        let wardrobe = Fixtures.balancedWardrobe()
        let context = SuggestionContext(mode: .casual)
        let shown = try engine.suggest(wardrobe: wardrobe, context: context, seed: 0).outfit
        var history = SuggestionHistory()
        history.record(shown)

        func topRepeats(_ history: SuggestionHistory) throws -> Int {
            try (UInt64(1)..<401).filter {
                try engine.suggest(wardrobe: wardrobe, context: context, history: history, seed: $0).outfit.item(filling: .top) == shown.item(filling: .top)
            }.count
        }
        let without = try topRepeats(SuggestionHistory())
        let with = try topRepeats(history)
        #expect(with * 3 < without, "with history \(with), without \(without)")
    }

    @Test func recentlyShownOutfitsAreSkipped() throws {
        let tops = [Fixtures.item("t_shirt", .white), Fixtures.item("t_shirt", .grey)]
        let bottoms = [Fixtures.item("jeans", .denim), Fixtures.item("chinos", .beige)]
        let shoes = Fixtures.item("sneakers", .white)
        let wardrobe = tops + bottoms + [shoes]
        let all = tops.flatMap { t in bottoms.map { b in Outfit(top: t, bottom: b, shoes: shoes) } }

        for seed in UInt64(0)..<30 {
            var history = SuggestionHistory()
            for outfit in all.dropLast() { history.record(outfit) }
            let next = try engine.suggest(wardrobe: wardrobe, context: SuggestionContext(), history: history, seed: seed).outfit
            #expect(next == all.last)

            history.record(all.last!)
            #expect(throws: Never.self) {
                try engine.suggest(wardrobe: wardrobe, context: SuggestionContext(), history: history, seed: seed)
            }
        }
    }

    @Test func pullToShuffleDoesNotRepeatWithinTheDedupeWindow() throws {
        let wardrobe = SampleWardrobe.items
        let context = SuggestionContext(mode: .casual, weather: Fixtures.weathers[2])
        var history = SuggestionHistory()
        var shown: [Set<UUID>] = []
        for seed in UInt64(0)..<40 {
            let outfit = try engine.suggest(wardrobe: wardrobe, context: context, history: history, seed: seed).outfit
            let window = shown.suffix(EngineConfig.default.dedupeWindow)
            #expect(!window.contains(outfit.itemIDs))
            history.record(outfit)
            shown.append(outfit.itemIDs)
        }
    }

    @Test func shufflingRotatesThroughTheWardrobe() throws {
        let wardrobe = SampleWardrobe.items
        let context = SuggestionContext(mode: .casual)
        var history = SuggestionHistory()
        var usedTops = Set<UUID>()
        for seed in UInt64(0)..<15 {
            let outfit = try engine.suggest(wardrobe: wardrobe, context: context, history: history, seed: seed).outfit
            if let top = outfit.item(filling: .top) { usedTops.insert(top.id) }
            history.record(outfit)
        }
        #expect(usedTops.count >= 8)
    }
}

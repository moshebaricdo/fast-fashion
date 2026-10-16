import Foundation
import Testing
@testable import OutfitEngine
@testable import WardrobeCore

@Suite("Seeded random")
struct SeededRandomTests {
    @Test func splitMixReferenceValues() {
        var rng = SplitMix64(seed: 0)
        #expect(rng.next() == 0xE220_A839_7B1D_CDAF)
        #expect(rng.next() == 0x6E78_9E6A_A1B9_65F4)
    }

    @Test func weightedIndexIgnoresZeroAndInvalidWeights() {
        var rng = SplitMix64(seed: 1)
        for _ in 0..<500 {
            let index = WeightedSampling.index(weights: [0, -1, .nan, 2, .infinity], using: &rng)
            #expect(index == 3)
        }
        #expect(WeightedSampling.index(weights: [], using: &rng) == nil)
    }

    @Test func weightedIndexIsRoughlyProportional() {
        var rng = SplitMix64(seed: 2)
        var counts = [0, 0]
        for _ in 0..<10_000 { counts[WeightedSampling.index(weights: [1, 3], using: &rng)!] += 1 }
        let share = Double(counts[1]) / 10_000
        #expect(abs(share - 0.75) < 0.03)
    }

    @Test func allZeroWeightsFallBackToUniform() {
        var rng = SplitMix64(seed: 3)
        var seen = Set<Int>()
        for _ in 0..<200 { seen.insert(WeightedSampling.index(weights: [0, 0, 0], using: &rng)!) }
        #expect(seen == [0, 1, 2])
    }

    @Test func softmaxIsStable() {
        let weights = WeightedSampling.softmaxWeights([1000, 999, -1000], temperature: 0.35)
        #expect(weights[0] == 1)
        #expect(weights.allSatisfy { $0.isFinite && $0 >= 0 })
        #expect(weights[1] < weights[0] && weights[2] < weights[1])
    }
}

@Suite("Weather rules")
struct WeatherRulesTests {
    let config = EngineConfig.default

    func weather(_ t: Double, rain: Double = 0) -> WeatherInput {
        WeatherInput(feelsLikeHighC: t, feelsLikeLowC: t, precipitationChance: rain)
    }

    @Test func targetWarmthThresholds() {
        #expect(WeatherRules.targetWarmth(nil, config: config) == nil)
        #expect(WeatherRules.targetWarmth(weather(30), config: config) == 0)
        #expect(WeatherRules.targetWarmth(weather(24), config: config) == 0)
        #expect(WeatherRules.targetWarmth(weather(20), config: config) == 1)
        #expect(WeatherRules.targetWarmth(weather(18), config: config) == 1)
        #expect(WeatherRules.targetWarmth(weather(15), config: config) == 2)
        #expect(WeatherRules.targetWarmth(weather(11.9), config: config) == 3)
        #expect(WeatherRules.targetWarmth(weather(-10), config: config) == 3)
    }

    @Test func representativeTemperatureLeansTowardHigh() {
        let w = WeatherInput(feelsLikeHighC: 20, feelsLikeLowC: 10)
        #expect(abs(WeatherRules.representativeTemperature(w, config: config) - 16.5) < 1e-9)
    }

    @Test func outerRule() {
        #expect(WeatherRules.outerRule(nil, config: config) == .optional(probability: 0.25))
        #expect(WeatherRules.outerRule(weather(28), config: config) == .none)
        #expect(WeatherRules.outerRule(weather(20), config: config) == .none)
        #expect(WeatherRules.outerRule(weather(15), config: config) == .optional(probability: 0.5))
        #expect(WeatherRules.outerRule(weather(5), config: config) == .required)
    }

    @Test func rainMakesOuterLikely() {
        #expect(WeatherRules.outerRule(weather(28, rain: 0.6), config: config) == .optional(probability: 0.75))
        #expect(WeatherRules.outerRule(weather(15, rain: 0.9), config: config) == .optional(probability: 0.75))
        #expect(WeatherRules.outerRule(weather(5, rain: 0.9), config: config) == .required)
        #expect(WeatherRules.isRainy(weather(15, rain: 0.5), config: config))
        #expect(!WeatherRules.isRainy(weather(15, rain: 0.49), config: config))
        #expect(!WeatherRules.isRainy(nil, config: config))
    }
}

@Suite("Formality band")
struct FormalityBandTests {
    @Test func modeBands() {
        #expect(FormalityBand.band(for: .formal, wardrobe: []).range == 4...5)
        #expect(FormalityBand.band(for: .casual, wardrobe: []).range == 2...3)
        #expect(FormalityBand.band(for: .sporty, wardrobe: []).range == 1...2)
    }

    @Test func anyCentersOnWardrobeMedian() {
        #expect(FormalityBand.band(for: .any, wardrobe: []).range == 2...4)
        let formalWardrobe = (0..<5).map { _ in Fixtures.item("dress_trousers", .grey) }
        #expect(FormalityBand.band(for: .any, wardrobe: formalWardrobe).range == 3...5)
        let gymWardrobe = (0..<5).map { _ in Fixtures.item("leggings", .black) }
        #expect(FormalityBand.band(for: .any, wardrobe: gymWardrobe).range == 1...2)
    }

    @Test func wideningClampsAndDistance() {
        let band = FormalityBand(4...5)
        #expect(band.widened(by: 1).range == 3...5)
        #expect(band.widened(by: 9).range == 1...5)
        #expect(band.distance(to: 4) == 0)
        #expect(band.distance(to: 2) == 2)
        #expect(FormalityBand(1...2).distance(to: 5) == 3)
    }
}

@Suite("Color harmony")
struct ColorHarmonyTests {
    @Test func scoresAreSymmetricAndBounded() {
        for a in ColorFamily.allCases {
            for b in ColorFamily.allCases {
                let ab = ColorHarmony.familyScore(a, b, lightnessGap: 0.1)
                #expect(ab == ColorHarmony.familyScore(b, a, lightnessGap: 0.1), "\(a) \(b)")
                #expect((-1...1).contains(ab))
            }
        }
    }

    @Test func neutralsGoWithEveryAccent() {
        let accents = ColorFamily.allCases.filter { !$0.isNeutral && $0 != .metallic }
        for neutral in ColorFamily.allCases where neutral.isNeutral {
            for accent in accents {
                #expect(ColorHarmony.familyScore(neutral, accent, lightnessGap: 0.3) > 0, "\(neutral) \(accent)")
            }
        }
    }

    @Test func monochromeBeatsMixedNeutrals() {
        #expect(ColorHarmony.familyScore(.green, .green, lightnessGap: 0) > ColorHarmony.familyScore(.white, .grey, lightnessGap: 0.5))
    }

    @Test func clashes() {
        #expect(ColorHarmony.familyScore(.red, .pink, lightnessGap: 0.2) < -0.5)
        #expect(ColorHarmony.familyScore(.orange, .pink, lightnessGap: 0.2) < 0)
        #expect(ColorHarmony.familyScore(.red, .green, lightnessGap: 0.2) > 0)
        #expect(ColorHarmony.familyScore(.purple, .pink, lightnessGap: 0.2) > 0)
    }

    @Test func navyAndBlackClashOnlyWhenLightnessIsClose() {
        let navy = Fixtures.item("t_shirt", .navy)
        let black = Fixtures.item("jeans", .black)
        #expect(ColorHarmony.itemScore(navy, black) < 0)

        var brightNavy = navy
        brightNavy.colors = [ItemColor(family: .navy, hex: "#3A5A9A", share: 1)]
        var trueBlack = black
        trueBlack.colors = [ItemColor(family: .black, hex: "#050505", share: 1)]
        #expect(ColorHarmony.itemScore(brightNavy, trueBlack) > 0)
    }

    @Test func secondaryColorsCountAtHalfWeight() {
        let plain = Fixtures.item("t_shirt", .white)
        let redWithPink = Fixtures.item("chinos", .red, .pink)
        let pink = Fixtures.item("sneakers", .pink)
        let pinkVsRedDominant = ColorHarmony.itemScore(pink, redWithPink)
        let pinkVsPlain = ColorHarmony.itemScore(pink, plain)
        #expect(pinkVsRedDominant < pinkVsPlain)
    }

    @Test func accentRules() {
        let red = Fixtures.item("t_shirt", .red)
        let green = Fixtures.item("chinos", .green)
        let yellow = Fixtures.item("sneakers", .yellow)
        let navy = Fixtures.item("blazer", .navy)
        #expect(ColorHarmony.accentFamilies([red, navy]) == [.red])
        #expect(ColorHarmony.accentPenalty([red, navy]) == 0)
        #expect(ColorHarmony.accentPenalty([red, green]) == 0)    // complementary
        #expect(ColorHarmony.accentPenalty([red, yellow]) == 1)   // not harmonious
        #expect(ColorHarmony.accentPenalty([red, green, yellow]) == 1)
    }
}

@Suite("Hard rules")
struct HardRulesTests {
    let config = EngineConfig.default

    @Test func patternRules() {
        let graphic = Fixtures.item("t_shirt", .black, pattern: .graphic)
        let print = Fixtures.item("midi_skirt", .white, pattern: .print)
        let stripe = Fixtures.item("chinos", .white, pattern: .stripe)
        let check = Fixtures.item("shacket", .grey, pattern: .check)
        let printedShoes = Fixtures.item("sneakers", .white, pattern: .print)
        let texture = Fixtures.item("cardigan", .grey, pattern: .texture)

        #expect(HardRules.violations(in: [graphic, print], config: config).contains(.graphicWithPrint))
        #expect(HardRules.violations(in: [graphic, graphic], config: config).contains(.twoGraphics))
        #expect(HardRules.violations(in: [graphic, stripe, check], config: config).contains(.tooManyPatterns))
        #expect(HardRules.violations(in: [graphic, stripe, printedShoes, texture], config: config).isEmpty)
    }

    @Test func formalitySpread() {
        let gown = Fixtures.item("evening_gown", .black)
        let slides = Fixtures.item("slides", .black)
        let heels = Fixtures.item("heels", .black)
        #expect(HardRules.violations(in: [gown, slides], config: config) == [.formalitySpread])
        #expect(HardRules.violations(in: [gown, heels], config: config).isEmpty)
    }

    @Test func accentLimit() {
        let items = [Fixtures.item("t_shirt", .red), Fixtures.item("chinos", .green), Fixtures.item("sneakers", .yellow)]
        #expect(HardRules.violations(in: items, config: config) == [.tooManyAccents])
    }
}

@Suite("Suggestion history")
struct SuggestionHistoryTests {
    func outfit(_ top: Int, _ bottom: Int, _ shoes: Int) -> Outfit {
        let byID = Dictionary(uniqueKeysWithValues: SampleWardrobe.items.map { ($0.id, $0) })
        return Outfit(top: byID[SampleWardrobe.id(top)]!, bottom: byID[SampleWardrobe.id(bottom)]!, shoes: byID[SampleWardrobe.id(shoes)]!)
    }

    @Test func mostRecentFirstWithCapacity() {
        var history = SuggestionHistory(capacity: 3)
        history.record(outfit(1, 20, 60))
        history.record(outfit(2, 21, 61))
        history.record(outfit(3, 22, 62))
        history.record(outfit(4, 23, 64))
        #expect(history.entries.count == 3)
        #expect(history.entries.first?.topID == SampleWardrobe.id(4))
        #expect(history.entries.last?.topID == SampleWardrobe.id(2))
    }

    @Test func codableRoundTrip() throws {
        var history = SuggestionHistory()
        history.record(outfit(1, 20, 60), at: Date(timeIntervalSince1970: 100))
        let decoded = try JSONDecoder().decode(SuggestionHistory.self, from: JSONEncoder().encode(history))
        #expect(decoded == history)
    }

    @Test func indexPenalties() {
        var history = SuggestionHistory()
        history.record(outfit(1, 20, 60))
        history.record(outfit(2, 21, 60))
        let index = HistoryIndex(history, config: .default)
        #expect(index.recencyPenalty(SampleWardrobe.id(2)) == 1)
        #expect(index.recencyPenalty(SampleWardrobe.id(1)) < 1)
        #expect(index.recencyPenalty(SampleWardrobe.id(1)) > 0)
        #expect(index.recencyPenalty(SampleWardrobe.id(60)) == 1)
        #expect(index.recencyPenalty(SampleWardrobe.id(3)) == 0)
        #expect(index.varietyBonus(SampleWardrobe.id(3)) == 1)
        #expect(index.varietyBonus(SampleWardrobe.id(60)) == 1.0 / 3)
        #expect(index.pairShown(top: SampleWardrobe.id(1), bottom: SampleWardrobe.id(20)))
        #expect(!index.pairShown(top: SampleWardrobe.id(1), bottom: SampleWardrobe.id(21)))
        #expect(index.outfitShown([SampleWardrobe.id(60), SampleWardrobe.id(20), SampleWardrobe.id(1)]))
    }

    @Test func oldEntriesFallOutOfTheRecencyWindow() {
        var history = SuggestionHistory()
        history.record(outfit(1, 20, 60))
        for _ in 0..<EngineConfig.default.recencyWindow { history.record(outfit(2, 21, 61)) }
        let index = HistoryIndex(history, config: .default)
        #expect(index.recencyPenalty(SampleWardrobe.id(1)) == 0)
        #expect(index.varietyBonus(SampleWardrobe.id(1)) == 0.5)
    }
}

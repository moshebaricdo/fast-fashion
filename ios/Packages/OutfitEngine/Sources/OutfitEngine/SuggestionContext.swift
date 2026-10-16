import Foundation
import WardrobeCore

/// Today's forecast, from WeatherKit in the app. Never shown as a user control.
public struct WeatherInput: Hashable, Codable, Sendable {
    public var feelsLikeHighC: Double
    public var feelsLikeLowC: Double
    /// 0...1
    public var precipitationChance: Double

    public init(feelsLikeHighC: Double, feelsLikeLowC: Double, precipitationChance: Double = 0) {
        self.feelsLikeHighC = feelsLikeHighC
        self.feelsLikeLowC = feelsLikeLowC
        self.precipitationChance = min(max(precipitationChance, 0), 1)
    }
}

public struct SuggestionContext: Hashable, Sendable {
    public var mode: OutfitMode
    /// Nil when there is no forecast; the engine then ignores weather.
    public var weather: WeatherInput?

    public init(mode: OutfitMode = .any, weather: WeatherInput? = nil) {
        self.mode = mode
        self.weather = weather
    }
}

public struct FormalityBand: Hashable, Sendable {
    public var lower: Int
    public var upper: Int

    public init(_ range: ClosedRange<Int>) {
        lower = range.lowerBound
        upper = range.upperBound
    }

    public var range: ClosedRange<Int> { lower...upper }

    public func contains(_ formality: Int) -> Bool { range.contains(formality) }

    public func widened(by amount: Int) -> FormalityBand {
        let bounds = Taxonomy.formalityRange
        return FormalityBand(max(bounds.lowerBound, lower - amount)...min(bounds.upperBound, upper + amount))
    }

    /// 0 inside the band, otherwise how far outside it.
    public func distance(to formality: Int) -> Int {
        formality < lower ? lower - formality : (formality > upper ? formality - upper : 0)
    }

    /// Formal 4–5, casual 2–3, sporty 1–2. "Any" centers a 3-wide band on the wardrobe's median
    /// formality (there is no wear history to center on).
    public static func band(for mode: OutfitMode, wardrobe: [WardrobeItem]) -> FormalityBand {
        switch mode {
        case .formal: return FormalityBand(4...5)
        case .casual: return FormalityBand(2...3)
        case .sporty: return FormalityBand(1...2)
        case .any:
            let sorted = wardrobe.map(\.formality).sorted()
            let median = sorted.isEmpty ? 3 : sorted[sorted.count / 2]
            return FormalityBand(median...median).widened(by: 1)
        }
    }
}

/// Whether today's outfit gets an outer layer.
public enum OuterRule: Hashable, Sendable {
    case none
    case optional(probability: Double)
    case required
}

public enum WeatherRules {
    public static func representativeTemperature(_ weather: WeatherInput, config: EngineConfig) -> Double {
        weather.feelsLikeLowC + (weather.feelsLikeHighC - weather.feelsLikeLowC) * config.highTemperatureWeight
    }

    /// ≥ hot → 0, ≥ warm → 1, ≥ cool → 2, colder → 3. Nil without a forecast.
    public static func targetWarmth(_ weather: WeatherInput?, config: EngineConfig) -> Int? {
        guard let weather else { return nil }
        let t = representativeTemperature(weather, config: config)
        if t >= config.hotThresholdC { return 0 }
        if t >= config.warmThresholdC { return 1 }
        if t >= config.coolThresholdC { return 2 }
        return 3
    }

    public static func isRainy(_ weather: WeatherInput?, config: EngineConfig) -> Bool {
        guard let weather else { return false }
        return weather.precipitationChance >= config.rainThreshold
    }

    public static func outerRule(_ weather: WeatherInput?, config: EngineConfig) -> OuterRule {
        guard let weather else { return .optional(probability: config.noForecastOuterProbability) }
        let t = representativeTemperature(weather, config: config)
        let base: OuterRule =
            if t >= config.warmThresholdC { .none }
            else if t >= config.coolThresholdC { .optional(probability: config.coolOuterProbability) }
            else { .required }
        guard isRainy(weather, config: config) else { return base }
        switch base {
        case .none: return .optional(probability: config.rainOuterProbability)
        case let .optional(p): return .optional(probability: max(p, config.rainOuterProbability))
        case .required: return .required
        }
    }
}

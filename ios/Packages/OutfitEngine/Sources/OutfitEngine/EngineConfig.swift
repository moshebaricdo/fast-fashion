import Foundation

/// Every tunable constant in one place, so tuning against fixture wardrobes and the debug
/// score-breakdown screen never means hunting through the algorithm.
public struct EngineConfig: Hashable, Sendable {
    public struct Weights: Hashable, Sendable {
        public var color = 1.0
        public var accent = 0.6
        public var formality = 0.8
        public var weather = 0.6
        public var recency = 1.0
        public var variety = 0.3
        public var favorite = 0.2
        public var pattern = 0.8

        public init() {}
    }

    public var weights = Weights()

    // Sampling
    /// Candidate outfits built per suggestion before choosing among the best.
    public var candidateCount = 40
    /// Softmax temperature. Lower is greedier; higher is more random.
    public var temperature = 0.35
    /// The final pick is sampled from this top fraction of candidates…
    public var topFraction = 0.2
    /// …but never from fewer than this many.
    public var minTopCandidates = 3
    /// Relative likelihood of a one-piece base versus separates, before pool sizes.
    public var onePieceBias = 1.0

    // Hard rules
    /// Items must sit within the mode's formality band widened by this much.
    public var bandTolerance = 1
    /// Max formality minus min formality across the outfit.
    public var maxFormalitySpread = 2
    /// Bold-patterned garments allowed per outfit, shoes excluded.
    public var maxBoldPatterns = 2
    /// Distinct accent (non-neutral) color families allowed per outfit.
    public var maxAccentFamilies = 2

    // Weather
    /// Feels-like at or above this is hot (target warmth 0).
    public var hotThresholdC = 24.0
    /// At or above this is warm (warmth 1, no outer layer).
    public var warmThresholdC = 18.0
    /// At or above this is cool (warmth 2, outer layer optional). Below is cold (warmth 3, outer required).
    public var coolThresholdC = 12.0
    /// Where between the day's low (0) and high (1) the representative temperature sits.
    public var highTemperatureWeight = 0.65
    public var rainThreshold = 0.5
    public var coolOuterProbability = 0.5
    public var rainOuterProbability = 0.75
    /// Chance of an outer layer when there is no forecast.
    public var noForecastOuterProbability = 0.25

    // Recently shown suggestions (the only history signal; there is no wear tracking)
    /// How many recent suggestions count toward the item penalty.
    public var recencyWindow = 10
    /// Decay, in suggestions, of the item penalty. The most recent suggestion counts fully.
    public var recencyDecay = 3.0
    /// Top + bottom pairs shown within this many suggestions are penalized.
    public var pairWindow = 14
    public var pairRepeatPenalty = 1.0
    /// Exact outfits shown within this many suggestions are skipped when alternatives exist.
    public var dedupeWindow = 10

    public init() {}

    public static let `default` = EngineConfig()
}

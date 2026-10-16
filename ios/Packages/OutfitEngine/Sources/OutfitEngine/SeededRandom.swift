import Foundation

/// SplitMix64: tiny, fast, and identical on every platform, so a seed reproduces the same
/// suggestion in tests, on Linux, and on device.
public struct SplitMix64: RandomNumberGenerator, Sendable {
    private var state: UInt64

    public init(seed: UInt64) {
        state = seed
    }

    public mutating func next() -> UInt64 {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }
}

enum WeightedSampling {
    /// Picks an index with probability proportional to its weight. Negative and non-finite weights
    /// count as zero; if every weight is zero the pick is uniform.
    static func index(weights: [Double], using rng: inout some RandomNumberGenerator) -> Int? {
        guard !weights.isEmpty else { return nil }
        let cleaned = weights.map { $0.isFinite ? max(0, $0) : 0 }
        let total = cleaned.reduce(0, +)
        guard total > 0 else { return Int.random(in: 0..<weights.count, using: &rng) }
        var remaining = Double.random(in: 0..<total, using: &rng)
        for (index, weight) in cleaned.enumerated() {
            if remaining < weight { return index }
            remaining -= weight
        }
        return cleaned.lastIndex { $0 > 0 }
    }

    /// `exp(score / temperature)`, shifted by the max score for numerical stability.
    static func softmaxWeights(_ scores: [Double], temperature: Double) -> [Double] {
        guard let maxScore = scores.max() else { return [] }
        let t = max(temperature, 1e-6)
        return scores.map { exp(($0 - maxScore) / t) }
    }
}

import Foundation
import WardrobeCore

/// Rule-based color harmony over `ColorFamily`: explainable and easy to tune, not raw color math.
public enum ColorHarmony {
    /// How well two color families go together, −1 (clash) … +1.
    /// `lightnessGap` is the absolute lightness difference, used for near-identical darks.
    public static func familyScore(_ a: ColorFamily, _ b: ColorFamily, lightnessGap: Double) -> Double {
        if a == b {
            if a == .metallic { return -0.2 }
            if a == .denim { return 0.1 }
            return a.isNeutral ? 0.4 : 0.7
        }
        if a == .metallic || b == .metallic {
            let other = a == .metallic ? b : a
            return other.isNeutral ? 0.3 : 0
        }
        switch (a.isNeutral, b.isNeutral) {
        case (true, true): return neutralPairScore(a, b, lightnessGap: lightnessGap)
        case (true, false), (false, true): return 0.4
        case (false, false): return accentPairScore(a, b)
        }
    }

    private static func neutralPairScore(_ a: ColorFamily, _ b: ColorFamily, lightnessGap: Double) -> Double {
        let pair = Set([a, b])
        if pair == [.navy, .black] { return lightnessGap < 0.15 ? -0.5 : 0.1 }
        if pair == [.brown, .black] { return -0.1 }
        if pair == [.denim, .navy] { return 0.2 }
        return 0.3
    }

    private static func accentPairScore(_ a: ColorFamily, _ b: ColorFamily) -> Double {
        let pair = Set([a, b])
        if pair == [.red, .pink] { return -0.8 }
        if pair == [.orange, .pink] { return -0.6 }
        guard let pa = a.wheelPosition, let pb = b.wheelPosition else { return 0 }
        let raw = abs(pa - pb)
        switch min(raw, 12 - raw) {
        case 1: return 0.5   // analogous
        case 2: return 0.2
        case 3: return -0.4
        case 4: return 0     // triadic: bold but acceptable
        case 5: return -0.3
        default: return 0.3  // complementary
        }
    }

    /// Two accent families harmonize if their pair score is positive (analogous or complementary).
    public static func accentsHarmonize(_ a: ColorFamily, _ b: ColorFamily) -> Bool {
        a == b || familyScore(a, b, lightnessGap: 1) > 0
    }

    /// Harmony between two items, −1 … +1. Dominant colors count fully, secondary colors at half
    /// weight; colors under 10% share are ignored.
    public static func itemScore(_ a: WardrobeItem, _ b: WardrobeItem) -> Double {
        let ca = significantColors(a)
        let cb = significantColors(b)
        guard !ca.isEmpty, !cb.isEmpty else { return 0 }
        var total = 0.0
        var weightSum = 0.0
        for (i, x) in ca.enumerated() {
            for (j, y) in cb.enumerated() {
                let weight = (i == 0 ? 1 : 0.5) * (j == 0 ? 1 : 0.5)
                total += weight * familyScore(x.family, y.family, lightnessGap: abs(x.lightness - y.lightness))
                weightSum += weight
            }
        }
        return total / weightSum
    }

    /// Distinct accent families among the items' dominant colors, in first-seen order.
    /// Metallic counts as an accent.
    public static func accentFamilies(_ items: [WardrobeItem]) -> [ColorFamily] {
        var seen: [ColorFamily] = []
        for family in items.compactMap(\.dominantColor) where !family.isNeutral && !seen.contains(family) {
            seen.append(family)
        }
        return seen
    }

    /// 0 when the accents work together; 1 for two clashing accents or three or more.
    public static func accentPenalty(_ items: [WardrobeItem]) -> Double {
        let accents = accentFamilies(items)
        switch accents.count {
        case 0, 1: return 0
        case 2: return accentsHarmonize(accents[0], accents[1]) ? 0 : 1
        default: return 1
        }
    }

    private static func significantColors(_ item: WardrobeItem) -> [ItemColor] {
        let colors = item.colors.filter { $0.share >= 0.1 }
        return colors.isEmpty ? Array(item.colors.prefix(1)) : colors
    }
}

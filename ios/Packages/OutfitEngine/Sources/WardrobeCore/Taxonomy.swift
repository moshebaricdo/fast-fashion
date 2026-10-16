import Foundation

/// A position in an outfit. `top`, `bottom`, and `shoes` are always filled; `outer` is optional.
public enum Slot: String, CaseIterable, Codable, Sendable, Hashable {
    case top, bottom, shoes, outer
}

/// What kind of garment an item is. One-piece garments (dresses, jumpsuits, rompers) fill both
/// the top and bottom slots.
public enum GarmentCategory: String, CaseIterable, Codable, Sendable, Hashable {
    case top, bottom, onePiece, shoes, outer

    public var slots: Set<Slot> {
        switch self {
        case .top: [.top]
        case .bottom: [.bottom]
        case .onePiece: [.top, .bottom]
        case .shoes: [.shoes]
        case .outer: [.outer]
        }
    }

    public var displayName: String {
        switch self {
        case .top: "Top"
        case .bottom: "Bottom"
        case .onePiece: "One-piece"
        case .shoes: "Shoes"
        case .outer: "Outer layer"
        }
    }
}

/// The prototype's "primary type".
public enum Style: String, CaseIterable, Codable, Sendable, Hashable {
    case formal, casual, athletic
}

public enum Pattern: String, CaseIterable, Codable, Sendable, Hashable {
    case solid, stripe, check, print, graphic, texture

    /// Bold patterns count toward the pattern limits; texture (knits, corduroy) reads as solid.
    public var isBold: Bool {
        switch self {
        case .solid, .texture: false
        case .stripe, .check, .print, .graphic: true
        }
    }
}

public enum Season: String, CaseIterable, Codable, Sendable, Hashable {
    case spring, summer, autumn, winter
}

/// The simple controls on the home screen.
public enum OutfitMode: String, CaseIterable, Codable, Sendable, Hashable {
    case any, formal, casual, sporty
}

public enum ColorFamily: String, CaseIterable, Codable, Sendable, Hashable {
    case black, white, grey, navy, blue, denim, beige, brown,
         olive, green, red, pink, orange, yellow, purple, metallic

    /// Neutrals go with everything and never count as an accent.
    public var isNeutral: Bool {
        switch self {
        case .black, .white, .grey, .navy, .beige, .brown, .denim, .olive: true
        default: false
        }
    }

    /// Position on a 12-step artist's color wheel (0 = red). Nil for neutrals and metallic.
    public var wheelPosition: Int? {
        switch self {
        case .red: 0
        case .orange: 2
        case .yellow: 4
        case .green: 6
        case .blue: 8
        case .purple: 10
        case .pink: 11
        default: nil
        }
    }

    /// Typical lightness (0 = black, 1 = white), used when an item has no measured hex color.
    public var defaultLightness: Double {
        switch self {
        case .black: 0.05
        case .navy: 0.18
        case .brown, .olive: 0.3
        case .denim, .purple, .green, .red: 0.4
        case .blue, .grey, .metallic: 0.5
        case .orange, .pink: 0.6
        case .beige, .yellow: 0.8
        case .white: 0.97
        }
    }
}

public struct ItemColor: Hashable, Codable, Sendable {
    public var family: ColorFamily
    /// Measured color as `#RRGGBB`, when available from on-device color extraction.
    public var hex: String?
    /// Fraction of the item's visible area, 0...1.
    public var share: Double

    public init(family: ColorFamily, hex: String? = nil, share: Double = 1) {
        self.family = family
        self.hex = hex
        self.share = min(max(share, 0), 1)
    }

    /// HSL lightness from `hex`, falling back to the family's typical lightness.
    public var lightness: Double {
        guard let rgb = Self.parseHex(hex) else { return family.defaultLightness }
        return (max(rgb.r, rgb.g, rgb.b) + min(rgb.r, rgb.g, rgb.b)) / 2
    }

    static func parseHex(_ hex: String?) -> (r: Double, g: Double, b: Double)? {
        guard var s = hex?.trimmingCharacters(in: .whitespaces) else { return nil }
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let value = UInt32(s, radix: 16) else { return nil }
        return (
            Double((value >> 16) & 0xFF) / 255,
            Double((value >> 8) & 0xFF) / 255,
            Double(value & 0xFF) / 255
        )
    }
}

/// One row of the static taxonomy table, e.g. "oxford_shirt" or "jumpsuit".
public struct Subcategory: Hashable, Sendable, Identifiable {
    public let key: String
    public let displayName: String
    public let category: GarmentCategory
    public let defaultStyle: Style
    /// 1 (gym) … 5 (black tie)
    public let formality: Int
    /// 0 (very light) … 3 (heavy)
    public let warmth: Int
    public let isWaterResistant: Bool
    /// Suede, canvas, and similar materials that suffer in rain.
    public let isRainSensitive: Bool

    public var id: String { key }

    public init(
        key: String, displayName: String, category: GarmentCategory, defaultStyle: Style,
        formality: Int, warmth: Int, isWaterResistant: Bool = false, isRainSensitive: Bool = false
    ) {
        self.key = key
        self.displayName = displayName
        self.category = category
        self.defaultStyle = defaultStyle
        self.formality = formality
        self.warmth = warmth
        self.isWaterResistant = isWaterResistant
        self.isRainSensitive = isRainSensitive
    }
}

import Foundation

public enum ItemStatus: String, CaseIterable, Codable, Sendable, Hashable {
    case active, laundry, archived
}

public enum TagSource: String, CaseIterable, Codable, Sendable, Hashable {
    case ai, user, mixed
}

public enum ProcessingState: String, CaseIterable, Codable, Sendable, Hashable {
    case pending, segmented, tagged, failed
}

/// A catalog item as a plain value. Persistence maps its storage records to and from this type;
/// features and the outfit engine never see storage objects.
public struct WardrobeItem: Identifiable, Hashable, Codable, Sendable {
    public var id: UUID
    public var name: String
    public var category: GarmentCategory
    public var subcategoryKey: String
    public var style: Style
    public var secondaryStyles: Set<Style>
    public var formality: Int { didSet { formality = Self.clamp(formality, Taxonomy.formalityRange) } }
    public var warmth: Int { didSet { warmth = Self.clamp(warmth, Taxonomy.warmthRange) } }
    /// Sorted by share, largest first.
    public var colors: [ItemColor] { didSet { colors = Self.sorted(colors) } }
    public var pattern: Pattern
    public var seasons: Set<Season>?
    public var isWaterResistant: Bool
    public var isRainSensitive: Bool
    public var status: ItemStatus
    public var isFavorite: Bool
    public var notes: String?
    public var brand: String?
    public var tagSource: TagSource
    public var aiConfidence: Double?
    public var needsReview: Bool
    public var taxonomyVersion: Int
    public var processingState: ProcessingState
    public var createdAt: Date
    public var updatedAt: Date
    public var deletedAt: Date?

    public init(
        id: UUID = UUID(),
        name: String,
        category: GarmentCategory,
        subcategoryKey: String,
        style: Style,
        secondaryStyles: Set<Style> = [],
        formality: Int,
        warmth: Int,
        colors: [ItemColor] = [],
        pattern: Pattern = .solid,
        seasons: Set<Season>? = nil,
        isWaterResistant: Bool = false,
        isRainSensitive: Bool = false,
        status: ItemStatus = .active,
        isFavorite: Bool = false,
        notes: String? = nil,
        brand: String? = nil,
        tagSource: TagSource = .user,
        aiConfidence: Double? = nil,
        needsReview: Bool = false,
        taxonomyVersion: Int = Taxonomy.version,
        processingState: ProcessingState = .tagged,
        createdAt: Date = Date(),
        updatedAt: Date? = nil,
        deletedAt: Date? = nil
    ) {
        self.id = id
        self.name = name
        self.category = category
        self.subcategoryKey = subcategoryKey
        self.style = style
        self.secondaryStyles = secondaryStyles
        self.formality = Self.clamp(formality, Taxonomy.formalityRange)
        self.warmth = Self.clamp(warmth, Taxonomy.warmthRange)
        self.colors = Self.sorted(colors)
        self.pattern = pattern
        self.seasons = seasons
        self.isWaterResistant = isWaterResistant
        self.isRainSensitive = isRainSensitive
        self.status = status
        self.isFavorite = isFavorite
        self.notes = notes
        self.brand = brand
        self.tagSource = tagSource
        self.aiConfidence = aiConfidence
        self.needsReview = needsReview
        self.taxonomyVersion = taxonomyVersion
        self.processingState = processingState
        self.createdAt = createdAt
        self.updatedAt = updatedAt ?? createdAt
        self.deletedAt = deletedAt
    }

    /// Creates an item with style, formality, warmth, and rain flags defaulted from the taxonomy.
    public init(
        id: UUID = UUID(),
        name: String,
        subcategory: Subcategory,
        colors: [ItemColor] = [],
        pattern: Pattern = .solid,
        isFavorite: Bool = false,
        status: ItemStatus = .active,
        createdAt: Date = Date()
    ) {
        self.init(
            id: id, name: name, category: subcategory.category, subcategoryKey: subcategory.key,
            style: subcategory.defaultStyle, formality: subcategory.formality, warmth: subcategory.warmth,
            colors: colors, pattern: pattern,
            isWaterResistant: subcategory.isWaterResistant, isRainSensitive: subcategory.isRainSensitive,
            status: status, isFavorite: isFavorite, createdAt: createdAt
        )
    }

    public var subcategory: Subcategory? { Taxonomy.subcategory(subcategoryKey) }
    public var slots: Set<Slot> { category.slots }
    public var dominantColor: ColorFamily? { colors.first?.family }

    /// Eligible for suggestions: active (not in the laundry or archived) and not soft-deleted.
    public var isAvailable: Bool { status == .active && deletedAt == nil }

    public func hasStyle(_ style: Style) -> Bool {
        self.style == style || secondaryStyles.contains(style)
    }

    private static func clamp(_ value: Int, _ range: ClosedRange<Int>) -> Int {
        min(max(value, range.lowerBound), range.upperBound)
    }

    private static func sorted(_ colors: [ItemColor]) -> [ItemColor] {
        // Stable so equal shares keep the tagger's order.
        colors.enumerated()
            .sorted { $0.element.share != $1.element.share ? $0.element.share > $1.element.share : $0.offset < $1.offset }
            .map(\.element)
    }
}

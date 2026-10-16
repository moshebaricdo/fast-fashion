import Foundation

public enum OutfitSource: String, CaseIterable, Codable, Sendable, Hashable {
    case generated, manual
}

/// One item in a saved outfit and the role it plays.
public struct OutfitEntry: Hashable, Codable, Sendable {
    public var itemID: UUID
    public var role: GarmentCategory
    public var sortIndex: Int

    public init(itemID: UUID, role: GarmentCategory, sortIndex: Int) {
        self.itemID = itemID
        self.role = role
        self.sortIndex = sortIndex
    }
}

/// Why an outfit was suggested, kept for display and debugging.
public struct ContextSnapshot: Hashable, Codable, Sendable {
    public var mode: OutfitMode
    public var feelsLikeC: Double?
    public var precipitationChance: Double?
    public var date: Date

    public init(mode: OutfitMode, feelsLikeC: Double? = nil, precipitationChance: Double? = nil, date: Date) {
        self.mode = mode
        self.feelsLikeC = feelsLikeC
        self.precipitationChance = precipitationChance
        self.date = date
    }
}

/// An outfit the user saved. It references items by ID, so it survives item edits; entries whose
/// item was deleted are shown as missing.
public struct SavedOutfit: Identifiable, Hashable, Codable, Sendable {
    public var id: UUID
    public var name: String?
    public var source: OutfitSource
    public var entries: [OutfitEntry]
    public var context: ContextSnapshot?
    public var createdAt: Date
    public var updatedAt: Date
    public var deletedAt: Date?

    public init(
        id: UUID = UUID(), name: String? = nil, source: OutfitSource, entries: [OutfitEntry],
        context: ContextSnapshot? = nil, createdAt: Date = Date(), updatedAt: Date? = nil, deletedAt: Date? = nil
    ) {
        self.id = id
        self.name = name
        self.source = source
        self.entries = entries
        self.context = context
        self.createdAt = createdAt
        self.updatedAt = updatedAt ?? createdAt
        self.deletedAt = deletedAt
    }

    public init(outfit: Outfit, source: OutfitSource, name: String? = nil, context: ContextSnapshot? = nil, createdAt: Date = Date()) {
        let entries = outfit.pieces.enumerated().map { index, piece in
            OutfitEntry(itemID: piece.item.id, role: piece.role, sortIndex: index)
        }
        self.init(name: name, source: source, entries: entries, context: context, createdAt: createdAt)
    }

    /// Rebuilds the outfit from current catalog items. Returns nil if a required piece is missing.
    public func resolve(using items: [UUID: WardrobeItem]) -> Outfit? {
        func item(_ role: GarmentCategory) -> WardrobeItem? {
            entries.first { $0.role == role }.flatMap { items[$0.itemID] }
        }
        guard let shoes = item(.shoes) else { return nil }
        if let onePiece = item(.onePiece) {
            return Outfit(onePiece: onePiece, shoes: shoes, outer: item(.outer))
        }
        guard let top = item(.top), let bottom = item(.bottom) else { return nil }
        return Outfit(top: top, bottom: bottom, shoes: shoes, outer: item(.outer))
    }
}

/// A board of saved outfits. An outfit can be on several boards.
public struct OutfitCollection: Identifiable, Hashable, Codable, Sendable {
    public var id: UUID
    public var name: String
    public var sortIndex: Int
    public var coverOutfitID: UUID?
    /// Ordered, most recently added last.
    public var outfitIDs: [UUID]
    public var createdAt: Date
    public var updatedAt: Date
    public var deletedAt: Date?

    public init(
        id: UUID = UUID(), name: String, sortIndex: Int = 0, coverOutfitID: UUID? = nil,
        outfitIDs: [UUID] = [], createdAt: Date = Date(), updatedAt: Date? = nil, deletedAt: Date? = nil
    ) {
        self.id = id
        self.name = name
        self.sortIndex = sortIndex
        self.coverOutfitID = coverOutfitID
        self.outfitIDs = outfitIDs
        self.createdAt = createdAt
        self.updatedAt = updatedAt ?? createdAt
        self.deletedAt = deletedAt
    }
}

public struct ItemImages: Hashable, Sendable {
    /// Transparent cutout (HEIC or PNG with alpha). The UI draws the white background.
    public var cutout: Data
    public var thumbnail: Data
    /// Downscaled original, kept for re-processing.
    public var original: Data?
    public var contentHash: String

    public init(cutout: Data, thumbnail: Data, original: Data? = nil, contentHash: String) {
        self.cutout = cutout
        self.thumbnail = thumbnail
        self.original = original
        self.contentHash = contentHash
    }
}

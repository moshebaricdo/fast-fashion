import Foundation

/// A complete outfit. The base is either separates (top + bottom) or a single one-piece garment
/// that fills both slots, so an invalid combination (a dress plus a skirt) can't be represented.
public struct Outfit: Hashable, Codable, Sendable {
    public enum Base: Hashable, Codable, Sendable {
        case separates(top: WardrobeItem, bottom: WardrobeItem)
        case onePiece(WardrobeItem)
    }

    public var base: Base
    public var shoes: WardrobeItem
    public var outer: WardrobeItem?

    public init(base: Base, shoes: WardrobeItem, outer: WardrobeItem? = nil) {
        self.base = base
        self.shoes = shoes
        self.outer = outer
    }

    public init(top: WardrobeItem, bottom: WardrobeItem, shoes: WardrobeItem, outer: WardrobeItem? = nil) {
        self.init(base: .separates(top: top, bottom: bottom), shoes: shoes, outer: outer)
    }

    public init(onePiece: WardrobeItem, shoes: WardrobeItem, outer: WardrobeItem? = nil) {
        self.init(base: .onePiece(onePiece), shoes: shoes, outer: outer)
    }

    /// Items with the role each plays, in display order: outer, top/one-piece, bottom, shoes.
    public var pieces: [(role: GarmentCategory, item: WardrobeItem)] {
        var result: [(GarmentCategory, WardrobeItem)] = []
        if let outer { result.append((.outer, outer)) }
        switch base {
        case let .separates(top, bottom):
            result.append((.top, top))
            result.append((.bottom, bottom))
        case let .onePiece(item):
            result.append((.onePiece, item))
        }
        result.append((.shoes, shoes))
        return result
    }

    public var items: [WardrobeItem] { pieces.map(\.item) }
    public var itemIDs: Set<UUID> { Set(items.map(\.id)) }

    public var isOnePiece: Bool {
        if case .onePiece = base { return true }
        return false
    }

    public func item(filling slot: Slot) -> WardrobeItem? {
        switch (slot, base) {
        case (.shoes, _): shoes
        case (.outer, _): outer
        case let (.top, .separates(top, _)): top
        case let (.bottom, .separates(_, bottom)): bottom
        case let (.top, .onePiece(item)), let (.bottom, .onePiece(item)): item
        }
    }
}

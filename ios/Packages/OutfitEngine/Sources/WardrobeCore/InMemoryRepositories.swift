import Foundation

public actor InMemoryItemRepository: ItemRepository {
    private var storage: [UUID: WardrobeItem]
    private let now: @Sendable () -> Date

    public init(items: [WardrobeItem] = [], now: @escaping @Sendable () -> Date = Date.init) {
        storage = Dictionary(items.map { ($0.id, $0) }, uniquingKeysWith: { _, last in last })
        self.now = now
    }

    public func items() -> [WardrobeItem] {
        storage.values.filter { $0.deletedAt == nil }.sorted { $0.createdAt != $1.createdAt ? $0.createdAt < $1.createdAt : $0.id.uuidString < $1.id.uuidString }
    }

    public func item(id: UUID) -> WardrobeItem? {
        storage[id].flatMap { $0.deletedAt == nil ? $0 : nil }
    }

    public func save(_ item: WardrobeItem) {
        var item = item
        item.updatedAt = now()
        storage[item.id] = item
    }

    public func delete(id: UUID) throws {
        guard var item = storage[id] else { throw RepositoryError.notFound(id) }
        let date = now()
        item.deletedAt = date
        item.updatedAt = date
        storage[id] = item
    }
}

public actor InMemoryItemImageRepository: ItemImageRepository {
    private var storage: [UUID: ItemImages] = [:]

    public init() {}

    public func images(for itemID: UUID) -> ItemImages? { storage[itemID] }
    public func setImages(_ images: ItemImages, for itemID: UUID) { storage[itemID] = images }
}

public actor InMemoryOutfitRepository: OutfitRepository {
    private var storage: [UUID: SavedOutfit] = [:]
    private let now: @Sendable () -> Date

    public init(now: @escaping @Sendable () -> Date = Date.init) {
        self.now = now
    }

    public func outfits() -> [SavedOutfit] {
        storage.values.filter { $0.deletedAt == nil }.sorted { $0.createdAt > $1.createdAt }
    }

    public func outfit(id: UUID) -> SavedOutfit? {
        storage[id].flatMap { $0.deletedAt == nil ? $0 : nil }
    }

    public func save(_ outfit: SavedOutfit) {
        var outfit = outfit
        outfit.updatedAt = now()
        storage[outfit.id] = outfit
    }

    public func delete(id: UUID) throws {
        guard var outfit = storage[id] else { throw RepositoryError.notFound(id) }
        let date = now()
        outfit.deletedAt = date
        outfit.updatedAt = date
        storage[id] = outfit
    }
}

public actor InMemoryCollectionRepository: CollectionRepository {
    private var storage: [UUID: OutfitCollection] = [:]
    private let now: @Sendable () -> Date

    public init(now: @escaping @Sendable () -> Date = Date.init) {
        self.now = now
    }

    public func collections() -> [OutfitCollection] {
        storage.values.filter { $0.deletedAt == nil }.sorted { $0.sortIndex != $1.sortIndex ? $0.sortIndex < $1.sortIndex : $0.createdAt < $1.createdAt }
    }

    public func save(_ collection: OutfitCollection) {
        var collection = collection
        collection.updatedAt = now()
        storage[collection.id] = collection
    }

    public func delete(id: UUID) throws {
        try mutate(id) { $0.deletedAt = now() }
    }

    public func add(outfitID: UUID, to collectionID: UUID) throws {
        try mutate(collectionID) { collection in
            if !collection.outfitIDs.contains(outfitID) { collection.outfitIDs.append(outfitID) }
        }
    }

    public func remove(outfitID: UUID, from collectionID: UUID) throws {
        try mutate(collectionID) { $0.outfitIDs.removeAll { $0 == outfitID } }
    }

    private func mutate(_ id: UUID, _ change: (inout OutfitCollection) -> Void) throws {
        guard var collection = storage[id], collection.deletedAt == nil else { throw RepositoryError.notFound(id) }
        change(&collection)
        collection.updatedAt = now()
        storage[id] = collection
    }
}

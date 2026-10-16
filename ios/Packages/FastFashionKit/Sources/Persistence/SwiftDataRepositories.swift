import Foundation
import SwiftData
import WardrobeCore

// Each repository is a model actor with its own background context, so SwiftData objects never
// cross an isolation boundary; only WardrobeCore values leave.

public actor SwiftDataItemRepository: ItemRepository, ModelActor {
    public nonisolated let modelContainer: ModelContainer
    public nonisolated let modelExecutor: any ModelExecutor
    private let now: @Sendable () -> Date

    public init(modelContainer: ModelContainer, now: @escaping @Sendable () -> Date = Date.init) {
        self.modelContainer = modelContainer
        modelExecutor = DefaultSerialModelExecutor(modelContext: ModelContext(modelContainer))
        self.now = now
    }

    public func items() throws -> [WardrobeItem] {
        let descriptor = FetchDescriptor<ItemEntity>(
            predicate: #Predicate { $0.deletedAt == nil },
            sortBy: [SortDescriptor(\.createdAt)]
        )
        return try modelContext.fetch(descriptor).map(\.domain)
    }

    public func item(id: UUID) throws -> WardrobeItem? {
        try entity(id).flatMap { $0.deletedAt == nil ? $0.domain : nil }
    }

    public func save(_ item: WardrobeItem) throws {
        let record = try entity(item.id) ?? {
            let record = ItemEntity(id: item.id)
            modelContext.insert(record)
            return record
        }()
        var item = item
        item.updatedAt = now()
        record.apply(item)
        try modelContext.save()
    }

    public func delete(id: UUID) throws {
        guard let record = try entity(id) else { throw RepositoryError.notFound(id) }
        let date = now()
        record.deletedAt = date
        record.updatedAt = date
        try modelContext.save()
    }

    func entity(_ id: UUID) throws -> ItemEntity? {
        var descriptor = FetchDescriptor<ItemEntity>(predicate: #Predicate { $0.id == id })
        descriptor.fetchLimit = 1
        return try modelContext.fetch(descriptor).first
    }
}

public actor SwiftDataItemImageRepository: ItemImageRepository, ModelActor {
    public nonisolated let modelContainer: ModelContainer
    public nonisolated let modelExecutor: any ModelExecutor
    private let now: @Sendable () -> Date

    public init(modelContainer: ModelContainer, now: @escaping @Sendable () -> Date = Date.init) {
        self.modelContainer = modelContainer
        modelExecutor = DefaultSerialModelExecutor(modelContext: ModelContext(modelContainer))
        self.now = now
    }

    public func images(for itemID: UUID) throws -> ItemImages? {
        guard let image = try item(itemID)?.image, image.deletedAt == nil else { return nil }
        return ItemImages(cutout: image.cutout, thumbnail: image.thumbnail, original: image.original, contentHash: image.contentHash)
    }

    public func setImages(_ images: ItemImages, for itemID: UUID) throws {
        guard let item = try item(itemID) else { throw RepositoryError.notFound(itemID) }
        let date = now()
        let record = item.image ?? {
            let record = ItemImageEntity()
            record.createdAt = date
            modelContext.insert(record)
            item.image = record
            return record
        }()
        record.cutout = images.cutout
        record.thumbnail = images.thumbnail
        record.original = images.original
        record.contentHash = images.contentHash
        record.updatedAt = date
        try modelContext.save()
    }

    private func item(_ id: UUID) throws -> ItemEntity? {
        var descriptor = FetchDescriptor<ItemEntity>(predicate: #Predicate { $0.id == id })
        descriptor.fetchLimit = 1
        return try modelContext.fetch(descriptor).first
    }
}

public actor SwiftDataOutfitRepository: OutfitRepository, ModelActor {
    public nonisolated let modelContainer: ModelContainer
    public nonisolated let modelExecutor: any ModelExecutor
    private let now: @Sendable () -> Date

    public init(modelContainer: ModelContainer, now: @escaping @Sendable () -> Date = Date.init) {
        self.modelContainer = modelContainer
        modelExecutor = DefaultSerialModelExecutor(modelContext: ModelContext(modelContainer))
        self.now = now
    }

    public func outfits() throws -> [SavedOutfit] {
        let descriptor = FetchDescriptor<OutfitEntity>(
            predicate: #Predicate { $0.deletedAt == nil },
            sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
        )
        return try modelContext.fetch(descriptor).map(\.domain)
    }

    public func outfit(id: UUID) throws -> SavedOutfit? {
        try entity(id).flatMap { $0.deletedAt == nil ? $0.domain : nil }
    }

    public func save(_ outfit: SavedOutfit) throws {
        let date = now()
        let record = try entity(outfit.id) ?? {
            let record = OutfitEntity(id: outfit.id)
            modelContext.insert(record)
            return record
        }()
        record.name = outfit.name
        record.sourceRaw = outfit.source.rawValue
        record.context = outfit.context
        record.createdAt = outfit.createdAt
        record.updatedAt = date
        record.deletedAt = outfit.deletedAt

        for entry in record.entries ?? [] { modelContext.delete(entry) }
        record.entries = try outfit.entries.map { entry in
            let row = OutfitEntryEntity()
            row.itemID = entry.itemID
            row.roleRaw = entry.role.rawValue
            row.sortIndex = entry.sortIndex
            row.createdAt = date
            row.updatedAt = date
            row.item = try item(entry.itemID)
            modelContext.insert(row)
            return row
        }
        try modelContext.save()
    }

    public func delete(id: UUID) throws {
        guard let record = try entity(id) else { throw RepositoryError.notFound(id) }
        let date = now()
        record.deletedAt = date
        record.updatedAt = date
        try modelContext.save()
    }

    private func entity(_ id: UUID) throws -> OutfitEntity? {
        var descriptor = FetchDescriptor<OutfitEntity>(predicate: #Predicate { $0.id == id })
        descriptor.fetchLimit = 1
        return try modelContext.fetch(descriptor).first
    }

    private func item(_ id: UUID) throws -> ItemEntity? {
        var descriptor = FetchDescriptor<ItemEntity>(predicate: #Predicate { $0.id == id })
        descriptor.fetchLimit = 1
        return try modelContext.fetch(descriptor).first
    }
}

public actor SwiftDataCollectionRepository: CollectionRepository, ModelActor {
    public nonisolated let modelContainer: ModelContainer
    public nonisolated let modelExecutor: any ModelExecutor
    private let now: @Sendable () -> Date

    public init(modelContainer: ModelContainer, now: @escaping @Sendable () -> Date = Date.init) {
        self.modelContainer = modelContainer
        modelExecutor = DefaultSerialModelExecutor(modelContext: ModelContext(modelContainer))
        self.now = now
    }

    public func collections() throws -> [OutfitCollection] {
        let descriptor = FetchDescriptor<CollectionEntity>(
            predicate: #Predicate { $0.deletedAt == nil },
            sortBy: [SortDescriptor(\.sortIndex), SortDescriptor(\.createdAt)]
        )
        return try modelContext.fetch(descriptor).map(\.domain)
    }

    /// Saves name, order, and cover. Membership changes go through `add` and `remove`.
    public func save(_ collection: OutfitCollection) throws {
        let record = try entity(collection.id) ?? {
            let record = CollectionEntity(id: collection.id)
            modelContext.insert(record)
            return record
        }()
        record.name = collection.name
        record.sortIndex = collection.sortIndex
        record.coverOutfitID = collection.coverOutfitID
        record.createdAt = collection.createdAt
        record.updatedAt = now()
        record.deletedAt = collection.deletedAt
        try modelContext.save()
    }

    public func delete(id: UUID) throws {
        let record = try liveEntity(id)
        let date = now()
        record.deletedAt = date
        record.updatedAt = date
        try modelContext.save()
    }

    public func add(outfitID: UUID, to collectionID: UUID) throws {
        let record = try liveEntity(collectionID)
        let live = (record.entries ?? []).filter { $0.deletedAt == nil }
        guard !live.contains(where: { $0.outfitID == outfitID }) else { return }
        let date = now()
        let entry = CollectionEntryEntity()
        entry.outfitID = outfitID
        entry.sortIndex = (live.map(\.sortIndex).max() ?? -1) + 1
        entry.addedAt = date
        entry.createdAt = date
        entry.updatedAt = date
        entry.outfit = try outfit(outfitID)
        modelContext.insert(entry)
        record.entries = (record.entries ?? []) + [entry]
        record.updatedAt = date
        try modelContext.save()
    }

    public func remove(outfitID: UUID, from collectionID: UUID) throws {
        let record = try liveEntity(collectionID)
        let date = now()
        for entry in record.entries ?? [] where entry.outfitID == outfitID && entry.deletedAt == nil {
            entry.deletedAt = date
            entry.updatedAt = date
        }
        record.updatedAt = date
        try modelContext.save()
    }

    private func entity(_ id: UUID) throws -> CollectionEntity? {
        var descriptor = FetchDescriptor<CollectionEntity>(predicate: #Predicate { $0.id == id })
        descriptor.fetchLimit = 1
        return try modelContext.fetch(descriptor).first
    }

    private func liveEntity(_ id: UUID) throws -> CollectionEntity {
        guard let record = try entity(id), record.deletedAt == nil else { throw RepositoryError.notFound(id) }
        return record
    }

    private func outfit(_ id: UUID) throws -> OutfitEntity? {
        var descriptor = FetchDescriptor<OutfitEntity>(predicate: #Predicate { $0.id == id })
        descriptor.fetchLimit = 1
        return try modelContext.fetch(descriptor).first
    }
}

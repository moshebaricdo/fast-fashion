import Foundation

/// The persistence boundary. Features depend on these protocols and receive plain value types;
/// the SwiftData implementation lives in `FastFashionKit/Persistence`, and a different backend
/// (e.g. Supabase) would only need new conformances.
///
/// Deletes are soft (they set `deletedAt`) so they can sync. Reads exclude soft-deleted records.
/// Saves are upserts keyed by `id` and stamp `updatedAt`.
public protocol ItemRepository: Sendable {
    func items() async throws -> [WardrobeItem]
    func item(id: UUID) async throws -> WardrobeItem?
    func save(_ item: WardrobeItem) async throws
    func delete(id: UUID) async throws
}

public protocol ItemImageRepository: Sendable {
    func images(for itemID: UUID) async throws -> ItemImages?
    func setImages(_ images: ItemImages, for itemID: UUID) async throws
}

public protocol OutfitRepository: Sendable {
    func outfits() async throws -> [SavedOutfit]
    func outfit(id: UUID) async throws -> SavedOutfit?
    func save(_ outfit: SavedOutfit) async throws
    func delete(id: UUID) async throws
}

public protocol CollectionRepository: Sendable {
    /// Sorted by `sortIndex`.
    func collections() async throws -> [OutfitCollection]
    func save(_ collection: OutfitCollection) async throws
    func delete(id: UUID) async throws
    /// Appends the outfit; does nothing if it is already on the board.
    func add(outfitID: UUID, to collectionID: UUID) async throws
    func remove(outfitID: UUID, from collectionID: UUID) async throws
}

public enum RepositoryError: Error, Equatable, Sendable {
    case notFound(UUID)
}

/// All repositories, bundled for dependency injection.
public struct Repositories: Sendable {
    public var items: any ItemRepository
    public var images: any ItemImageRepository
    public var outfits: any OutfitRepository
    public var collections: any CollectionRepository

    public init(
        items: any ItemRepository, images: any ItemImageRepository,
        outfits: any OutfitRepository, collections: any CollectionRepository
    ) {
        self.items = items
        self.images = images
        self.outfits = outfits
        self.collections = collections
    }

    /// Non-persistent repositories for previews, tests, and the Linux build.
    public static func inMemory(items: [WardrobeItem] = [], now: @escaping @Sendable () -> Date = Date.init) -> Repositories {
        Repositories(
            items: InMemoryItemRepository(items: items, now: now),
            images: InMemoryItemImageRepository(),
            outfits: InMemoryOutfitRepository(now: now),
            collections: InMemoryCollectionRepository(now: now)
        )
    }
}

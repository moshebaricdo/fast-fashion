import Foundation
import Testing
@testable import WardrobeCore

/// A clock the tests can advance.
final class TestClock: @unchecked Sendable {
    private let lock = NSLock()
    private var current = Date(timeIntervalSince1970: 1_800_000_000)

    var now: Date { lock.withLock { current } }
    func advance(_ seconds: TimeInterval) { lock.withLock { current += seconds } }
}

@Suite("In-memory repositories")
struct InMemoryRepositoryTests {
    @Test func itemSaveFetchAndSoftDelete() async throws {
        let clock = TestClock()
        let repo = InMemoryItemRepository(now: { clock.now })
        let item = SampleWardrobe.items[0]
        await repo.save(item)
        #expect(try await repo.items().map(\.id) == [item.id])
        #expect(try await repo.item(id: item.id)?.updatedAt == clock.now)

        clock.advance(60)
        try await repo.delete(id: item.id)
        #expect(try await repo.items().isEmpty)
        #expect(try await repo.item(id: item.id) == nil)
    }

    @Test func deletingUnknownItemThrows() async {
        let repo = InMemoryItemRepository()
        let id = UUID()
        await #expect(throws: RepositoryError.notFound(id)) { try await repo.delete(id: id) }
    }

    @Test func saveIsAnUpsert() async throws {
        let repo = InMemoryItemRepository(items: SampleWardrobe.items)
        var item = SampleWardrobe.items[2]
        item.name = "Renamed"
        await repo.save(item)
        #expect(try await repo.items().count == SampleWardrobe.items.count)
        #expect(try await repo.item(id: item.id)?.name == "Renamed")
    }

    @Test func outfitsNewestFirst() async throws {
        let repo = InMemoryOutfitRepository()
        let older = SavedOutfit(source: .manual, entries: [], createdAt: Date(timeIntervalSince1970: 1))
        let newer = SavedOutfit(source: .generated, entries: [], createdAt: Date(timeIntervalSince1970: 2))
        await repo.save(older)
        await repo.save(newer)
        #expect(try await repo.outfits().map(\.id) == [newer.id, older.id])
        try await repo.delete(id: newer.id)
        #expect(try await repo.outfits().map(\.id) == [older.id])
    }

    @Test func collectionMembership() async throws {
        let repo = InMemoryCollectionRepository()
        let work = OutfitCollection(name: "Work", sortIndex: 1)
        let travel = OutfitCollection(name: "Travel", sortIndex: 0)
        await repo.save(work)
        await repo.save(travel)
        #expect(try await repo.collections().map(\.name) == ["Travel", "Work"])

        let a = UUID(), b = UUID()
        try await repo.add(outfitID: a, to: work.id)
        try await repo.add(outfitID: b, to: work.id)
        try await repo.add(outfitID: a, to: work.id)
        try await repo.add(outfitID: a, to: travel.id)
        #expect(try await repo.collections().first { $0.id == work.id }?.outfitIDs == [a, b])

        try await repo.remove(outfitID: a, from: work.id)
        #expect(try await repo.collections().first { $0.id == work.id }?.outfitIDs == [b])
        #expect(try await repo.collections().first { $0.id == travel.id }?.outfitIDs == [a])

        try await repo.delete(id: travel.id)
        #expect(try await repo.collections().map(\.name) == ["Work"])
        await #expect(throws: RepositoryError.notFound(travel.id)) { try await repo.add(outfitID: b, to: travel.id) }
    }

    @Test func bundledRepositories() async throws {
        let repos = Repositories.inMemory(items: SampleWardrobe.items)
        #expect(try await repos.items.items().count == SampleWardrobe.items.count)
        let images = ItemImages(cutout: Data([1]), thumbnail: Data([2]), contentHash: "abc")
        try await repos.images.setImages(images, for: SampleWardrobe.id(1))
        #expect(try await repos.images.images(for: SampleWardrobe.id(1)) == images)
    }
}

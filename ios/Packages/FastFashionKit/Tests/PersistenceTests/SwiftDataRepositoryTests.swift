import Foundation
import SwiftData
import Testing
import WardrobeCore
@testable import Persistence

@Suite("SwiftData repositories")
struct SwiftDataRepositoryTests {
    let repos: Repositories

    init() throws {
        repos = PersistenceStack.repositories(container: try PersistenceStack.makeContainer(inMemory: true))
    }

    @Test func itemRoundTripPreservesEveryField() async throws {
        var item = SampleWardrobe.items[4]
        item.secondaryStyles = [.athletic]
        item.seasons = [.spring, .autumn]
        item.notes = "Linen blend"
        item.brand = "Acme"
        item.aiConfidence = 0.82
        item.colors = [ItemColor(family: .white, hex: "#FAFAFA", share: 0.6), ItemColor(family: .navy, share: 0.4)]
        try await repos.items.save(item)

        let loaded = try #require(try await repos.items.item(id: item.id))
        var expected = item
        expected.updatedAt = loaded.updatedAt
        #expect(loaded == expected)
    }

    @Test func softDeleteHidesItems() async throws {
        for item in SampleWardrobe.items.prefix(3) { try await repos.items.save(item) }
        try await repos.items.delete(id: SampleWardrobe.items[0].id)
        let ids = try await repos.items.items().map(\.id)
        #expect(ids == SampleWardrobe.items[1...2].map(\.id))
        #expect(try await repos.items.item(id: SampleWardrobe.items[0].id) == nil)
    }

    @Test func imagesAttachToItems() async throws {
        let item = SampleWardrobe.items[0]
        try await repos.items.save(item)
        let images = ItemImages(cutout: Data([1, 2]), thumbnail: Data([3]), contentHash: "h1")
        try await repos.images.setImages(images, for: item.id)
        #expect(try await repos.images.images(for: item.id) == images)

        let replaced = ItemImages(cutout: Data([9]), thumbnail: Data([8]), original: Data([7]), contentHash: "h2")
        try await repos.images.setImages(replaced, for: item.id)
        #expect(try await repos.images.images(for: item.id) == replaced)
    }

    @Test func savedOutfitsKeepEntriesAndContext() async throws {
        for item in SampleWardrobe.items { try await repos.items.save(item) }
        let byID = Dictionary(uniqueKeysWithValues: SampleWardrobe.items.map { ($0.id, $0) })
        let outfit = Outfit(onePiece: byID[SampleWardrobe.id(40)]!, shoes: byID[SampleWardrobe.id(65)]!, outer: byID[SampleWardrobe.id(81)]!)
        let context = ContextSnapshot(mode: .formal, feelsLikeC: 14, precipitationChance: 0.2, date: Date(timeIntervalSince1970: 1_800_000_000))
        let saved = SavedOutfit(outfit: outfit, source: .generated, name: "Gala", context: context)
        try await repos.outfits.save(saved)

        let loaded = try #require(try await repos.outfits.outfit(id: saved.id))
        #expect(loaded.entries == saved.entries)
        #expect(loaded.context == context)
        #expect(loaded.resolve(using: byID) == outfit)

        try await repos.outfits.delete(id: saved.id)
        #expect(try await repos.outfits.outfits().isEmpty)
    }

    @Test func collectionsKeepOrderAndMembership() async throws {
        let board = OutfitCollection(name: "Work")
        try await repos.collections.save(board)
        let a = UUID(), b = UUID(), c = UUID()
        for id in [a, b, c, a] { try await repos.collections.add(outfitID: id, to: board.id) }
        #expect(try await repos.collections.collections().first?.outfitIDs == [a, b, c])

        try await repos.collections.remove(outfitID: b, from: board.id)
        #expect(try await repos.collections.collections().first?.outfitIDs == [a, c])

        try await repos.collections.delete(id: board.id)
        #expect(try await repos.collections.collections().isEmpty)
    }
}

import Foundation
import SwiftData
import WardrobeCore

public enum PersistenceStack {
    public static let schema = Schema(versionedSchema: SchemaV1.self)

    /// Local-only for v1. To turn on sync later, pass `.private("iCloud.<bundle id>")` as the
    /// CloudKit database and add the iCloud + background-modes capabilities.
    public static func makeContainer(
        inMemory: Bool = false,
        cloudKitDatabase: ModelConfiguration.CloudKitDatabase = .none
    ) throws -> ModelContainer {
        let configuration = ModelConfiguration(
            schema: schema, isStoredInMemoryOnly: inMemory, cloudKitDatabase: cloudKitDatabase
        )
        return try ModelContainer(
            for: schema, migrationPlan: FastFashionMigrationPlan.self, configurations: configuration
        )
    }

    public static func repositories(
        container: ModelContainer, now: @escaping @Sendable () -> Date = Date.init
    ) -> Repositories {
        Repositories(
            items: SwiftDataItemRepository(modelContainer: container, now: now),
            images: SwiftDataItemImageRepository(modelContainer: container, now: now),
            outfits: SwiftDataOutfitRepository(modelContainer: container, now: now),
            collections: SwiftDataCollectionRepository(modelContainer: container, now: now)
        )
    }
}

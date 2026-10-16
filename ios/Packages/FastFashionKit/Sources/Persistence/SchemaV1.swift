import Foundation
import SwiftData
import WardrobeCore

// CloudKit-ready schema rules (sync is a later release, but the schema must not block it):
// - Client-generated UUID ids; no `@Attribute(.unique)`.
// - Every attribute has a default or is optional; every relationship is optional.
// - No ordered relationships: order is stored in `sortIndex`.
// - `createdAt` / `updatedAt` / `deletedAt` (soft delete) on every syncable entity.
// - Enums stored as raw strings so predicates and future migrations stay simple.
// - Image blobs live in their own entity so catalog fetches never load them.

public enum SchemaV1: VersionedSchema {
    public static let versionIdentifier = Schema.Version(1, 0, 0)

    public static var models: [any PersistentModel.Type] {
        [ItemEntity.self, ItemImageEntity.self, TagEntity.self, OutfitEntity.self,
         OutfitEntryEntity.self, CollectionEntity.self, CollectionEntryEntity.self]
    }
}

public enum FastFashionMigrationPlan: SchemaMigrationPlan {
    public static var schemas: [any VersionedSchema.Type] { [SchemaV1.self] }
    public static var stages: [MigrationStage] { [] }
}

public typealias ItemEntity = SchemaV1.ItemEntity
public typealias ItemImageEntity = SchemaV1.ItemImageEntity
public typealias TagEntity = SchemaV1.TagEntity
public typealias OutfitEntity = SchemaV1.OutfitEntity
public typealias OutfitEntryEntity = SchemaV1.OutfitEntryEntity
public typealias CollectionEntity = SchemaV1.CollectionEntity
public typealias CollectionEntryEntity = SchemaV1.CollectionEntryEntity

extension SchemaV1 {
    @Model
    public final class ItemEntity {
        #Index<ItemEntity>([\.id], [\.categoryRaw])

        public var id: UUID = UUID()
        public var createdAt: Date = Date.distantPast
        public var updatedAt: Date = Date.distantPast
        public var deletedAt: Date?

        public var name: String = ""
        public var categoryRaw: String = GarmentCategory.top.rawValue
        public var subcategoryKey: String = ""
        public var styleRaw: String = Style.casual.rawValue
        public var secondaryStylesRaw: [String] = []
        public var formality: Int = 3
        public var warmth: Int = 1
        public var colors: [ItemColor] = []
        public var patternRaw: String = Pattern.solid.rawValue
        /// Nil means "not tagged"; an empty array means "no season".
        public var seasonsRaw: [String]?
        public var isWaterResistant: Bool = false
        public var isRainSensitive: Bool = false
        public var statusRaw: String = ItemStatus.active.rawValue
        public var isFavorite: Bool = false
        public var notes: String?
        public var brand: String?
        public var tagSourceRaw: String = TagSource.user.rawValue
        public var aiConfidence: Double?
        public var needsReview: Bool = false
        public var taxonomyVersion: Int = Taxonomy.version
        public var processingStateRaw: String = ProcessingState.pending.rawValue

        @Relationship(deleteRule: .cascade, inverse: \ItemImageEntity.item)
        public var image: ItemImageEntity?
        @Relationship(inverse: \OutfitEntryEntity.item)
        public var outfitEntries: [OutfitEntryEntity]? = []
        @Relationship(inverse: \TagEntity.items)
        public var tags: [TagEntity]? = []

        public init(id: UUID = UUID()) {
            self.id = id
        }
    }

    @Model
    public final class ItemImageEntity {
        public var id: UUID = UUID()
        public var createdAt: Date = Date.distantPast
        public var updatedAt: Date = Date.distantPast
        public var deletedAt: Date?

        /// Transparent cutout, ≤1536 px.
        @Attribute(.externalStorage) public var cutout: Data = Data()
        /// ~400 px.
        @Attribute(.externalStorage) public var thumbnail: Data = Data()
        /// ≤2048 px, for re-processing. Candidate for excluding from sync.
        @Attribute(.externalStorage) public var original: Data?
        public var contentHash: String = ""

        public var item: ItemEntity?

        public init(id: UUID = UUID()) {
            self.id = id
        }
    }

    /// User-defined labels ("work", "travel").
    @Model
    public final class TagEntity {
        public var id: UUID = UUID()
        public var createdAt: Date = Date.distantPast
        public var updatedAt: Date = Date.distantPast
        public var deletedAt: Date?

        public var name: String = ""
        public var colorHex: String?
        public var items: [ItemEntity]? = []

        public init(id: UUID = UUID()) {
            self.id = id
        }
    }

    @Model
    public final class OutfitEntity {
        #Index<OutfitEntity>([\.id])

        public var id: UUID = UUID()
        public var createdAt: Date = Date.distantPast
        public var updatedAt: Date = Date.distantPast
        public var deletedAt: Date?

        public var name: String?
        public var sourceRaw: String = OutfitSource.manual.rawValue
        public var context: ContextSnapshot?

        @Relationship(deleteRule: .cascade, inverse: \OutfitEntryEntity.outfit)
        public var entries: [OutfitEntryEntity]? = []
        @Relationship(deleteRule: .cascade, inverse: \CollectionEntryEntity.outfit)
        public var collectionEntries: [CollectionEntryEntity]? = []

        public init(id: UUID = UUID()) {
            self.id = id
        }
    }

    /// Join between an outfit and an item, one per role.
    @Model
    public final class OutfitEntryEntity {
        public var id: UUID = UUID()
        public var createdAt: Date = Date.distantPast
        public var updatedAt: Date = Date.distantPast
        public var deletedAt: Date?

        /// Kept alongside the relationship: with sync, an entry can arrive before its item.
        public var itemID: UUID = UUID()
        public var roleRaw: String = GarmentCategory.top.rawValue
        public var sortIndex: Int = 0

        public var outfit: OutfitEntity?
        public var item: ItemEntity?

        public init(id: UUID = UUID()) {
            self.id = id
        }
    }

    @Model
    public final class CollectionEntity {
        public var id: UUID = UUID()
        public var createdAt: Date = Date.distantPast
        public var updatedAt: Date = Date.distantPast
        public var deletedAt: Date?

        public var name: String = ""
        public var sortIndex: Int = 0
        public var coverOutfitID: UUID?

        @Relationship(deleteRule: .cascade, inverse: \CollectionEntryEntity.collection)
        public var entries: [CollectionEntryEntity]? = []

        public init(id: UUID = UUID()) {
            self.id = id
        }
    }

    /// Join between a collection and an outfit; an outfit can be on several boards.
    @Model
    public final class CollectionEntryEntity {
        public var id: UUID = UUID()
        public var createdAt: Date = Date.distantPast
        public var updatedAt: Date = Date.distantPast
        public var deletedAt: Date?

        public var outfitID: UUID = UUID()
        public var sortIndex: Int = 0
        public var addedAt: Date = Date.distantPast

        public var collection: CollectionEntity?
        public var outfit: OutfitEntity?

        public init(id: UUID = UUID()) {
            self.id = id
        }
    }
}

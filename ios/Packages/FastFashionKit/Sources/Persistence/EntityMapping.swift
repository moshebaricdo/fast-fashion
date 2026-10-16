import Foundation
import WardrobeCore

// Mapping between SwiftData records and WardrobeCore values. Unknown raw values (e.g. from a
// newer app version on another device) fall back to safe defaults instead of failing the fetch.

extension ItemEntity {
    var domain: WardrobeItem {
        WardrobeItem(
            id: id,
            name: name,
            category: GarmentCategory(rawValue: categoryRaw) ?? .top,
            subcategoryKey: subcategoryKey,
            style: Style(rawValue: styleRaw) ?? .casual,
            secondaryStyles: Set(secondaryStylesRaw.compactMap(Style.init(rawValue:))),
            formality: formality,
            warmth: warmth,
            colors: colors,
            pattern: Pattern(rawValue: patternRaw) ?? .solid,
            seasons: seasonsRaw.map { Set($0.compactMap(Season.init(rawValue:))) },
            isWaterResistant: isWaterResistant,
            isRainSensitive: isRainSensitive,
            status: ItemStatus(rawValue: statusRaw) ?? .active,
            isFavorite: isFavorite,
            notes: notes,
            brand: brand,
            tagSource: TagSource(rawValue: tagSourceRaw) ?? .user,
            aiConfidence: aiConfidence,
            needsReview: needsReview,
            taxonomyVersion: taxonomyVersion,
            processingState: ProcessingState(rawValue: processingStateRaw) ?? .pending,
            createdAt: createdAt,
            updatedAt: updatedAt,
            deletedAt: deletedAt
        )
    }

    func apply(_ item: WardrobeItem) {
        name = item.name
        categoryRaw = item.category.rawValue
        subcategoryKey = item.subcategoryKey
        styleRaw = item.style.rawValue
        secondaryStylesRaw = item.secondaryStyles.map(\.rawValue).sorted()
        formality = item.formality
        warmth = item.warmth
        colors = item.colors
        patternRaw = item.pattern.rawValue
        seasonsRaw = item.seasons.map { $0.map(\.rawValue).sorted() }
        isWaterResistant = item.isWaterResistant
        isRainSensitive = item.isRainSensitive
        statusRaw = item.status.rawValue
        isFavorite = item.isFavorite
        notes = item.notes
        brand = item.brand
        tagSourceRaw = item.tagSource.rawValue
        aiConfidence = item.aiConfidence
        needsReview = item.needsReview
        taxonomyVersion = item.taxonomyVersion
        processingStateRaw = item.processingState.rawValue
        createdAt = item.createdAt
        updatedAt = item.updatedAt
        deletedAt = item.deletedAt
    }
}

extension OutfitEntity {
    var domain: SavedOutfit {
        let entries = (self.entries ?? [])
            .filter { $0.deletedAt == nil }
            .sorted { $0.sortIndex < $1.sortIndex }
            .map { OutfitEntry(itemID: $0.itemID, role: GarmentCategory(rawValue: $0.roleRaw) ?? .top, sortIndex: $0.sortIndex) }
        return SavedOutfit(
            id: id, name: name, source: OutfitSource(rawValue: sourceRaw) ?? .manual, entries: entries,
            context: context, createdAt: createdAt, updatedAt: updatedAt, deletedAt: deletedAt
        )
    }
}

extension CollectionEntity {
    var domain: OutfitCollection {
        let outfitIDs = (entries ?? [])
            .filter { $0.deletedAt == nil }
            .sorted { $0.sortIndex < $1.sortIndex }
            .map(\.outfitID)
        return OutfitCollection(
            id: id, name: name, sortIndex: sortIndex, coverOutfitID: coverOutfitID, outfitIDs: outfitIDs,
            createdAt: createdAt, updatedAt: updatedAt, deletedAt: deletedAt
        )
    }
}

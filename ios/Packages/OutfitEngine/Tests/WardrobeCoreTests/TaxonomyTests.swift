import Foundation
import Testing
@testable import WardrobeCore

@Suite("Taxonomy")
struct TaxonomyTests {
    @Test func keysAreUnique() {
        let keys = Taxonomy.subcategories.map(\.key)
        #expect(Set(keys).count == keys.count)
    }

    @Test(arguments: GarmentCategory.allCases)
    func everyCategoryHasSubcategories(_ category: GarmentCategory) {
        #expect(Taxonomy.subcategories(in: category).count >= 10)
    }

    @Test func valuesAreInRange() {
        for sub in Taxonomy.subcategories {
            #expect(Taxonomy.formalityRange.contains(sub.formality), "\(sub.key)")
            #expect(Taxonomy.warmthRange.contains(sub.warmth), "\(sub.key)")
            #expect(!(sub.isWaterResistant && sub.isRainSensitive), "\(sub.key)")
        }
    }

    @Test func taxonomyIsGenderInclusive() {
        for key in ["midi_skirt", "pencil_skirt", "sundress", "jumpsuit", "romper", "heels", "sports_bra", "blouse"] {
            #expect(Taxonomy.subcategory(key) != nil, "\(key)")
        }
    }

    @Test func onePieceFillsTopAndBottom() {
        #expect(GarmentCategory.onePiece.slots == [.top, .bottom])
        #expect(Taxonomy.subcategory("jumpsuit")?.category == .onePiece)
        #expect(Taxonomy.subcategory("cocktail_dress")?.category == .onePiece)
    }

    @Test func everyStyleIsRepresentedInEveryRequiredCategory() {
        for category in [GarmentCategory.top, .bottom, .shoes] {
            let styles = Set(Taxonomy.subcategories(in: category).map(\.defaultStyle))
            #expect(styles == Set(Style.allCases), "\(category)")
        }
    }

    @Test func rainFlags() {
        #expect(Taxonomy.subcategory("suede_boots")?.isRainSensitive == true)
        #expect(Taxonomy.subcategory("canvas_sneakers")?.isRainSensitive == true)
        #expect(Taxonomy.subcategory("raincoat")?.isWaterResistant == true)
    }

    @Test func boldPatterns() {
        #expect(!Pattern.solid.isBold)
        #expect(!Pattern.texture.isBold)
        #expect(Pattern.stripe.isBold && Pattern.graphic.isBold && Pattern.print.isBold && Pattern.check.isBold)
    }

    @Test func colorFamilies() {
        #expect(ColorFamily.navy.isNeutral && ColorFamily.denim.isNeutral && ColorFamily.olive.isNeutral)
        #expect(!ColorFamily.red.isNeutral && !ColorFamily.metallic.isNeutral)
        for family in ColorFamily.allCases {
            #expect((family.wheelPosition == nil) == (family.isNeutral || family == .metallic), "\(family)")
        }
    }

    @Test func lightnessFromHexAndFallback() {
        #expect(ItemColor(family: .black, hex: "#000000").lightness == 0)
        #expect(ItemColor(family: .white, hex: "FFFFFF").lightness == 1)
        #expect(ItemColor(family: .navy, hex: "not-a-color").lightness == ColorFamily.navy.defaultLightness)
        #expect(ItemColor(family: .navy).lightness == ColorFamily.navy.defaultLightness)
    }
}

@Suite("WardrobeItem")
struct WardrobeItemTests {
    @Test func defaultsComeFromSubcategory() throws {
        let sub = try #require(Taxonomy.subcategory("trench_coat"))
        let item = WardrobeItem(name: "Trench", subcategory: sub)
        #expect(item.category == .outer)
        #expect(item.style == .formal)
        #expect(item.formality == sub.formality)
        #expect(item.warmth == sub.warmth)
        #expect(item.isWaterResistant)
        #expect(item.taxonomyVersion == Taxonomy.version)
    }

    @Test func formalityAndWarmthAreClamped() {
        var item = WardrobeItem(name: "X", category: .top, subcategoryKey: "t_shirt", style: .casual, formality: 9, warmth: -2)
        #expect(item.formality == 5)
        #expect(item.warmth == 0)
        item.formality = 0
        item.warmth = 7
        #expect(item.formality == 1)
        #expect(item.warmth == 3)
    }

    @Test func colorsAreSortedByShare() {
        var item = WardrobeItem(
            name: "X", category: .top, subcategoryKey: "t_shirt", style: .casual, formality: 2, warmth: 0,
            colors: [ItemColor(family: .white, share: 0.2), ItemColor(family: .red, share: 0.8)]
        )
        #expect(item.dominantColor == .red)
        item.colors = [ItemColor(family: .blue, share: 0.1), ItemColor(family: .green, share: 0.9)]
        #expect(item.dominantColor == .green)
    }

    @Test func availability() {
        var item = SampleWardrobe.items[0]
        #expect(item.isAvailable)
        item.status = .laundry
        #expect(!item.isAvailable)
        item.status = .active
        item.deletedAt = Date()
        #expect(!item.isAvailable)
    }

    @Test func codableRoundTrip() throws {
        let item = SampleWardrobe.items[4]
        let data = try JSONEncoder().encode(item)
        #expect(try JSONDecoder().decode(WardrobeItem.self, from: data) == item)
    }
}

@Suite("Sample wardrobe and outfits")
struct SampleWardrobeTests {
    @Test func sampleItemsAreValid() {
        let items = SampleWardrobe.items
        #expect(Set(items.map(\.id)).count == items.count)
        for item in items {
            #expect(item.subcategory != nil, "\(item.name)")
            #expect(!item.colors.isEmpty, "\(item.name)")
            #expect(abs(item.colors.map(\.share).reduce(0, +) - 1) < 0.001, "\(item.name)")
        }
        for category in GarmentCategory.allCases {
            #expect(items.contains { $0.category == category })
        }
    }

    @Test func stableIDs() {
        #expect(SampleWardrobe.id(3).uuidString == "00000000-0000-0000-0000-000000000003")
        #expect(SampleWardrobe.id(255).uuidString == "00000000-0000-0000-0000-0000000000FF")
    }

    @Test func outfitSlots() {
        let byID = Dictionary(uniqueKeysWithValues: SampleWardrobe.items.map { ($0.id, $0) })
        let dress = byID[SampleWardrobe.id(40)]!
        let heels = byID[SampleWardrobe.id(65)]!
        let blazer = byID[SampleWardrobe.id(81)]!
        let outfit = Outfit(onePiece: dress, shoes: heels, outer: blazer)
        #expect(outfit.item(filling: .top) == dress)
        #expect(outfit.item(filling: .bottom) == dress)
        #expect(outfit.item(filling: .outer) == blazer)
        #expect(outfit.items.count == 3)
        #expect(outfit.pieces.map(\.role) == [.outer, .onePiece, .shoes])
    }

    @Test func savedOutfitResolves() {
        let byID = Dictionary(uniqueKeysWithValues: SampleWardrobe.items.map { ($0.id, $0) })
        let outfit = Outfit(top: byID[SampleWardrobe.id(1)]!, bottom: byID[SampleWardrobe.id(20)]!, shoes: byID[SampleWardrobe.id(60)]!)
        let saved = SavedOutfit(outfit: outfit, source: .generated)
        #expect(saved.entries.map(\.sortIndex) == [0, 1, 2])
        #expect(saved.resolve(using: byID) == outfit)

        var missingShoes = byID
        missingShoes[SampleWardrobe.id(60)] = nil
        #expect(saved.resolve(using: missingShoes) == nil)
    }
}

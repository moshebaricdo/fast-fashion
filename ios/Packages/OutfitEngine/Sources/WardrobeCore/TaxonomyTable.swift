import Foundation

/// The versioned, in-app taxonomy. Items record `taxonomyVersion` so they can be migrated when
/// this table changes. Bump `version` whenever keys are renamed or removed.
public enum Taxonomy {
    public static let version = 1

    public static let subcategories: [Subcategory] = tops + bottoms + onePieces + shoes + outerwear

    private static let byKey: [String: Subcategory] =
        Dictionary(uniqueKeysWithValues: subcategories.map { ($0.key, $0) })

    public static func subcategory(_ key: String) -> Subcategory? { byKey[key] }

    public static func subcategories(in category: GarmentCategory) -> [Subcategory] {
        subcategories.filter { $0.category == category }
    }

    public static let formalityRange = 1...5
    public static let warmthRange = 0...3

    private static func entry(
        _ key: String, _ name: String, _ category: GarmentCategory, _ style: Style,
        formality: Int, warmth: Int, waterResistant: Bool = false, rainSensitive: Bool = false
    ) -> Subcategory {
        Subcategory(
            key: key, displayName: name, category: category, defaultStyle: style,
            formality: formality, warmth: warmth,
            isWaterResistant: waterResistant, isRainSensitive: rainSensitive
        )
    }

    static let tops: [Subcategory] = [
        entry("t_shirt", "T-shirt", .top, .casual, formality: 2, warmth: 0),
        entry("long_sleeve_tee", "Long-sleeve tee", .top, .casual, formality: 2, warmth: 1),
        entry("tank_top", "Tank top", .top, .casual, formality: 1, warmth: 0),
        entry("camisole", "Camisole", .top, .casual, formality: 2, warmth: 0),
        entry("crop_top", "Crop top", .top, .casual, formality: 2, warmth: 0),
        entry("bodysuit", "Bodysuit", .top, .casual, formality: 2, warmth: 0),
        entry("polo", "Polo shirt", .top, .casual, formality: 3, warmth: 0),
        entry("henley", "Henley", .top, .casual, formality: 2, warmth: 1),
        entry("oxford_shirt", "Oxford shirt", .top, .casual, formality: 3, warmth: 1),
        entry("flannel_shirt", "Flannel shirt", .top, .casual, formality: 2, warmth: 2),
        entry("dress_shirt", "Dress shirt", .top, .formal, formality: 4, warmth: 1),
        entry("blouse", "Blouse", .top, .casual, formality: 3, warmth: 1),
        entry("silk_blouse", "Silk blouse", .top, .formal, formality: 4, warmth: 0),
        entry("turtleneck", "Turtleneck", .top, .casual, formality: 3, warmth: 2),
        entry("sweater", "Sweater", .top, .casual, formality: 3, warmth: 2),
        entry("fine_knit", "Fine-knit sweater", .top, .formal, formality: 4, warmth: 1),
        entry("sweatshirt", "Sweatshirt", .top, .casual, formality: 1, warmth: 2),
        entry("hoodie", "Hoodie", .top, .casual, formality: 1, warmth: 2),
        entry("athletic_top", "Athletic top", .top, .athletic, formality: 1, warmth: 0),
        entry("sports_bra", "Sports bra", .top, .athletic, formality: 1, warmth: 0),
    ]

    static let bottoms: [Subcategory] = [
        entry("jeans", "Jeans", .bottom, .casual, formality: 2, warmth: 1),
        entry("chinos", "Chinos", .bottom, .casual, formality: 3, warmth: 1),
        entry("cargo_pants", "Cargo pants", .bottom, .casual, formality: 2, warmth: 1),
        entry("corduroys", "Corduroys", .bottom, .casual, formality: 2, warmth: 2),
        entry("wide_leg_trousers", "Wide-leg trousers", .bottom, .casual, formality: 3, warmth: 1),
        entry("dress_trousers", "Dress trousers", .bottom, .formal, formality: 4, warmth: 1),
        entry("wool_trousers", "Wool trousers", .bottom, .formal, formality: 4, warmth: 2),
        entry("shorts", "Shorts", .bottom, .casual, formality: 2, warmth: 0),
        entry("denim_shorts", "Denim shorts", .bottom, .casual, formality: 2, warmth: 0),
        entry("athletic_shorts", "Athletic shorts", .bottom, .athletic, formality: 1, warmth: 0),
        entry("joggers", "Joggers", .bottom, .athletic, formality: 1, warmth: 1),
        entry("leggings", "Leggings", .bottom, .athletic, formality: 1, warmth: 1),
        entry("mini_skirt", "Mini skirt", .bottom, .casual, formality: 2, warmth: 0),
        entry("midi_skirt", "Midi skirt", .bottom, .casual, formality: 3, warmth: 1),
        entry("maxi_skirt", "Maxi skirt", .bottom, .casual, formality: 3, warmth: 1),
        entry("pleated_skirt", "Pleated skirt", .bottom, .casual, formality: 3, warmth: 1),
        entry("pencil_skirt", "Pencil skirt", .bottom, .formal, formality: 4, warmth: 1),
        entry("tennis_skirt", "Tennis skirt", .bottom, .athletic, formality: 1, warmth: 0),
    ]

    static let onePieces: [Subcategory] = [
        entry("casual_dress", "Casual dress", .onePiece, .casual, formality: 2, warmth: 0),
        entry("sundress", "Sundress", .onePiece, .casual, formality: 2, warmth: 0),
        entry("shirt_dress", "Shirt dress", .onePiece, .casual, formality: 3, warmth: 1),
        entry("wrap_dress", "Wrap dress", .onePiece, .casual, formality: 3, warmth: 1),
        entry("knit_dress", "Knit dress", .onePiece, .casual, formality: 3, warmth: 2),
        entry("cocktail_dress", "Cocktail dress", .onePiece, .formal, formality: 4, warmth: 0),
        entry("evening_gown", "Evening gown", .onePiece, .formal, formality: 5, warmth: 0),
        entry("jumpsuit", "Jumpsuit", .onePiece, .casual, formality: 3, warmth: 1),
        entry("formal_jumpsuit", "Formal jumpsuit", .onePiece, .formal, formality: 4, warmth: 1),
        entry("romper", "Romper", .onePiece, .casual, formality: 2, warmth: 0),
        entry("overalls", "Overalls", .onePiece, .casual, formality: 1, warmth: 1),
        entry("unitard", "Athletic unitard", .onePiece, .athletic, formality: 1, warmth: 0),
    ]

    static let shoes: [Subcategory] = [
        entry("sneakers", "Sneakers", .shoes, .casual, formality: 2, warmth: 1),
        entry("canvas_sneakers", "Canvas sneakers", .shoes, .casual, formality: 2, warmth: 1, rainSensitive: true),
        entry("running_shoes", "Running shoes", .shoes, .athletic, formality: 1, warmth: 1),
        entry("training_shoes", "Training shoes", .shoes, .athletic, formality: 1, warmth: 1),
        entry("hiking_boots", "Hiking boots", .shoes, .athletic, formality: 1, warmth: 2, waterResistant: true),
        entry("loafers", "Loafers", .shoes, .casual, formality: 3, warmth: 1),
        entry("suede_loafers", "Suede loafers", .shoes, .casual, formality: 3, warmth: 1, rainSensitive: true),
        entry("derby_shoes", "Derby shoes", .shoes, .formal, formality: 4, warmth: 1),
        entry("oxford_shoes", "Oxford shoes", .shoes, .formal, formality: 4, warmth: 1),
        entry("chelsea_boots", "Chelsea boots", .shoes, .casual, formality: 3, warmth: 2),
        entry("suede_boots", "Suede boots", .shoes, .casual, formality: 3, warmth: 2, rainSensitive: true),
        entry("ankle_boots", "Ankle boots", .shoes, .casual, formality: 3, warmth: 2),
        entry("knee_boots", "Knee-high boots", .shoes, .casual, formality: 3, warmth: 3),
        entry("combat_boots", "Combat boots", .shoes, .casual, formality: 2, warmth: 2),
        entry("rain_boots", "Rain boots", .shoes, .casual, formality: 1, warmth: 2, waterResistant: true),
        entry("heels", "Heels", .shoes, .formal, formality: 4, warmth: 0),
        entry("block_heels", "Block heels", .shoes, .casual, formality: 3, warmth: 0),
        entry("dress_sandals", "Dress sandals", .shoes, .formal, formality: 4, warmth: 0),
        entry("ballet_flats", "Ballet flats", .shoes, .casual, formality: 3, warmth: 0),
        entry("mules", "Mules", .shoes, .casual, formality: 3, warmth: 0),
        entry("sandals", "Sandals", .shoes, .casual, formality: 2, warmth: 0),
        entry("espadrilles", "Espadrilles", .shoes, .casual, formality: 2, warmth: 0, rainSensitive: true),
        entry("slides", "Slides", .shoes, .casual, formality: 1, warmth: 0),
    ]

    static let outerwear: [Subcategory] = [
        entry("denim_jacket", "Denim jacket", .outer, .casual, formality: 2, warmth: 1),
        entry("bomber_jacket", "Bomber jacket", .outer, .casual, formality: 2, warmth: 1),
        entry("leather_jacket", "Leather jacket", .outer, .casual, formality: 3, warmth: 1),
        entry("cardigan", "Cardigan", .outer, .casual, formality: 2, warmth: 1),
        entry("shacket", "Shirt jacket", .outer, .casual, formality: 2, warmth: 2),
        entry("blazer", "Blazer", .outer, .formal, formality: 4, warmth: 1),
        entry("trench_coat", "Trench coat", .outer, .formal, formality: 4, warmth: 2, waterResistant: true),
        entry("overcoat", "Overcoat", .outer, .formal, formality: 4, warmth: 3),
        entry("wool_coat", "Wool coat", .outer, .casual, formality: 3, warmth: 3),
        entry("raincoat", "Raincoat", .outer, .casual, formality: 2, warmth: 1, waterResistant: true),
        entry("parka", "Parka", .outer, .casual, formality: 2, warmth: 3, waterResistant: true),
        entry("puffer", "Puffer jacket", .outer, .casual, formality: 2, warmth: 3),
        entry("fleece", "Fleece", .outer, .athletic, formality: 1, warmth: 2),
        entry("track_jacket", "Track jacket", .outer, .athletic, formality: 1, warmth: 1),
        entry("windbreaker", "Windbreaker", .outer, .athletic, formality: 1, warmth: 1, waterResistant: true),
        entry("rain_shell", "Rain shell", .outer, .athletic, formality: 1, warmth: 1, waterResistant: true),
    ]
}

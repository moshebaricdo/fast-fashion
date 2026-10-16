import Foundation

/// A fixed, gender-inclusive wardrobe for previews, the debug UI, and tests. IDs are stable.
public enum SampleWardrobe {
    public static let items: [WardrobeItem] = [
        // Tops
        make(1, "White T-shirt", "t_shirt", [.white]),
        make(2, "Black T-shirt", "t_shirt", [.black]),
        make(3, "Navy Oxford Shirt", "oxford_shirt", [.navy], favorite: true),
        make(4, "Light Blue Dress Shirt", "dress_shirt", [.blue]),
        make(5, "Breton Stripe Tee", "long_sleeve_tee", [.white, .navy], pattern: .stripe),
        make(6, "Grey Crewneck Sweater", "sweater", [.grey], pattern: .texture),
        make(7, "Cream Silk Blouse", "silk_blouse", [.beige]),
        make(8, "Red Check Flannel", "flannel_shirt", [.red, .black], pattern: .check),
        make(9, "Band Graphic Tee", "t_shirt", [.black, .yellow], pattern: .graphic),
        make(10, "Black Athletic Top", "athletic_top", [.black]),
        make(11, "Pink Sports Bra", "sports_bra", [.pink]),
        make(12, "Olive Hoodie", "hoodie", [.olive]),
        make(13, "Floral Blouse", "blouse", [.pink, .green], pattern: .print),
        // Bottoms
        make(20, "Blue Jeans", "jeans", [.denim], favorite: true),
        make(21, "Black Jeans", "jeans", [.black]),
        make(22, "Beige Chinos", "chinos", [.beige]),
        make(23, "Charcoal Dress Trousers", "dress_trousers", [.grey]),
        make(24, "Navy Pencil Skirt", "pencil_skirt", [.navy]),
        make(25, "Olive Pleated Midi Skirt", "midi_skirt", [.olive]),
        make(26, "Black Leggings", "leggings", [.black]),
        make(27, "Grey Joggers", "joggers", [.grey]),
        make(28, "Denim Shorts", "denim_shorts", [.denim]),
        make(29, "Black Athletic Shorts", "athletic_shorts", [.black]),
        // One-pieces
        make(40, "Black Cocktail Dress", "cocktail_dress", [.black]),
        make(41, "Yellow Sundress", "sundress", [.yellow]),
        make(42, "Navy Jumpsuit", "jumpsuit", [.navy]),
        make(43, "Floral Wrap Dress", "wrap_dress", [.blue, .white], pattern: .print),
        // Shoes
        make(60, "White Sneakers", "sneakers", [.white], favorite: true),
        make(61, "Black Running Shoes", "running_shoes", [.black]),
        make(62, "Brown Loafers", "loafers", [.brown]),
        make(63, "Tan Suede Boots", "suede_boots", [.beige]),
        make(64, "Black Oxford Shoes", "oxford_shoes", [.black]),
        make(65, "Black Heels", "heels", [.black]),
        make(66, "Brown Sandals", "sandals", [.brown]),
        make(67, "Black Ankle Boots", "ankle_boots", [.black]),
        make(68, "Yellow Rain Boots", "rain_boots", [.yellow]),
        // Outer layers
        make(80, "Denim Jacket", "denim_jacket", [.denim]),
        make(81, "Navy Blazer", "blazer", [.navy]),
        make(82, "Camel Overcoat", "overcoat", [.brown]),
        make(83, "Black Puffer", "puffer", [.black]),
        make(84, "Grey Track Jacket", "track_jacket", [.grey]),
        make(85, "Beige Trench Coat", "trench_coat", [.beige]),
        make(86, "Olive Rain Shell", "rain_shell", [.olive]),
        make(87, "Grey Cardigan", "cardigan", [.grey], pattern: .texture),
        make(88, "Navy Raincoat", "raincoat", [.navy]),
    ]

    /// A deterministic UUID whose last group is `n` in hex, e.g. `…-000000000003`.
    public static func id(_ n: Int) -> UUID {
        let hex = String(n, radix: 16)
        let padded = String(repeating: "0", count: max(0, 12 - hex.count)) + hex
        return UUID(uuidString: "00000000-0000-0000-0000-\(padded)")!
    }

    private static let referenceDate = Date(timeIntervalSince1970: 1_790_000_000)

    private static func make(
        _ n: Int, _ name: String, _ key: String, _ families: [ColorFamily],
        pattern: Pattern = .solid, favorite: Bool = false
    ) -> WardrobeItem {
        guard let subcategory = Taxonomy.subcategory(key) else {
            preconditionFailure("Unknown subcategory \(key)")
        }
        let colors = families.enumerated().map { index, family in
            let share = families.count == 1 ? 1 : (index == 0 ? 0.7 : 0.3 / Double(families.count - 1))
            return ItemColor(family: family, share: share)
        }
        return WardrobeItem(
            id: id(n), name: name, subcategory: subcategory, colors: colors, pattern: pattern,
            isFavorite: favorite, createdAt: referenceDate.addingTimeInterval(Double(n))
        )
    }
}

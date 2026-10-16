import SwiftUI
import WardrobeCore

// Deliberately unstyled: the grid, filters, and item editor come from Figma (M4). Photo import
// and AI tagging arrive in M1–M2; until then items are added by hand or from the sample set.

struct CatalogView: View {
    @Environment(AppEnvironment.self) private var env
    @State private var items: [WardrobeItem] = []
    @State private var isAdding = false

    var body: some View {
        NavigationStack {
            List {
                if items.isEmpty {
                    Button("Load sample wardrobe") { Task { await loadSamples() } }
                }
                ForEach(GarmentCategory.allCases, id: \.self) { category in
                    let inCategory = items.filter { $0.category == category }
                    if !inCategory.isEmpty {
                        Section(category.displayName) {
                            ForEach(inCategory) { item in
                                ItemRow(item: item) { await toggleFavorite(item) }
                            }
                            .onDelete { offsets in
                                let ids = offsets.map { inCategory[$0].id }
                                Task { await delete(ids) }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Catalog")
            .toolbar {
                Button("Add item", systemImage: "plus") { isAdding = true }
            }
            .sheet(isPresented: $isAdding) {
                AddItemView { item in
                    try? await env.repositories.items.save(item)
                    await reload()
                }
            }
            .task { await reload() }
        }
    }

    private func reload() async {
        items = (try? await env.repositories.items.items()) ?? []
    }

    private func loadSamples() async {
        for item in SampleWardrobe.items { try? await env.repositories.items.save(item) }
        await reload()
    }

    private func toggleFavorite(_ item: WardrobeItem) async {
        var item = item
        item.isFavorite.toggle()
        try? await env.repositories.items.save(item)
        await reload()
    }

    private func delete(_ ids: [UUID]) async {
        for id in ids { try? await env.repositories.items.delete(id: id) }
        await reload()
    }
}

private struct ItemRow: View {
    let item: WardrobeItem
    let toggleFavorite: () async -> Void

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(item.name)
                Text(details).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Button(item.isFavorite ? "Unfavorite" : "Favorite", systemImage: item.isFavorite ? "heart.fill" : "heart") {
                Task { await toggleFavorite() }
            }
            .labelStyle(.iconOnly)
            .buttonStyle(.borderless)
        }
    }

    private var details: String {
        let colors = item.colors.map(\.family.rawValue).joined(separator: "/")
        return "\(item.style.rawValue) · formality \(item.formality) · warmth \(item.warmth) · \(colors) · \(item.pattern.rawValue)"
    }
}

private struct AddItemView: View {
    @Environment(\.dismiss) private var dismiss
    let onSave: (WardrobeItem) async -> Void

    @State private var name = ""
    @State private var subcategoryKey = Taxonomy.subcategories[0].key
    @State private var color: ColorFamily = .black
    @State private var pattern: WardrobeCore.Pattern = .solid

    var body: some View {
        NavigationStack {
            Form {
                TextField("Name", text: $name)
                Picker("Type", selection: $subcategoryKey) {
                    ForEach(GarmentCategory.allCases, id: \.self) { category in
                        Section(category.displayName) {
                            ForEach(Taxonomy.subcategories(in: category)) { Text($0.displayName).tag($0.key) }
                        }
                    }
                }
                Picker("Main color", selection: $color) {
                    ForEach(ColorFamily.allCases, id: \.self) { Text($0.rawValue.capitalized).tag($0) }
                }
                Picker("Pattern", selection: $pattern) {
                    ForEach(WardrobeCore.Pattern.allCases, id: \.self) { Text($0.rawValue.capitalized).tag($0) }
                }
            }
            .navigationTitle("New item")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        guard let subcategory = Taxonomy.subcategory(subcategoryKey) else { return }
                        let item = WardrobeItem(
                            name: name.isEmpty ? subcategory.displayName : name, subcategory: subcategory,
                            colors: [ItemColor(family: color)], pattern: pattern
                        )
                        Task {
                            await onSave(item)
                            dismiss()
                        }
                    }
                }
            }
        }
    }
}

#Preview {
    CatalogView().environment(AppEnvironment.preview())
}

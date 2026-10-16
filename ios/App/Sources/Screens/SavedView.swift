import SwiftUI
import WardrobeCore

// Deliberately unstyled: the Pinterest-style board layout comes from Figma (M5).

struct SavedView: View {
    @Environment(AppEnvironment.self) private var env
    @State private var outfits: [SavedOutfit] = []
    @State private var collections: [OutfitCollection] = []
    @State private var itemsByID: [UUID: WardrobeItem] = [:]
    @State private var newCollectionName = ""

    var body: some View {
        NavigationStack {
            List {
                Section("Collections") {
                    ForEach(collections) { collection in
                        LabeledContent(collection.name, value: "\(collection.outfitIDs.count)")
                    }
                    HStack {
                        TextField("New collection", text: $newCollectionName)
                        Button("Add") { Task { await addCollection() } }
                            .disabled(newCollectionName.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
                Section("Saved outfits") {
                    if outfits.isEmpty {
                        Text("Save an outfit from Today to see it here.")
                    }
                    ForEach(outfits) { outfit in
                        VStack(alignment: .leading) {
                            Text(outfit.name ?? outfit.createdAt.formatted(date: .abbreviated, time: .shortened))
                            Text(summary(outfit)).font(.caption).foregroundStyle(.secondary)
                        }
                        .contextMenu {
                            ForEach(collections) { collection in
                                Button("Add to \(collection.name)") { Task { await add(outfit, to: collection) } }
                            }
                        }
                    }
                    .onDelete { offsets in
                        let ids = offsets.map { outfits[$0].id }
                        Task { await delete(ids) }
                    }
                }
            }
            .navigationTitle("Saved")
            .task { await reload() }
            .refreshable { await reload() }
        }
    }

    private func summary(_ outfit: SavedOutfit) -> String {
        outfit.entries.map { itemsByID[$0.itemID]?.name ?? "Missing item" }.joined(separator: " · ")
    }

    private func reload() async {
        outfits = (try? await env.repositories.outfits.outfits()) ?? []
        collections = (try? await env.repositories.collections.collections()) ?? []
        let items = (try? await env.repositories.items.items()) ?? []
        itemsByID = Dictionary(items.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
    }

    private func addCollection() async {
        let name = newCollectionName.trimmingCharacters(in: .whitespaces)
        try? await env.repositories.collections.save(OutfitCollection(name: name, sortIndex: collections.count))
        newCollectionName = ""
        await reload()
    }

    private func add(_ outfit: SavedOutfit, to collection: OutfitCollection) async {
        try? await env.repositories.collections.add(outfitID: outfit.id, to: collection.id)
        await reload()
    }

    private func delete(_ ids: [UUID]) async {
        for id in ids { try? await env.repositories.outfits.delete(id: id) }
        await reload()
    }
}

#Preview {
    SavedView().environment(AppEnvironment.preview())
}

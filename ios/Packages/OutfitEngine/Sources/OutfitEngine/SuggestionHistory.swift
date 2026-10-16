import Foundation
import WardrobeCore

/// A suggestion that was shown to the user. "Shown" is the only history signal the engine uses.
public struct ShownOutfit: Hashable, Codable, Sendable {
    /// Sorted for stable comparison.
    public var itemIDs: [UUID]
    public var topID: UUID?
    public var bottomID: UUID?
    public var shownAt: Date

    public init(outfit: Outfit, shownAt: Date) {
        itemIDs = outfit.items.map(\.id).sorted { $0.uuidString < $1.uuidString }
        if case let .separates(top, bottom) = outfit.base {
            topID = top.id
            bottomID = bottom.id
        }
        self.shownAt = shownAt
    }
}

/// Rolling log of recently shown suggestions, most recent first. Small and local by design: the
/// app keeps it in `UserDefaults`, not in the synced store.
public struct SuggestionHistory: Hashable, Codable, Sendable {
    public private(set) var entries: [ShownOutfit]
    public let capacity: Int

    public init(entries: [ShownOutfit] = [], capacity: Int = 50) {
        self.capacity = max(1, capacity)
        self.entries = Array(entries.prefix(self.capacity))
    }

    public mutating func record(_ outfit: Outfit, at date: Date = Date()) {
        entries.insert(ShownOutfit(outfit: outfit, shownAt: date), at: 0)
        if entries.count > capacity { entries.removeLast(entries.count - capacity) }
    }

    public mutating func removeAll() { entries.removeAll() }
}

/// Precomputed lookups over the history so scoring stays cheap inside the sampling loop.
struct HistoryIndex {
    private var positions: [UUID: [Int]] = [:]
    private var recentPairs: Set<String> = []
    private var recentOutfits: Set<String> = []
    let recencyWindow: Int
    let decay: Double

    init(_ history: SuggestionHistory, config: EngineConfig) {
        recencyWindow = config.recencyWindow
        decay = max(config.recencyDecay, 0.01)
        for (index, entry) in history.entries.enumerated() {
            for id in entry.itemIDs { positions[id, default: []].append(index) }
            if index < config.pairWindow, let top = entry.topID, let bottom = entry.bottomID {
                recentPairs.insert(Self.pairKey(top, bottom))
            }
            if index < config.dedupeWindow {
                recentOutfits.insert(Self.outfitKey(entry.itemIDs))
            }
        }
    }

    /// 0…1: 1 if the item was in the most recent suggestion, decaying with age.
    func recencyPenalty(_ id: UUID) -> Double {
        guard let indices = positions[id] else { return 0 }
        let sum = indices.lazy.filter { $0 < recencyWindow }.reduce(0.0) { $0 + exp(-Double($1) / decay) }
        return min(1, sum)
    }

    /// 0…1: 1 for items never shown in the log ("rediscover your closet").
    func varietyBonus(_ id: UUID) -> Double {
        1 / (1 + Double(positions[id]?.count ?? 0))
    }

    func pairShown(top: UUID, bottom: UUID) -> Bool {
        recentPairs.contains(Self.pairKey(top, bottom))
    }

    func outfitShown(_ ids: [UUID]) -> Bool {
        recentOutfits.contains(Self.outfitKey(ids))
    }

    static func pairKey(_ top: UUID, _ bottom: UUID) -> String { "\(top.uuidString)|\(bottom.uuidString)" }

    static func outfitKey(_ ids: [UUID]) -> String {
        ids.map(\.uuidString).sorted().joined(separator: ",")
    }
}

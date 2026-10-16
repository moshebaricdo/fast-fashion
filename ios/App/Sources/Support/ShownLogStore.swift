import Foundation
import OutfitEngine
import WardrobeCore

/// Persists the recently-shown log in `UserDefaults`. It is device-local on purpose and never
/// goes into the synced store.
@MainActor
final class ShownLogStore {
    private static let key = "shownSuggestionLog.v1"
    private let defaults: UserDefaults

    private(set) var history: SuggestionHistory

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        history = defaults.data(forKey: Self.key)
            .flatMap { try? JSONDecoder().decode(SuggestionHistory.self, from: $0) }
            ?? SuggestionHistory()
    }

    func record(_ outfit: Outfit, at date: Date = Date()) {
        history.record(outfit, at: date)
        if let data = try? JSONEncoder().encode(history) {
            defaults.set(data, forKey: Self.key)
        }
    }
}

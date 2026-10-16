import Foundation
import Observation
import OutfitEngine
import Persistence
import WardrobeCore

/// Composition root: the one place that decides which implementations the app uses.
@MainActor
@Observable
final class AppEnvironment {
    let repositories: Repositories
    let engine: OutfitEngine
    let shownLog: ShownLogStore
    let weather: any WeatherProvider

    init(repositories: Repositories, engine: OutfitEngine = OutfitEngine(), shownLog: ShownLogStore, weather: any WeatherProvider) {
        self.repositories = repositories
        self.engine = engine
        self.shownLog = shownLog
        self.weather = weather
    }

    static func live() -> AppEnvironment {
        let repositories: Repositories
        do {
            repositories = PersistenceStack.repositories(container: try PersistenceStack.makeContainer())
        } catch {
            // A broken store shouldn't brick the app during development; real recovery UX comes later.
            assertionFailure("Failed to open the store: \(error)")
            repositories = .inMemory()
        }
        return AppEnvironment(repositories: repositories, shownLog: ShownLogStore(), weather: NoWeatherProvider())
    }

    static func preview(items: [WardrobeItem] = SampleWardrobe.items) -> AppEnvironment {
        AppEnvironment(
            repositories: .inMemory(items: items),
            shownLog: ShownLogStore(defaults: UserDefaults(suiteName: "preview-\(UUID().uuidString)")!),
            weather: NoWeatherProvider()
        )
    }
}

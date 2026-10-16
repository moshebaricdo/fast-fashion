import Foundation
import OutfitEngine

/// Today's forecast for the engine. The WeatherKit implementation (daily cache, approximate
/// location, required Apple Weather attribution) lands in M3.
protocol WeatherProvider: Sendable {
    func todaysWeather() async -> WeatherInput?
}

/// No forecast: the engine ignores weather entirely.
struct NoWeatherProvider: WeatherProvider {
    func todaysWeather() async -> WeatherInput? { nil }
}

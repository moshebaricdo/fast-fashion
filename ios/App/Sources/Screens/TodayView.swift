import Observation
import OutfitEngine
import SwiftUI
import WardrobeCore

// Deliberately unstyled: layout and visuals come from Figma (M4).

@MainActor
@Observable
final class TodayModel {
    var mode: OutfitMode = .any
    private(set) var suggestion: OutfitSuggestion?
    private(set) var message: String?
    private(set) var savedConfirmation = false

    func shuffle(using env: AppEnvironment) async {
        savedConfirmation = false
        do {
            let wardrobe = try await env.repositories.items.items()
            let context = SuggestionContext(mode: mode, weather: await env.weather.todaysWeather())
            let result = try env.engine.suggest(
                wardrobe: wardrobe, context: context, history: env.shownLog.history,
                seed: UInt64.random(in: .min ... .max)
            )
            suggestion = result
            message = nil
            env.shownLog.record(result.outfit)
        } catch let error as SuggestionError {
            suggestion = nil
            message = Self.describe(error)
        } catch {
            suggestion = nil
            message = error.localizedDescription
        }
    }

    func save(using env: AppEnvironment) async {
        guard let outfit = suggestion?.outfit else { return }
        let snapshot = ContextSnapshot(mode: mode, date: Date())
        try? await env.repositories.outfits.save(SavedOutfit(outfit: outfit, source: .generated, context: snapshot))
        savedConfirmation = true
    }

    static func describe(_ error: SuggestionError) -> String {
        switch error {
        case .emptyWardrobe:
            "Add some items to your catalog to get outfits."
        case let .missingPieces(missing):
            "Add " + missing.map(\.rawValue).sorted().joined(separator: ", ") + " to get outfits."
        case .conflictingLocks:
            "Those locked items can't be worn together."
        case .noValidCombination:
            "No combination in your catalog fits the rules. Try another mode."
        }
    }
}

struct TodayView: View {
    @Environment(AppEnvironment.self) private var env
    @State private var model = TodayModel()

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Picker("Mode", selection: $model.mode) {
                        ForEach(OutfitMode.allCases, id: \.self) { Text($0.rawValue.capitalized).tag($0) }
                    }
                    .pickerStyle(.segmented)
                }

                if let suggestion = model.suggestion {
                    Section("Outfit") {
                        ForEach(suggestion.outfit.items) { item in
                            LabeledContent(item.category.displayName, value: item.name)
                        }
                    }
                    Section {
                        Button(model.savedConfirmation ? "Saved" : "Save outfit") {
                            Task { await model.save(using: env) }
                        }
                        .disabled(model.savedConfirmation)
                    }
                    Section("Debug") {
                        DisclosureGroup("Score breakdown") { ScoreBreakdownView(breakdown: suggestion.breakdown) }
                        if !suggestion.relaxations.isEmpty {
                            Text("Relaxed: " + suggestion.relaxations.map { "\($0)" }.joined(separator: ", "))
                                .font(.caption)
                        }
                    }
                } else if let message = model.message {
                    Text(message)
                }
            }
            .navigationTitle("Today")
            .refreshable { await model.shuffle(using: env) }
            .toolbar {
                Button("Shuffle", systemImage: "shuffle") { Task { await model.shuffle(using: env) } }
            }
            .task { if model.suggestion == nil { await model.shuffle(using: env) } }
            .onChange(of: model.mode) { Task { await model.shuffle(using: env) } }
        }
    }
}

struct ScoreBreakdownView: View {
    let breakdown: ScoreBreakdown

    var body: some View {
        Group {
            row("Color", breakdown.color)
            row("Accent penalty", breakdown.accentPenalty)
            row("Formality", breakdown.formality)
            row("Weather", breakdown.weather)
            row("Recency penalty", breakdown.recencyPenalty)
            row("Variety", breakdown.variety)
            row("Favorite", breakdown.favorite)
            row("Pattern penalty", breakdown.patternPenalty)
            row("Total", breakdown.total)
        }
        .font(.caption.monospacedDigit())
    }

    private func row(_ label: String, _ value: Double) -> some View {
        LabeledContent(label, value: value.formatted(.number.precision(.fractionLength(2))))
    }
}

#Preview {
    TodayView().environment(AppEnvironment.preview())
}

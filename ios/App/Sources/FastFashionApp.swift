import SwiftUI

@main
struct FastFashionApp: App {
    @State private var environment = AppEnvironment.live()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(environment)
        }
    }
}

struct RootView: View {
    @AppStorage(OnboardingView.completedKey) private var onboardingCompleted = false

    var body: some View {
        if onboardingCompleted {
            TabView {
                Tab("Today", systemImage: "sparkles") { TodayView() }
                Tab("Catalog", systemImage: "tshirt") { CatalogView() }
                Tab("Saved", systemImage: "square.grid.2x2") { SavedView() }
            }
        } else {
            OnboardingView()
        }
    }
}

#Preview {
    RootView()
        .environment(AppEnvironment.preview())
}

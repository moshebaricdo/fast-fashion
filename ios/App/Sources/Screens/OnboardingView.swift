import SwiftUI

// Stub of the multi-step first-launch flow. The real steps (location/weather permission, flat-lay
// photo guidance, bulk upload) and their visuals come from Figma (M4).

struct OnboardingView: View {
    static let completedKey = "onboardingCompleted"

    @AppStorage(Self.completedKey) private var completed = false
    @State private var step = 0

    private let steps = [
        ("Welcome", "Plan outfits from the clothes you already own."),
        ("Weather", "Allow location so outfits can match today's weather. (Permission prompt comes later.)"),
        ("Add your clothes", "Photograph items flat or on a hanger. (Bulk upload comes later.)"),
    ]

    var body: some View {
        VStack(spacing: 16) {
            Spacer()
            Text(steps[step].0).font(.title)
            Text(steps[step].1).multilineTextAlignment(.center)
            Spacer()
            Button(step == steps.count - 1 ? "Get started" : "Continue") {
                if step < steps.count - 1 { step += 1 } else { completed = true }
            }
            .buttonStyle(.borderedProminent)
            Button("Skip") { completed = true }
        }
        .padding()
    }
}

#Preview {
    OnboardingView()
}

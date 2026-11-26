import { Route, Routes } from "react-router-dom";
import { PhoneFrame } from "./components/PhoneFrame";
import { AnchorOrbit } from "./screens/AnchorOrbit";
import { DailyEdition } from "./screens/DailyEdition";
import { SmartReels } from "./screens/SmartReels";
import { Switcher } from "./screens/Switcher";
import { StudioProvider } from "./studio";

export function App() {
  return (
    <StudioProvider>
      <PhoneFrame>
        <Routes>
          <Route path="/" element={<Switcher />} />
          <Route path="/edition" element={<DailyEdition />} />
          <Route path="/orbit" element={<AnchorOrbit />} />
          <Route path="/reels" element={<SmartReels />} />
        </Routes>
      </PhoneFrame>
    </StudioProvider>
  );
}

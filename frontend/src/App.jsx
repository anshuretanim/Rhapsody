import Navbar from "./components/Navbar";
import Body from "./components/Body";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import About from "./pages/About";
import ChoosingPage from "./pages/ChoosingPage";
import CalculationPage from "./pages/CalculationPage";
import Versus from "./pages/Versus";
import RankingPage from "./pages/RankingPage";
function App() {
  return (
    <div>
      <BrowserRouter>
      <Navbar />
      
        <Routes>
          <Route path="/" element = {<Body />} />
          <Route path="/about" element={<About />} />
          <Route path="/choosing" element={<ChoosingPage />} />
          <Route path="/calculation" element={<CalculationPage />} />
          <Route path="/versus" element={<Versus />} />
          <Route path="/ranking" element={<RankingPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;

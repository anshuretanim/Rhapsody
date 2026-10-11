import Navbar from "./components/Navbar";
import Body from "./components/Body";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import About from "./pages/About";
import ChoosingPage from "./pages/ChoosingPage";

function App() {
  return (
    <div>
      <BrowserRouter>
      <Navbar />
      
        <Routes>
          <Route path="/" element = {<Body />} />
          <Route path="/about" element={<About />} />
          <Route path="/choosing" element={<ChoosingPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;

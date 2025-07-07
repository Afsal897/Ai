import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Import your page components
import Home from "./home";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home/>} />
      </Routes>
    </Router>
  );
}

export default App;

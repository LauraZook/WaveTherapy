import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import DisclaimerBar from "./components/DisclaimerBar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import PlanResult from "./pages/PlanResult";
import Reassess from "./pages/Reassess";
import Testimonial from "./pages/Testimonial";
import Admin from "./pages/Admin";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <DisclaimerBar />
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/plan/:id" element={<PlanResult />} />
          <Route path="/reassess" element={<Reassess />} />
          <Route path="/testimonial" element={<Testimonial />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
        <Footer />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;

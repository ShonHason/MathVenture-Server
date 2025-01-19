import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginRegistration from "./pages/login";
import QuizPage from "./pages/quiz";
import ChoosePlanPage from "./pages/plan";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginRegistration />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/plan" element={<ChoosePlanPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};
export default App;

import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import LoginRegistration from "./pages/login";
import HomePage from "./pages/HomePage";
import PageNotFound from "./pages/PageNotFound";
import LessonsContext from "./context/LessonsContext";
import QuizPage from "./pages/quiz";
import ChoosePlanPage from "./pages/plan";

const App: React.FC = () => {
  const [isMenuLessonsActive, setIsMenuLessonsActive] = useState(false);

  // Toggle function
  const handleLessonsClick = () => {
    setIsMenuLessonsActive((prev) => !prev);
  };

  return (
    <LessonsContext.Provider
      value={{
        onLessons: handleLessonsClick,
        isMenuLessonsActive,
        setIsMenuLessonsActive,
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginRegistration />} />
          <Route path="/home" element={<HomePage />}></Route>
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/plan" element={<ChoosePlanPage />} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </LessonsContext.Provider>
  );
};
export default App;

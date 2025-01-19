import React, { useContext, useEffect, useState } from "react";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import LoginRegistration from "./pages/login";
import QuizPage from "./pages/quiz";
import ChoosePlanPage from "./pages/plan";

const App: React.FC = () => {
  const [isMenuLessonsActive, setIsMenuLessonsActive] = useState(false);
  // useEffect(() => {
  //   if (isMenuLessonsActive) {
  //     navigate("/home/lessons");
  //   } else {
  //     navigate("/home");
  //   }
  // }, [isMenuLessonsActive, navigate]);

  // Toggle function
  const handleLessonsClick = () => {
    setIsMenuLessonsActive((prev) => !prev);
  };
  // function handleLessonsClick() {
  //   const navigate = useNavigate(); // Call `useNavigate` within the Router's context
  //   setIsMenuLessonsActive(!isMenuLessonsActive);
  //   isMenuLessonsActive ? navigate("/home/lessons") : navigate("/home");
  // }

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

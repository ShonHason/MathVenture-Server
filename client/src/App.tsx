import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginRegistration from "./pages/login";
import HomePage from "./pages/HomePage";
import Lessons from "./components/Lessons";
import PageNotFound from "./pages/PageNotFound";
import LessonsContext from "./context/LessonsContext";
import QuizPage from "./pages/quiz";
import ChoosePlanPage from "./pages/plan";
import HelpPage from "./pages/HelpPage";
import HelpContext from "./context/HelpContext";
// import Help from "./pages/Help";

const App: React.FC = () => {
  const [isMenuLessonsActive, setIsMenuLessonsActive] = useState(false);
  const [isMenuHelpActive, setIsMenuHelpActive] = useState(false);

  const [topics, setTopics] = useState<string[]>([]);
  const handleLessonsClick = () => {
    setIsMenuLessonsActive((prev) => !prev);
  };

  const handleHelpClick = () => {
    setIsMenuHelpActive((prev) => !prev);
  };

  return (
    <HelpContext.Provider
      value={{
        onHelp: handleHelpClick,
        isMenuHelpActive,
        setIsMenuHelpActive,
      }}
    >
      <LessonsContext.Provider
        value={{
          onLessons: handleLessonsClick,
          isMenuLessonsActive,
          setIsMenuLessonsActive,
          topics,
          setTopics,
        }}
      >
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginRegistration />} />
            <Route path="/home" element={<HomePage />}>
              <Route path="lessons" element={<Lessons />} />
              <Route path="help" element={<HelpPage />} />
            </Route>
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/plan" element={<ChoosePlanPage />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
      </LessonsContext.Provider>
    </HelpContext.Provider>
  );
};

export default App;

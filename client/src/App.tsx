import React, { useContext, useEffect, useState } from "react";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import LoginRegistration from "./pages/login";
import HomePage from "./pages/HomePage";
import Lessons from "./components/Lessons";
import PageNotFound from "./pages/PageNotFound";
import LessonsContext from "./context/LessonsContext";
import NavigationContext, {
  NavigationContextType,
} from "./context/NavigationContext";

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
          <Route path="/home" element={<HomePage />}>
            <Route path="lessons" element={<Lessons />} />{" "}
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
    </LessonsContext.Provider>
  );
};

export default App;

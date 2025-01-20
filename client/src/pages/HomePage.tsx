import { Outlet, useNavigate } from "react-router-dom";
import SideBar from "../features/SideBar";
import React, { useContext, useEffect } from "react";
import LessonsContext from "../context/LessonsContext";
import "./HomePage.css";
import HomePageContent from "../ui/HomePageContent";
// import NavigationContext from "../context/NavigationContext";

interface SideBarProps {
  onLessons: () => void;
}
interface HomePageProps {}

const HomePage: React.FC<HomePageProps> = () => {
  const navigate = useNavigate();

  return (
    <>
      <div className="homepage-container">
        <SideBar />
        <div className="outlet-container">
          {window.location.pathname === "/home" ? (
            <HomePageContent />
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </>
  );
};

export default HomePage;

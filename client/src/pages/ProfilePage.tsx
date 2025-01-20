import React, { useState } from "react";
import "./ProfilePage.css";
import PersonalInfo from "../components/PersonalInfo"; // Import the PersonalInfo component
import DeleteAccount from "../components/DeleteAccount";
import PersonalArea from "../components/PersonalArea";

interface ProfilePageProps {}

const ProfilePage: React.FC<ProfilePageProps> = () => {
  const [activeTab, setActiveTab] = useState("details");

  const handleTabChange = (tab: string): void => {
    setActiveTab(tab);
  };

  return (
    <div className="profile-container-area1">
      <nav className="profile-nav1">
        <ul>
          <li
            onClick={() => handleTabChange("details")}
            className={activeTab === "details" ? "active1" : ""}
          >
            פרטים אישים
          </li>
          <li
            onClick={() => handleTabChange("subscriptions")}
            className={activeTab === "subscriptions" ? "active1" : ""}
          >
            מינוי תשלומים
          </li>
          <li
            onClick={() => handleTabChange("personal-area")}
            className={activeTab === "personal-area" ? "active1" : ""}
          >
            אזור אישי
          </li>
          <li
            onClick={() => handleTabChange("delete-account")}
            className={activeTab === "delete-account" ? "active1" : ""}
          >
            מחיקת חשבון
          </li>
        </ul>
      </nav>
      <div className="tab-content-container">
        {activeTab === "details" && <PersonalInfo />}
        {activeTab === "subscriptions" && <div>מידע על מינוי תשלומים כאן</div>}
        {activeTab === "personal-area" && <PersonalArea />}
        {activeTab === "delete-account" && <DeleteAccount />}
      </div>
    </div>
  );
};

export default ProfilePage;

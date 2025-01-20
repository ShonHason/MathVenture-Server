import React, { useState } from "react";
import "./SettingsPage.css"; // Make sure to link your CSS file
import SecuritySettings from "../components/SecuritySettings";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("voice");

  interface SettingsPageProps {}

  interface TabChangeHandler {
    (tab: string): void;
  }

  const handleTabChange: TabChangeHandler = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="settings-container">
      <nav className="settings-nav">
        <ul>
          <li
            onClick={() => handleTabChange("voice")}
            className={activeTab === "voice" ? "active" : ""}
          >
            הגדרות קול
          </li>
          <li
            onClick={() => handleTabChange("display")}
            className={activeTab === "display" ? "active" : ""}
          >
            הגדרת תצוגה
          </li>
          <li
            onClick={() => handleTabChange("security")}
            className={activeTab === "security" ? "active" : ""}
          >
            הגדרות אבטחה
          </li>
        </ul>
      </nav>
      <div className="settings-content">
        {activeTab === "voice" && <div>הגדרות קול כאן</div>}
        {activeTab === "display" && <div>הגדרת תצוגה כאן</div>}
        {activeTab === "security" && <SecuritySettings />}
      </div>
    </div>
  );
};

export default SettingsPage;

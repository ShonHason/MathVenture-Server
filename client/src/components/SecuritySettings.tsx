import React from "react";
import "./SecuritySettings.css"; // Make sure this is the correct path to your CSS file

const SecuritySettings = () => {
  return (
    <div className="security-settings-container">
      <div className="security-setting">
        <span>rotemziv@gmail.com</span>
        <p>:אימייל</p>
      </div>
      <div className="security-setting">
        <button>
          <span>שינוי סיסמא</span>
        </button>
        <p>:סיסמה</p>
      </div>
      <div className="security-setting">
        <span>050-6797952</span>
        <p>:מספר טלפון</p>
      </div>
      <div className="security-setting">
        <span>9/10</span>
        <p>:מספר הזדמנויות</p>
      </div>
      <div className="security-setting security-setting-auth">
        <label className="toggle-container">
          <input type="checkbox" checked />
        </label>
        <p>:אימות דו שלבי</p>
      </div>
      <div className="security-setting">
        <button className="security-setting-codes">Generate new codes</button>
      </div>
    </div>
  );
};

export default SecuritySettings;

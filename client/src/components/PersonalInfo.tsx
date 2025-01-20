import React from "react";
import "./PersonalInfo.css"; // Ensure the CSS file is correctly linked
import profileImg from "../images/profile.png";

const PersonalInfo = () => {
  return (
    <div className="personal-info-container">
      <div className="personal-info-profile-image">
        <img src={profileImg} alt="Profile" />
      </div>
      <div className="personal-info-input-group">
        <span className="inputs">
          <p>:שם מלא</p>
          <input
            className="input-obj"
            type="text"
            id="name"
            placeholder="הכנס שם מלא"
          />
        </span>
        <span className="inputs">
          <p>:אימייל</p>
          <input
            className="input-obj"
            type="email"
            id="email"
            placeholder="example@gmail.com"
          />
        </span>
        <span className="inputs">
          <p>:מספר טלפון</p>
          <input
            className="input-obj"
            type="tel"
            id="phone"
            placeholder="0504939124"
          />
        </span>
        <span className="inputs">
          <p>:כיתה</p>
          <input
            className="input-obj"
            type="text"
            id="class"
            placeholder=" הכנס כיתה"
          />
        </span>
      </div>
      <button className="personal-info-save-button">Save Change</button>
    </div>
  );
};

export default PersonalInfo;

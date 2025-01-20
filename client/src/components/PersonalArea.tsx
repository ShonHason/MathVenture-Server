import React from "react";
import "./PersonalArea.css"; // Ensure you link the CSS file
import Chart1 from "../images/chart1.png";
import Chart2 from "../images/chart2.png";
import Chart3 from "../images/chart3.png";
const PersonalArea = () => {
  return (
    <div className="personal-area-container">
      <h1>דוחות</h1>
      <div className="charts-container">
        <div className="bar-chart">
          <h2>מכירות מ-1 עד-12 דצמבר, 2020</h2>
          {/* Simulated Bar Chart */}
          <img src={Chart1} alt="Bar Chart" />
        </div>
        <div className="statistics-summary">
          <h2>משתמשים מובילים</h2>
          {/* Simulated User Statistics */}
          <img src={Chart2} alt="User Stats" />
        </div>
        <div className="pie-chart">
          <h2>מאזן המשתמשים</h2>
          {/* Simulated Pie Chart */}
          <img src={Chart3} alt="Pie Chart" />
        </div>
      </div>
    </div>
  );
};

export default PersonalArea;

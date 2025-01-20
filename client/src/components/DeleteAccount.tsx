import React, { useState } from "react";
import "./DeleteAccount.css"; // Ensure the CSS file is correctly linked

const DeleteAccount = () => {
  const [password, setPassword] = useState("");

  const handleDelete = () => {
    if (password) {
      // You might want to add more specific validation
      console.log("Deleting account...");
      // Here, you would typically handle the deletion by calling an API
      // Ensure this function is secure and communicates over HTTPS
    } else {
      alert("Please enter your password to confirm account deletion.");
    }
  };

  return (
    <div className="delete-account-container">
      <h1>מחיקת חשבון</h1>
      <input
        type="password" // Ensures the password is obscured
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password to confirm"
        className="delete-input"
      />
      <p>
        מחיקת הפרופיל תסיר את כל המידע האישי שלך באופן קבוע ולא יהיה ניתן לשחזרו
      </p>
      <button onClick={handleDelete} className="delete-button">
        Delete Account
      </button>
    </div>
  );
};

export default DeleteAccount;

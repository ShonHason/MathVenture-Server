import profileImg from "../images/profile.png";
import "./Profile.css";
function Profile() {
  let userName = "רותם";
  let userClass = "כיתה ג";
  return (
    <div className="profile-container">
      <img src={profileImg} alt="profile" className="profile-picture" />
      <div className="name-class-container">
        <h1 className="profile-username">{userName}</h1>
        <p className="profile-userclass">{userClass}</p>
      </div>
    </div>
  );
}

export default Profile;

import { ProSidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import {
  HomeOutlined,
  UserOutlined,
  BookOutlined,
  QuestionCircleOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import "./SideBar.css";
import Profile from "../components/Profile";
import HelpContext from "../context/HelpContext";
import { useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import path from "path";

interface SideBarProps {
  // onLessons: () => void;
}

const SideBar: React.FC<SideBarProps> = () => {
  const helpContext = useContext(HelpContext);

  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };

  if (!helpContext) {
    throw new Error("SideBar must be used within a LessonsContext.Provider");
  }

  const { onHelp, isMenuHelpActive, setIsMenuHelpActive } = helpContext;

  useEffect(() => {
    isMenuHelpActive ? navigate("/home/help") : navigate("/home");
  }, [isMenuHelpActive, setIsMenuHelpActive]);

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <div className="sidebar">
      <ProSidebar>
        <Profile />

        {/* Top Menu Items */}
        <div className="menu-top-bottom-container">
          <div className="menu-top">
            <Menu>
              <MenuItem
                className="menu-item menu-item-home"
                onClick={() => navigate("/home")}
                active={
                  isActive("/home") &&
                  !isActive("/home/lessons") &&
                  !isActive("/home/help")
                }
              >
                <HomeOutlined />
                בית
              </MenuItem>
              <MenuItem
                className="menu-item menu-item-lessons"
                icon={<BookOutlined />}
                onClick={() => navigate("/home/lessons")}
                active={isActive("/home/lessons")}
              >
                שיעורים
              </MenuItem>
              <MenuItem
                className="menu-item menu-item-help"
                icon={<QuestionCircleOutlined />}
                onClick={() => navigate("/home/help")}
                active={isActive("/home/help")}
                // onClick={onHelp}
              >
                עזרה
              </MenuItem>
              <MenuItem
                className="menu-item menu-item-start-lesson"
                icon={<PlayCircleOutlined />}
              >
                התחלת שיעור
              </MenuItem>
            </Menu>
          </div>

          {/* Bottom Menu Items */}
          <div className="menu-bottom">
            <Menu>
              <MenuItem
                className="menu-item menu-item-upgrade"
                icon={<RocketOutlined />}
              >
                שדרוג
              </MenuItem>
              <MenuItem
                className="menu-item menu-item-profile"
                icon={<UserOutlined />}
                onClick={() => navigate("/home/profile")}
                active={isActive("/home/profile")}
              >
                פרופיל
              </MenuItem>
              <SubMenu
                title="הגדרות"
                className="menu-item menu-item-settings"
                icon={<SettingOutlined />}
                onClick={() => navigate("/home/settings")}
              />
              <MenuItem
                className="menu-item menu-item-logout"
                icon={<LogoutOutlined />}
                onClick={handleLogout} // Call handleLogout on click
              >
                התנתק/י
              </MenuItem>
            </Menu>
          </div>
        </div>
      </ProSidebar>
    </div>
  );
};
export default SideBar;

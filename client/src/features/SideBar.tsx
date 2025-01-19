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
import { use, useContext, useEffect, useState } from "react";
import LessonsContext from "../context/LessonsContext";
import { Link, useNavigate } from "react-router-dom";
import NavigationContext from "../context/NavigationContext";
import path from "path";
// import { NavigationProvider } from "../context-providers/NavigationProvider";
interface SideBarProps {
  onLessons: () => void; // Define the expected prop type for onLessons
  // navigate: (path: string) => void;
}

function SideBar({ onLessons }: SideBarProps) {
  return (
    <div className="sidebar">
      <ProSidebar>
        <Profile />
        {/* Top Menu Items */}
        <div className="menu-top-bottom-container">
          <div className="menu-top">
            <Menu>
              <MenuItem className="menu-item menu-item-home">
                <HomeOutlined />
                בית
              </MenuItem>
              <MenuItem
                className="menu-item menu-item-lessons"
                icon={<BookOutlined />}
                onClick={onLessons}
              >
                שיעורים
                {/* {handleLessonsClick()} */}
              </MenuItem>
              <MenuItem
                className="menu-item menu-item-help"
                icon={<QuestionCircleOutlined />}
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
              >
                פרופיל
              </MenuItem>
              <SubMenu
                title="הגדרות"
                className="menu-item menu-item-settings"
                icon={<SettingOutlined />}
              />
              <MenuItem
                className="menu-item menu-item-logout"
                icon={<LogoutOutlined />}
              >
                התנתק/י
              </MenuItem>
            </Menu>
          </div>
        </div>
      </ProSidebar>
    </div>
  );
}

export default SideBar;

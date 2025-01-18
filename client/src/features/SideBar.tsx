// import { ProSidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
// import {
//   HomeOutlined,
//   UserOutlined,
//   BookOutlined,
//   QuestionCircleOutlined,
//   PlayCircleOutlined,
//   RocketOutlined,
//   SettingOutlined,
//   LogoutOutlined,
// } from "@ant-design/icons";
// import "./SideBar.css";
// import Profile from "./Profile";

// function SideBar() {
//   return (
//     <div className="sidebar">
//       <ProSidebar>
//         <Profile />
//         <Menu>
//           {/* Home Button with default and additional classes */}
//           <MenuItem className={`menu-item menu-item-home`}>
//             <HomeOutlined style={{ marginRight: "8px" }} />
//             בית
//           </MenuItem>

//           <MenuItem
//             className={`menu-item menu-item-lessons`}
//             icon={<BookOutlined />}
//           >
//             שיעורים
//           </MenuItem>

//           <MenuItem
//             className={`menu-item menu-item-help`}
//             icon={<QuestionCircleOutlined />}
//           >
//             עזרה
//           </MenuItem>

//           <MenuItem
//             className={`menu-item menu-item-start-lesson`}
//             icon={<PlayCircleOutlined />}
//           >
//             התחלת שיעור
//           </MenuItem>

//           <MenuItem
//             className={`menu-item menu-item-start-upgrade`}
//             icon={<RocketOutlined />}
//           >
//             שדרוג
//           </MenuItem>
//           <MenuItem
//             className={`menu-item menu-item-start-profile`}
//             icon={<UserOutlined />}
//           >
//             פרופיל
//           </MenuItem>

//           {/* SubMenu Example */}
//           <SubMenu
//             title="הגדרות"
//             className="menu-item menu-item-settings"
//             icon={<SettingOutlined />}
//           ></SubMenu>
//           <MenuItem
//             className={`menu-item menu-item-start-profile`}
//             icon={<LogoutOutlined />}
//           >
//             התנתק/י
//           </MenuItem>
//         </Menu>
//       </ProSidebar>
//     </div>
//   );
// }

// export default SideBar;

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

function SideBar() {
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
              >
                שיעורים
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

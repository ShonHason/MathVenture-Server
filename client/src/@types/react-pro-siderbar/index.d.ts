declare module "react-pro-sidebar" {
  import * as React from "react";

  export interface ProSidebarProps {
    children?: React.ReactNode;
  }

  export interface SidebarHeaderProps {
    children?: React.ReactNode;
  }

  export interface SidebarContentProps {
    children?: React.ReactNode;
  }

  export interface MenuProps {
    children?: React.ReactNode;
  }

  export interface MenuItemProps {
    onClick?: any;
    children?: React.ReactNode;
    icon?: React.ReactNode; // Add icon property
    className?: string; // Add className property
  }

  export interface SubMenuProps {
    children?: React.ReactNode;
    title?: React.ReactNode; // Add title property
    icon?: React.ReactNode; // Add icon property
    className?: string; // Add className property
  }

  export const ProSidebar: React.FC<ProSidebarProps>;
  export const SidebarHeader: React.FC<SidebarHeaderProps>;
  export const SidebarContent: React.FC<SidebarContentProps>;
  export const Menu: React.FC<MenuProps>;
  export const MenuItem: React.FC<MenuItemProps>;
  export const SubMenu: React.FC<SubMenuProps>;
}

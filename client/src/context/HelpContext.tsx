import React, { createContext } from "react";

export interface HelpContextType {
  onHelp: () => void;
  isMenuHelpActive: boolean;
  setIsMenuHelpActive: React.Dispatch<React.SetStateAction<boolean>>;
}

const defaultState: HelpContextType = {
  onHelp: () => {}, // Placeholder function
  isMenuHelpActive: false,
  setIsMenuHelpActive: () => {}, // Placeholder function
};

const HelpContext = createContext<HelpContextType>(defaultState);

export default HelpContext;

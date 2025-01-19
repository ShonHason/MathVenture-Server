import { createContext } from "react";
import { NavigateFunction } from "react-router-dom";

export interface NavigationContextType {
  navigate: NavigateFunction; // React Router's navigate function
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export default NavigationContext;

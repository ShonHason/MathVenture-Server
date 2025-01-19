import { createContext, Dispatch, SetStateAction } from "react";

export interface LessonsContextType {
  onLessons: () => void; // Example method to handle an action, not an event
  isMenuLessonsActive: boolean;
  setIsMenuLessonsActive: React.Dispatch<React.SetStateAction<boolean>>;
}

// Type '(navigate: any) => void' is not assignable to type '() => void'.
// Target signature provides too few arguments. Expected 1 or more, but got 0.ts(2322)

// Provide a default value for TypeScript, even if it is temporary
const LessonsContext = createContext<LessonsContextType | null>(null);

export default LessonsContext;

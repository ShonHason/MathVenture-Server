import { createContext, Dispatch, SetStateAction } from "react";

export interface LessonsContextType {
  onLessons: () => void;
  isMenuLessonsActive: boolean;
  setIsMenuLessonsActive: React.Dispatch<React.SetStateAction<boolean>>;
  topics: string[]; // Add topics state
  setTopics: React.Dispatch<React.SetStateAction<string[]>>; // Add setTopics function
}

// Provide a default value for TypeScript, even if it is temporary
const LessonsContext = createContext<LessonsContextType | null>(null);

export default LessonsContext;

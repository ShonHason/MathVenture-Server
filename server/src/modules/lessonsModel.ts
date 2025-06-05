import mongoose, { Schema, Document } from "mongoose";
import { MathTopics } from "./enum/EducationalTopics";
import { progressType } from "./enum/progress";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
export interface QuestionLog {
 mathExpression: string; // the math expression being asked
  answer: [string] // the answer provided by the user
  botResponse?: [string]; // the response from the AI
}

const questionLogSchema = new Schema<QuestionLog>({

  mathExpression: { type: String, required: true },
  answer: { type: [String], required: true }, // array of answers
  botResponse: { type: [String], required: false } // array of bot responses
}, { _id: false }); // no separate _id for each sub‑document




export interface ILesson extends Document {
  userId: string;
  startTime: Date;
  endTime?: Date;
  mathQuestionsCount: number;
  correctAnswersCount: number; // optional field for correct answers count
  progress: progressType;
  subject: MathTopics;
  messages: ChatMessage[];      // <-- array of role/content objects
  questionLogs: QuestionLog[]; // <-- array of question logs
}

const chatMessageSchema = new Schema<ChatMessage>(
  {
    role: {
      type: String,
      enum: ["system", "user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { _id: false }  // no separate _id for each sub‑document
);

const lessonsSchema = new Schema<ILesson>(
  {
    userId:    { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime:   { type: Date, required: false },
    progress:  {
      type: String,
      enum: Object.values(progressType),
      default: progressType.NOT_STARTED,
      required: true,
    },
    mathQuestionsCount:{type: Number, default: 0},
    correctAnswersCount: { type: Number, default: 0 }, // optional field for correct answers count
    subject:   { type: String /*, enum: Object.values(MathTopics)*/, required: true },
    messages:  {
      type: [chatMessageSchema], 
      default: []
    }
    ,
    questionLogs: {
      type: [questionLogSchema],
      default: []
    }
  },
  {
    toJSON: {
      transform: (doc, ret) => {
        const { _id, ...rest } = ret;
        return { _id, ...rest };
      }
    }
  }
);

const lessonsModel = mongoose.model<ILesson>("Lessons", lessonsSchema);
export default lessonsModel;

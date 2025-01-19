import mongoose, { Schema, Document, Types } from "mongoose";
import { MathTopics } from "./enum/EducationalTopics";
import { progressType } from "./enum/progress";

export interface ILesson extends Document {
  userId: string;
  startTime: Date;
  endTime: Date;
  progress: progressType;
  subject: MathTopics;
}

const lessonsSchema = new Schema<ILesson>(
  {
    userId: {
      type: String,
      required: true,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    progress: {
      type: String,
      enum: Object.values(progressType),
      default: progressType.NOT_STARTED,
      required: true,
    },
    subject: {
      type: String,
      enum: Object.values(MathTopics),
      required: true,
    },
  },
  {
    toJSON: {
      transform: (doc, ret) => {
        // Ensure _id appears first in the JSON response
        const { _id, ...rest } = ret;
        return { _id, ...rest }; // Return _id first followed by the rest of the fields
      },
    },
  }
);

const lessonsModel = mongoose.model<ILesson>("Lessons", lessonsSchema);
export default lessonsModel;

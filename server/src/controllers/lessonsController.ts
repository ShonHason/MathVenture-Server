import lessonsModel, { ILesson } from "../modules/lessonsModel";
import { Request, Response } from "express";
import { BaseController } from "./baseController";
import mongoose from "mongoose";
import { generateLessonContent } from "../services/openaiServices";

class LessonsController extends BaseController<ILesson> {
  constructor() {
    super(lessonsModel);
  }
  async startLesson(req: Request, res: Response): Promise<void> {
    try {
      const { userId, grade, rank, subject } = req.body;
      console.log("Rank:", rank);
      console.log("userId", userId);

      // Create a prompt tailored to the user's information
      const prompt = `You are an expert math teacher for grade ${grade} students. 
Provide an engaging introduction lesson on ${subject} that is interactive and clear.`;

      // Generate lesson content using the AI service
      const lessonContent = await generateLessonContent(prompt);

    

      // Return the generated content
      res.status(200).json({ lessonContent });
    } catch (error: any) {
      console.error("Error in startLesson:", error);
      res.status(500).json({ error: "Failed to generate lesson content" });
    }
  }



  async getByUserId(req: Request, res: Response) {
    const userId = req.params.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).send("Bad Request");
      return;
    }
    try {
      const docs = await this.model.find({ userId: userId });
      if (docs.length === 0) {
        res.status(404).send("No data found");
        return;
      } else {
        res.status(200).send(docs);
        return;
      }
    } catch (err) {
      res.status(400).send(err);
      return;
    }
  }
  async updateEndTime(req: Request, res: Response) {
    const askedId = req.params._id;
    const endTime = req.body.endTime;
    try {
      if (!askedId || !endTime) {
        res.status(400).send("Bad Request");
        return;
      }
      const doc = await this.model.findByIdAndUpdate(
        askedId,
        { endTime: endTime },
        { new: true, runValidators: true }
      );
      if (!doc) {
        res.status(400).send("Bad Request");
        return;
      } else {
        res.status(200).send(doc);
        return;
      }
    } catch (err) {
      res.status(400).send(err);
    }
  }
}

export default new LessonsController();

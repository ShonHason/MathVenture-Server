import lessonsModel, { ILesson } from "../modules/lessonsModel";
import { Request, Response } from "express";
import { BaseController } from "./baseController";
import mongoose from "mongoose";


class LessonsController extends BaseController<ILesson> {
  constructor() {
    super(lessonsModel);
  }
  async startNewLesson(req: Request, res: Response): Promise<void> {

  // NEED SUBJECT,GRADE,RANK,NAME
    try {
      const { userId, subject , username , grade ,rank } = req.body;
      console.log("userId", userId);

      const defaultSystemPrompt = `
      You are a private math tutor for children in an excellent level.
      You patiently guide your student step by step,
      ask them questions to check understanding,
      provide clear examples and analogies,
      and tailor explanations to their level.
      Encourage them to think before you give the answer.
      All your answers should be in Hebrew, 
      one question at a time, 
      This specific lesson is for a student named ${username}
      who is in the ${grade} grade and is ranked ${rank} in the class.
      The subject of the lesson is ${subject}.
      You should ask the student questions to check their understanding.
      But you should help them to get the answer.
      put attention about the things you said and talk with them only about math and math related things.
      You should not talk about other things.
      please make use in the hebrew language well, 

      the lesson is goning to have 15 questions, in order from the easy to the hard.
      if the student is not able to answer a question,
      you should give them a hint and then ask them again.
      if the student make more the one mistake you should help him to understand the mistake, and explain him the answer slowly, becuase he's a child.
      in the begging of the lesson you should tell him the rules of the lesson, about hows things are going to work.
      מילון לשימושך:
      + = ועוד
      - = פחות
      * = כפול
      / = חלקי
      = שווה
      and last thing i would like you to give me the math question in a separate line, so i could use it in also in other ways.
      please make use in the hebrew language well,
    `.trim();
  

      const newLesson = await lessonsModel.create({
        userId: userId,
        startTime: new Date(),
        endTime: null,
        progress: "NOT_STARTED",
        subject: subject,
      });
      if (!newLesson) {
        res.status(400).send("Bad Request");
        return;
      } else {
        newLesson.messages.push({ role: "system", content: defaultSystemPrompt });
        newLesson.save();
        res.status(201).send(newLesson);
        return;
      }
    }catch (err) {
      console.error("Error starting lesson:", err);
      res.status(500).send("Internal Server Error");
    }
  }
  async getLessonsByUserId(req: Request, res: Response) {
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

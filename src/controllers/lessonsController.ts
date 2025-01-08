import lessonsModel, { ILesson } from "../modules/lessonsModel";
import { Request, Response, NextFunction } from "express";
import { BaseController } from "./baseController";
import mongoose from "mongoose";

class LessonsController extends BaseController<ILesson> {
  constructor() {
    super(lessonsModel);
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

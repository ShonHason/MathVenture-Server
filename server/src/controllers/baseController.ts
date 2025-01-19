import { Request, Response } from "express";
import mongoose, { Model } from "mongoose";
export class BaseController<T> {
  model: Model<T>;
  constructor(model: Model<T>) {
    this.model = model;
  }

  async create(req: Request, res: Response) {
    try {
      const doc = await this.model.create(req.body);
      if (!doc) {
        res.status(400).send("Bad Request");
        return;
      } else {
        res.status(201).send(doc);
        return;
      }
    } catch (err) {
      res.status(400).send(err);
      return;
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const docs = await this.model.find();

      if (docs === null || docs === undefined) {
        res.status(400).send("Bad Request");
        return;
      } else if (docs.length === 0) {
        if (docs.length === 0) {
          res.status(200).send("No data found");
          return;
        }
      } else {
        res.status(200).send(docs);
        return;
      }
    } catch (err) {
      res.status(400).send(err);
      return;
    }
  }
  async delete(req: Request, res: Response) {
    const askedId = req.params._id;
    if (mongoose.Types.ObjectId.isValid(askedId) === false) {
      res.status(400).send("Bad Request");
      return;
    }
    try {
      const doc = await this.model.findByIdAndDelete(askedId);
      if (!doc) {
        res.status(400).send("Bad Request");
        return;
      } else {
        res.status(200).send(doc);
        return;
      }
    } catch (err) {
      res.status(400).send(err);
      return;
    }
  }

  async getById(req: Request, res: Response) {
    const askedId = req.params._id;
    try {
      const doc = await this.model.findById(askedId);
      if (!doc) {
        res.status(400).send("Bad Request");
        return;
      } else {
        res.status(200).send(doc);
        return;
      }
    } catch (err) {
      res.status(400).send(err);
      return;
    }
  }
}

const createController = <T>(model: Model<T>) => {
  return new BaseController(model);
};
export default createController;

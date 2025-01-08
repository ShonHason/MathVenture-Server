import lessonsController from "../controllers/lessonsController";
import express, { Request, Response } from "express";

const router = express.Router();

router.post("/", (req: Request, res: Response) => {
  lessonsController.create(req, res);
});
router.get("/", (req: Request, res: Response) => {
  lessonsController.getAll(req, res);
});
router.get("/:_id", (req: Request, res: Response) => {
  lessonsController.getById(req, res);
});
router.patch("/:_id", (req: Request, res: Response) => {
  lessonsController.updateEndTime(req, res);
});
router.delete("/:_id", (req: Request, res: Response) => {
  lessonsController.delete(req, res);
});
router.get("/users/:userId", (req: Request, res: Response) => {
  lessonsController.getByUserId(req, res);
});
// router.patch("/:_id/progress", lessonsController.updateProgress);

export default router;

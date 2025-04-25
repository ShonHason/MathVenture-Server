import lessonsController from "../controllers/lessonsController";
import express, { Request, Response } from "express";

/**
 * @swagger
 * components:
 *   schemas:
 *     Lesson:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           description: The user ID associated with the lesson
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: The start time of the lesson
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: The end time of the lesson
 *         progress:
 *           type: string
 *           description: The progress status of the lesson
 *           enum:
 *             - NOT_STARTED
 *             - IN_PROGRESS
 *             - COMPLETED
 *         subject:
 *           type: string
 *           description: The subject of the lesson
 *           enum:
 *             - ALGEBRA
 *             - GEOMETRY
 *             - CALCULUS
 *             - STATISTICS
 *       required:
 *         - userId
 *         - startTime
 *         - endTime
 *         - progress
 *         - subject
 *       example:
 *         userId: "12345"
 *         startTime: "2023-10-01T10:00:00Z"
 *         endTime: "2023-10-01T11:00:00Z"
 *         progress: "NOT_STARTED"
 *         subject: "ALGEBRA"
 */

const router = express.Router();

/**
 * @swagger
 * /lessons:
 *   post:
 *     summary: Create a new lesson
 *     tags: [Lesson]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Lesson'
 *     responses:
 *       201:
 *         description: Lesson created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 *       400:
 *         description: Bad Request
 */
router.post("/", (req: Request, res: Response) => {
  lessonsController.create(req, res);
});

/**
 * @swagger
 * /lessons:
 *   get:
 *     summary: Get all lessons
 *     tags: [Lesson]
 *     responses:
 *       200:
 *         description: List of lessons
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Lesson'
 *       400:
 *         description: Bad Request
 */

router.get("/", (req: Request, res: Response) => {
  lessonsController.getAll(req, res);
});

/**
 * @swagger
 * /lessons/{_id}:
 *   get:
 *     summary: Get a specific lesson by ID
 *     tags: [Lesson]
 *     parameters:
 *       - in: path
 *         name: _id
 *         schema:
 *           type: string
 *         required: true
 *         description: The lesson ID
 *     responses:
 *       200:
 *         description: Lesson data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 *       400:
 *         description: Bad Request
 *       404:
 *         description: Lesson not found
 */
router.get("/:_id", (req: Request, res: Response) => {
  lessonsController.getById(req, res);
});

/**
 * @swagger
 * /lessons/{_id}:
 *   patch:
 *     summary: Update the end time of a lesson
 *     tags: [Lesson]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: _id
 *         schema:
 *           type: string
 *         required: true
 *         description: The lesson ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 description: The new end time of the lesson
 *             required:
 *               - endTime
 *             example:
 *               endTime: "2023-10-01T12:00:00Z"
 *     responses:
 *       200:
 *         description: Lesson updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 *       400:
 *         description: Bad Request
 *       404:
 *         description: Lesson not found
 */
router.patch("/:_id", (req: Request, res: Response) => {
  lessonsController.updateEndTime(req, res);
});
/**
 * @swagger
 * /lessons/{_id}:
 *   delete:
 *     summary: Delete a lesson by ID
 *     tags: [Lesson]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: _id
 *         schema:
 *           type: string
 *         required: true
 *         description: The lesson ID
 *     responses:
 *       200:
 *         description: Lesson deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 *       400:
 *         description: Bad Request
 *       404:
 *         description: Lesson not found
 */

router.delete("/:_id", (req: Request, res: Response) => {
  lessonsController.delete(req, res);
});

/**
 * @swagger
 * /lessons/users/{userId}:
 *   get:
 *     summary: Get all lessons for a specific user by user ID
 *     tags: [Lesson]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: The user ID
 *     responses:
 *       200:
 *         description: List of lessons for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Lesson'
 *       400:
 *         description: Bad Request
 *       404:
 *         description: No data found
 */

router.get("/users/:userId", (req: Request, res: Response) => {
  lessonsController.getLessonsByUserId(req, res);
});

router.post("/start", (req: Request, res: Response) => {
  lessonsController.startNewLesson(req, res);
});
// router.patch("/:_id/progress", lessonsController.updateProgress);
router.post("/:lessonId/chat", lessonsController.chat.bind(lessonsController));
router.post("/:lessonId/tts", lessonsController.tts.bind(lessonsController));
router.get(
  "/:lessonId/session",
  lessonsController.getSession.bind(lessonsController)
);
export default router;

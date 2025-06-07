import emailController from "../controllers/emailController";
import express from "express";
import { userTokensMiddleware } from "../controllers/userController";
const router = express.Router();
/**
 * @swagger
 * components:
 *   schemas:
 *     Email:
 *       type: object
 *       properties:
 *         userID:
 *           type: string
 *           description: The user ID associated with the email
 *         to:
 *           type: string
 *           description: The recipient's email address
 *         subject:
 *           type: string
 *           description: The subject of the email
 *         message:
 *           type: string
 *           description: The message content of the email
 *         status:
 *           type: string
 *           description: The status of the email (sent, failed, etc.)
 *           default: "pending"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the email was created
 *           default: "Date.now"
 *       required:
 *         - userID
 *         - to
 *         - subject
 *         - message
 *       example:
 *         userID: "12345"
 *         to: "recipient@something.com"
 *         subject: "Test Email"
 *         message: "This is a test email."
 *         status: "pending"
 *         createdAt: "2023-10-01T12:00:00Z"
 */

/**
 * @swagger
 * /email/sendMail:
 *   post:
 *     summary: Send an email and save it to the database
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subject:
 *                 type: string
 *                 description: The subject of the email
 *               message:
 *                 type: string
 *                 description: The message content of the email
 *               emailAddress:
 *                 type: string
 *                 description: The recipient's email address
 *             required:
 *               - subject
 *               - message
 *               - emailAddress
 *             example:
 *               subject: "Test Email"
 *               message: "This is a test email."
 *               emailAddress: "recipient@something.com"
 *     responses:
 *       200:
 *         description: Email sent and saved to database successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 _id:
 *                   type: string
 *       400:
 *         description: Subject, message, and email address are required
 *       401:
 *         description: Invalid token
 *       500:
 *         description: Failed to send email. Please try again later.
 */
router.post(
  "/sendMail",
  userTokensMiddleware,
  emailController.sendEmailAndSaveToDB
);

router.get(
  "/getAllEmails",
  userTokensMiddleware,
  emailController.findEmailsByFilter
);

/**
 * @swagger
 * /email/getUserMail:
 *   get:
 *     summary: Get all emails for the authenticated user
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of emails
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Email'
 *       401:
 *         description: Invalid token
 *       500:
 *         description: Failed to find emails.
 */

router.get(
  "/getUserMail/:_id",
  userTokensMiddleware,
  emailController.findEmailsByFilter
);

/**
 * @swagger
 * /email/getUserMail/{_id}:
 *   get:
 *     summary: Get a specific email by ID
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: _id
 *         schema:
 *           type: string
 *         required: true
 *         description: The email ID
 *     responses:
 *       200:
 *         description: Email data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Email'
 *       401:
 *         description: Invalid token
 *       404:
 *         description: Email not found
 *       500:
 *         description: Failed to find email.
 */

export default router;

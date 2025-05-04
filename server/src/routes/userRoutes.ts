import userController from "../controllers/userController";
import express from "express";
import { userTokensMiddleware } from "../controllers/userController";
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           description: The user's email address
 *         password:
 *           type: string
 *           description: The user's password
 *         refreshTokens:
 *           type: array
 *           items:
 *             type: string
 *           description: List of refresh tokens
 *         parent_email:
 *           type: string
 *           description: The parent's email address
 *         parent_phone:
 *           type: string
 *           description: The parent's phone number
 *         grade:
 *           type: string
 *           description: The user's grade
 *           enum:
 *             - א
 *             - ב
 *             - ג
 *             - ד
 *             - ה
 *             - ו
 *             - ז
 *             - ח
 *             - ט
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           description: The user's date of birth
 *       required:
 *         - email
 *         - password
 *         - grade
 *         - dateOfBirth
 *       example:
 *         email: "user@something.com"
 *         password: "password123"
 *         refreshTokens: []
 *         parent_email: "parent@something.com"
 *         parent_phone: "123-456-7890"
 *         grade: "ה"
 *         dateOfBirth: "2010-01-01"
 */

const router = express.Router();
/**
 * @swagger
 * /user/register:
 *   post:
 *     summary: Register a new user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email:
 *                   type: string
 *                 _id:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Problem with creating tokens
 */
router.post("/register", userController.register);
/**
 * @swagger
 * /user/login:
 *   post:
 *     summary: Login a user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - email
 *               - password
 *             example:
 *               email: "user@something.com"
 *               password: "password123"
 *     responses:
 *       200:
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email:
 *                   type: string
 *                 _id:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *       400:
 *         description: Invalid Email Or Password
 *       500:
 *         description: Problem with creating tokens
 */
router.post("/login", userController.login);
//router.post("/refresh", userController.refresh);

/**
 * @swagger
 * /user/logout:
 *   post:
 *     summary: Logout a user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The refresh token to be invalidated
 *             required:
 *               - refreshToken
 *             example:
 *               refreshToken: "some-refresh-token"
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       400:
 *         description: Refresh token is required
 *       403:
 *         description: Refresh token not associated with this user
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error during logout
 */

/**
 * @swagger
 * /user/getUserProfile:
 *   post:
 *     summary: Get user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: The access token of the user
 *             required:
 *               - accessToken
 *             example:
 *               accessToken: "some-access-token"
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid Token
 *       404:
 *         description: Could not find user
 */
router.post("/logout", userTokensMiddleware, userController.logout);

router.post(
  "/getUserProfile",
  userTokensMiddleware,
  userController.getUserProfile
);
/**
 * @swagger
 * /user/updatePassword:
 *   put:
 *     summary: Update user password
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               oldpassword:
 *                 type: string
 *               newpassword:
 *                 type: string
 *             required:
 *               - email
 *               - oldpassword
 *               - newpassword
 *             example:
 *               email: "user@something.com"
 *               oldpassword: "oldpassword123"
 *               newpassword: "newpassword123"
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Invalid Email Or Password
 *       500:
 *         description: Server error during password update
 */
router.put(
  "/updatePassword",
  userTokensMiddleware,
  userController.updatePassword
);
/**
 * @swagger
 * /user/updateParentsMail:
 *   put:
 *     summary: Update parent's email
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               parent_email:
 *                 type: string
 *                 description: The new parent's email address
 *             required:
 *               - parent_email
 *             example:
 *               parent_email: "parent@something.com"
 *     responses:
 *       200:
 *         description: Parent email updated successfully
 *       400:
 *         description: Parent email is required
 *       404:
 *         description: Could not find user
 */

router.put(
  "/updateParentsMail",
  userTokensMiddleware,
  userController.updateParentsMail
);
/**
 * @swagger
 * /user/deleteUser:
 *   delete:
 *     summary: Delete a user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: The access token of the user
 *             required:
 *               - accessToken
 *             example:
 *               accessToken: "some-access-token"
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       400:
 *         description: Could not find user
 */
router.delete("/deleteUser", userTokensMiddleware, userController.deleteUser);

router.put("/endOfRegistration", userController.endOfRegistration);
  
router.post("/refresh", userController.refresh);

router.put(
  "/updateProfile",
  userTokensMiddleware,
  userController.updateProfile
);
/**
 * @swagger
 * /user/updateProfile:
 *   put:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user
 *               username:
 *                 type: string
 *                 description: Updated username
 *               email:
 *                 type: string
 *                 description: Updated email
 *               parent_phone:
 *                 type: string
 *                 description: Updated parent's phone number
 *               grade:
 *                 type: string
 *                 description: Updated grade
 *                 enum:
 *                   - א
 *                   - ב
 *                   - ג
 *                   - ד
 *                   - ה
 *                   - ו
 *                   - ז
 *                   - ח
 *                   - ט
 *               imageUrl:
 *                 type: string
 *                 description: Updated profile image URL (Base64 or URL)
 *             required:
 *               - userId
 *             example:
 *               userId: "660af8373b7e2c72a5f8c13f"
 *               username: "New Username"
 *               email: "newemail@example.com"
 *               parent_phone: "0501234567"
 *               grade: "ו"
 *               imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Missing or invalid data
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error during profile update
 */

export default router;

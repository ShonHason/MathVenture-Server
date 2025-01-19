import emailController from "../controllers/emailController";
import express  from "express";
import { userTokensMiddleware } from "../controllers/userController";
const router  = express.Router();

router.post("/sendMail", userTokensMiddleware ,emailController.sendEmailAndSaveToDB);
router.get("/getUserMail", userTokensMiddleware ,emailController.findEmailsByFilter);
router.get("/getUserMail/:_id", userTokensMiddleware ,emailController.findEmailsByFilter);

export default router;

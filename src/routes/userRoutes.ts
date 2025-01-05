import userController from "../controllers/userController";
import express , { Request , Response } from "express";

const router  = express.Router();

router.post("/register", userController.register);
router.post("/login", userController.login);
//router.post("/refresh", userController.refresh);
router.post("/logout", userController.logout);
router.post("/updatePassword", userController.updatePassword);
router.post("/updateParentsMail", userController.updateParentsMail);
router.post("/getUserProfile", userController.getUserProfile);

export default router;

import userController from "../controllers/userController";
import express , { Request , Response } from "express";
import { userTokensMiddleware } from "../controllers/userController";

const router  = express.Router();

router.post("/register", userController.register);
router.post("/login", userController.login);
//router.post("/refresh", userController.refresh);
router.post("/logout", userTokensMiddleware, userController.logout);
router.post("/getUserProfile", userTokensMiddleware , userController.getUserProfile);
router.put("/updatePassword", userTokensMiddleware , userController.updatePassword);
router.put("/updateParentsMail", userTokensMiddleware , userController.updateParentsMail);
router.delete("/deleteUser", userTokensMiddleware, userController.deleteUser);

export default router;

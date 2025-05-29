import leaderboardController  from "../controllers/leaderboardController";
import express from "express";
import { userTokensMiddleware } from "../controllers/userController";

const router = express.Router();

router.get("/",userTokensMiddleware,leaderboardController.getLeaderboard);

router.post("/addScore", userTokensMiddleware, leaderboardController.addScore);
export default router;

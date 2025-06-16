import express from "express";
import { googleConnection } from "../controllers/googleController";


const router = express.Router();

router.post("/google-signin", googleConnection);
export default router;

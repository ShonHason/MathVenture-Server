import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import userModel from "../modules/userModel";
import userController from "./userController";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleConnection = async (req: Request, res: Response) => {
  const { token } = req.body;
    console.log("clientid:", process.env.GOOGLE_CLIENT_ID);
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(400).json({ error: "Invalid token" });
      return;
    }

    const { email, name, picture } = payload;
    if (!email) {
      res.status(400).json({ error: "Missing email in token" });
      return;
    }

    let user = await userModel.findOne({ email });

    const isNewUser = !user;

    if (!user) {
      user = new userModel({
        email,
        username: name || email.split("@")[0],
        imageUrl: picture,
        password: "GoogleUser", // אופציונלי
        refreshTokens: [],
      });
    }

    const tokens = userController.generateTokens(user._id.toString());
    if (!tokens) {
      res.status(500).json({ error: "Failed to generate tokens" });
      return;
    }

    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    res.status(200).json({
      email: user.email,
      username: user.username,
      _id: user._id,
      gender: user.gender,
      rank : user.rank,
      dateOfBirth : user.dateOfBirth,
      grade : user.grade,
      parent_email : user.parent_email,
      parent_name : user.parent_name,
      parent_phone : user.parent_phone,
      imageUrl: user.imageUrl,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isNewUser,
    });
  } catch (error) {
    console.error("❌ Google Sign-In failed:", error);
    res.status(500).json({ error: "Failed to authenticate with Google" });
  }
};

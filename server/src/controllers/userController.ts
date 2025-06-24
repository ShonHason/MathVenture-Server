import userModel from "../modules/userModel";
import { Request, Response , NextFunction } from "express";
import bcrypt from 'bcrypt'
import jwt, { JwtPayload } from 'jsonwebtoken';
import { RequestHandler } from 'express';

const updateProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, username, email, parent_phone, grade, imageUrl, parent_name, parent_email  } = req.body;

    if (!userId) {
      res.status(400).send("User ID is required");
      return;
    }

    const updateFields: Partial<{
      username: string;
      email: string;
      parent_phone: string;
      grade: string;
      imageUrl: string;
      parent_name?: string;
      parent_email?: string;
    }> = {};

    if (username !== undefined)   updateFields.username     = username;
    if (email !== undefined)      updateFields.email        = email;
    if (parent_phone !== undefined) updateFields.parent_phone = parent_phone;
    if (grade !== undefined)      updateFields.grade        = grade;
    if (imageUrl !== undefined)   updateFields.imageUrl     = imageUrl;
    if (parent_name !== undefined) updateFields.parent_name = parent_name;
    if (parent_email !== undefined) updateFields.parent_email = parent_email;

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      res.status(404).send("User not found");
      return;
    }

    res.status(200).send(updatedUser);
    return;
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).send("Server error during profile update");
    return;
  }
};



const register = async (req: Request, res: Response) => {

  const email  = req.body.email;
  const password  = req.body.password;
  const username = req.body.username;

    if (!email || !password || email.trim().length == 0 || password.trim().length == 0) {
    res.status(400).send('Email and password are required');
    return;

  }
  if(!username || username.trim().length === 0  ){
    res.status(400).send('Please fill all the fields');
    return;

  }

  const user = await userModel.findOne({email : email});
  if (user) {
    console.log("User already exists");
    console.log("User:" + user);
    res.status(400).send('User already exists');
    return;

  }
  console.log("Creating new user");
  console.log("email: " + email);
  console.log("password: " + password);
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await userModel.create ({
      email: email,
      password: hashedPassword ,
      username: username,
      refreshTokens: [],
     
      });
    const tokens = generateTokens(newUser._id.toString());
    if(!tokens){
      res.status(500).send('Problem with creating tokens');
      return;
    }
    newUser.refreshTokens.push(tokens.refreshToken);
    await newUser.save();
    
    
    console.log("New user created");
    res.status(201).send({
      username : newUser.username,
      email : newUser.email,
      _id : newUser._id,
      refreshToken : tokens.refreshToken,
      accessToken : tokens.accessToken,
    });
    return;
  } catch (error) {
    console.log("Problem with creating a new user", error);
    res.status(400).send(error);
    return;

  }
};

const generateTokens = (_id : string) : { accessToken : string , refreshToken : string } | null => {
  const rand = Math.floor(Math.random() * 10000000);
  const rand2 = Math.floor(Math.random() * 10000000);
  if(!process.env.TOKEN_SECRET){
      return null; 
  }
  const accessToken = jwt.sign(
      { _id: _id,
          rand2: rand2,
       },
      process.env.TOKEN_SECRET ,
      { expiresIn: process.env.TOKEN_EXPIRATION });

  const refreshToken = jwt.sign(
      { _id: _id ,
          rand: rand ,
      },
      process.env.TOKEN_SECRET , 
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION });

  return { accessToken, refreshToken };
}

const login = async (req: Request, res: Response) => {
  console.log("Login request received");
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password || email.trim().length === 0 || password.trim().length === 0) {
    res.status(400).send('Email and password are required');
    return;
  }
  const user = await userModel.findOne({email : email});
  if (!user) {
    res.status(400).send('Invalid Email Or Password');
    return;
  }
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    res.status(400).send('Invalid Email Or Password');
    return;
  }
  const tokens = generateTokens(user._id.toString());
  if(!tokens){
    res.status(500).send('Problem with creating tokens');
    return;
  }
  user.refreshTokens.push(tokens.refreshToken);
  await user.save();
  res.status(200).send({
    email: user.email,
    _id: user._id,
    gender: user.gender, // Return
    username: user.username,   // Return username if needed
    imageUrl: user.imageUrl,   // Return imageUrl if needed
    grade: user.grade,         // Return grade if needed
    rank: user.rank,           // Return rank if needed
    parent_email: user.parent_email, // Return parent_email if needed
    parent_name: user.parent_name,   // Return parent_name if needed
    parent_phone: user.parent_phone, // Return parent_phone if needed
    refreshToken: tokens.refreshToken,
    accessToken: tokens.accessToken,
  });
  return;
}

const logout = async (req: Request, res: Response) => {
  const refreshToken = req.body.refreshToken;

  // Step 1: Validate input
  if (!refreshToken) {
    res.status(400).send('Refresh token is required');
    return;
  }

  // Step 2: Fetch user from the database using the user ID set by the middleware
  const userId = req.query.userId;
  try {
    const user = await userModel.findById(userId);
    if (!user) {
      res.status(404).send('User not found');
      return;
    }

    if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
      res.status(403).send('Refresh token not associated with this user');
      return;
    }

    // Step 3: Remove the token and save the user
    user.refreshTokens = user.refreshTokens.filter((token) => token !== refreshToken);
    await user.save();

    res.status(200).send('Logged out successfully');
  } catch (err) {
    console.error('Error during logout:', err);
    res.status(500).send('Server error during logout');
  }
};



const updatePassword = async (req: Request, res: Response) => {
  const email = req.body.email;
  const oldpassword = req.body.oldpassword;
  const newpassword = req.body.newpassword;
  if ( !newpassword || newpassword.trim().length === 0) {
    res.status(400).send('new password is required');
    return;
  }
  const user = await userModel.findOne({email : email});
  if (!user) {
    res.status(400).send('Invalid Email Or Password');
    return;
  }
  const validPassword = await bcrypt.compare(oldpassword, user.password);
  if (!validPassword) {
    res.status(400).send('Its not your password');
    return;
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newpassword, salt);
  user.password = hashedPassword;
  await user.save();
  res.status(200).send('Password updated ' + user.email);
  return;
} 

const updateParentsMail = async (req: Request, res: Response) => {
  const parent_email = req.body.parent_email;
  if (!parent_email || parent_email.trim().length === 0) {
    res.status(400).send('Parent email is required');
    return;
  }
  const decodedPayload = jwt.decode(req.body.accessToken);
  if (decodedPayload && typeof decodedPayload !== 'string') {
  const userId = (decodedPayload as JwtPayload)._id;
  const user = await userModel.findOne({_id : userId});
    if (!user) {
      res.status(400).send('Couldnt find user');
      return;
    }
  user.parent_email = parent_email;
  await user.save();
  res.status(200).send('Parent email updated ' + user.email);
  return;
  }
}

const getUserProfile = async (req: Request, res: Response) => {
  const decodedPayload = jwt.decode(req.body.accessToken);
  if (decodedPayload && typeof decodedPayload !== 'string') {
  const userId = (decodedPayload as JwtPayload)._id;
  const user = await userModel.findById(userId);
    if (!user) {
      res.status(400).send('Couldnt find user');
      return;
    }
    res.status(200).send(user);
    console.log("user:" ,user);
    return;
  } else {  
    res.status(400).send('Invalid Token');
    return;
  } 
}

const endOfRegistration = async (req: Request, res: Response) => {
  // Extract the fields from the request body
  const {
    userId,
    imageUrl,
    grade,
    rank,
    gender,
    dateOfBirth,
    parent_email,
    parent_name,
    parent_phone,
    
  } = req.body;
  console.log(dateOfBirth)
  // Validate that we received a userId
  if (!userId) {
    res.status(400).send("User ID is required");
    return;
  }

  try {
    // Find the user by ID and update the additional registration fields
    // Note: imageUrl is now handled separately by the image upload endpoint
    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      {
        // Only set imageUrl if provided in this request
        ...(imageUrl && { imageUrl }),
        grade,
        rank,
        dateOfBirth,
        gender,
        parent_email,
        parent_name,
        parent_phone,
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      res.status(404).send("User not found");
      return;
    }
    
    console.log("User registration completed");
    res.status(200).send(updatedUser);
  } catch (error) {
    console.error("Error in endOfRegistration:", error);
    res.status(500).send("Server error during endOfRegistration");
  }
};

const deleteUser = async (req: Request, res: Response) => {
  console.log("Deleting user");
  try {
    const { userId, password } = req.body;

    // Check if password is provided
    if (!password) {
      res.status(400).send('Password is required to delete account');
      return;
    }

    // Find the user
    const user = await userModel.findById(userId);
    if (!user) {
      res.status(404).send('User not found');
      return;
    }

    // Special case for Google users - check if password is "GoogleUser"
    // This is a simplified approach to identify Google-authenticated users
    if (password === "GoogleUser" && user.password === "GoogleUser") {
      // For Google users, we allow deletion with the special password
      await user.deleteOne();
      res.status(200).send('User deleted successfully');
      return;
    }
    if(password === "GoogleUser" && user.password !== "GoogleUser") {
      res.status(400).send('Only Google users can delete their account with this GoogleUser');
      return;
    }

    // For regular users, verify the password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).send('Incorrect password');
      return;
    }
    
    await user.deleteOne();
    res.status(200).send('User deleted successfully');
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).send('Server error during account deletion');
  }
}

type TokenPayload = {    
  _id: string;
}

export const userTokensMiddleware =  (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if(!token) { 
      res.status(401).send('missing token');
      return;
  }
  if(!process.env.TOKEN_SECRET){
      res.status(500).send("Missing Token Secret");
      return;
  }
  else{

  jwt.verify(token, process.env.TOKEN_SECRET ,(err, data) => {
      if(err) {
          res.status(403).send('Invalid Token');       
          return;
      }
      const payload = data as TokenPayload;
      req.query.userId = payload._id;   
      
      next();
  });   
  } 
}


const refresh = async (req: Request, res: Response) => {
  //validity of the refresh token
  const refreshToken = req.body.refreshToken;
  if (!refreshToken) {
    res.status(400).send("Missing Refresh Token");
    return;
  }
  if (!process.env.TOKEN_SECRET) {
    res.status(500).send("Missing Token Secret");
    return;
  }

  jwt.verify(
    refreshToken,
    process.env.TOKEN_SECRET,
    async (err: any, data: any) => {
      if (err) {
        res.status(403).send("Invalid Refresh Token");
        return;
      }

      //find the user

      const payload = data as TokenPayload;
      try {
        const user = await userModel.findById(payload._id);
        if (!user) {
          res.status(404).send("Invalid Refresh Token");
          return;
        }
        //check if the refresh token is in the user's refresh token list

        if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
          user.refreshTokens = [];
          await user.save();
          res.status(400).send("Invalid Refresh Token");
          return;
        }
        //generate a new access token

        const newTokens = generateTokens(user._id.toString());
        if (!newTokens) {
          user.refreshTokens = [];
          await user.save();
          res.status(500).send("Missing Token Secret");
          return;
        }
        //delete the old refresh token
        user.refreshTokens = user.refreshTokens.filter(
          (token) => token !== refreshToken
        );
        //save the new refresh token
        user.refreshTokens.push(newTokens.refreshToken);
        await user.save();
        //send the new access token and refresh token to the user
        res.status(200).send({
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
        });
      } catch (err) {
        console.log(err);
        res.status(400).send("invalid token");
      }
    }
  );
};


/**
 * Handles the Google OAuth callback and manages user creation/login
 */
const googleCallback: RequestHandler = async (req, res) => {
  try {
    // TypeScript doesn't know req.user exists, so we need to access it differently
    // Use type assertion to tell TypeScript it's okay
    const googleUser = (req as any).user as {
      id: string;
      email: string;
      displayName: string;
      picture?: string;
    };

    if (!googleUser || !googleUser.email) {
      res.status(400).send("Invalid Google authentication data");
      return;
    }

    // Check if the user already exists
    let user = await userModel.findOne({ email: googleUser.email });
    let isNewUser = false;

    if (!user) {
      // Create a new user if they don't exist
      isNewUser = true;
      const newUser = await userModel.create({
        email: googleUser.email,
        username: googleUser.displayName || googleUser.email.split('@')[0],
        // Set a default gender - user can update later
        gender: "female", 
        // No password for Google auth users
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10),
        refreshTokens: [],
        imageUrl: googleUser.picture || "",
      });
      
      user = newUser;
    }

    // Generate tokens for the user
    const tokens = generateTokens(user._id.toString());
    if (!tokens) {
      res.status(500).send('Problem with creating tokens');
      return;
    }

    // Add the new refresh token to the user's tokens
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    // Close the popup and send data back to the parent window
    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage(
              {
                type: 'GOOGLE_AUTH_SUCCESS',
                user: ${JSON.stringify({
                  _id: user._id,
                  email: user.email,
                  username: user.username,
                  gender: user.gender,
                  imageUrl: user.imageUrl,
                  grade: user.grade,
                  rank: user.rank,
                  parent_email: user.parent_email,
                  parent_name: user.parent_name,
                  parent_phone: user.parent_phone,
                })},
                accessToken: "${tokens.accessToken}",
                refreshToken: "${tokens.refreshToken}",
                isNewUser: ${isNewUser}
              },
              "${process.env.CLIENT_URL || 'http://localhost:3000'}"
            );
            window.close();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error during Google authentication:", error);
    res.status(500).send("Server error during Google authentication");
  }
};

/**
 * Initiates Google OAuth flow - this endpoint should redirect to Google
 * This is a placeholder that would be replaced by actual Passport Google OAuth middleware
 */
const googleAuth = (req: Request, res: Response, next: NextFunction) => {
  // This function would normally be handled by Passport Google OAuth middleware
  // Placeholder for documentation - this should redirect to Google's auth page
  console.log("Initiating Google OAuth flow");
  next();
};

export default {
 
  updateProfile,
  register,
  login,
  logout,
  endOfRegistration,
  updatePassword,
  updateParentsMail,
  getUserProfile,
  deleteUser,
  refresh,
  googleAuth,      // Add the Google auth function
  googleCallback,   // Add the Google callback function
  generateTokens,
};



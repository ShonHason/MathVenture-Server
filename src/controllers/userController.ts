import userModel from "../modules/userModel";
import { Request, Response , NextFunction } from "express";
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';

const register = async (req: Request, res: Response) => {

  const email  = req.body.email;
  const password  = req.body.password;
  const name = req.body.name;
  const grade = req.body.grade;
  if (!email || !password || email.trim().length == 0 || password.trim().length == 0) {
    res.status(400).send('Email and password are required');
    return;

  }
  if(!name || name.trim().length === 0 || !grade ){
    res.status(400).send('Please fill all the fields');
    return;

  }
  const user = await userModel.findOne({email : email});
  if (user) {
    res.status(400).send('User already exists');
    return;

  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await userModel.create ({
      email: email,
      password: hashedPassword ,
      name: req.body.name,
      refreshTokens: [],
      parent_email: req.body.parent_email,
      parent_phone: req.body.parent_phone,
      grade: req.body.grade,
      dateOfBirth: req.body.dateOfBirth
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
      email : newUser.email,
      _id : newUser._id,
      refreshToken : tokens.refreshToken,
      accessToken : tokens.accessToken,
    });
    return;
  } catch (error) {
    console.log("Problem with creating a new user");
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
    email : user.email,
    _id : user._id,
    refreshToken : tokens.refreshToken,
    accessToken : tokens.accessToken,
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
  const user = await userModel.findOne({_id : userId});
    if (!user) {
      res.status(400).send('Couldnt find user');
      return;
    }
    res.status(200).send(user);
    return;
  } else {  
    res.status(400).send('Invalid Token');
    return;
  } 
}
const deleteUser = async (req: Request, res: Response) => {
  const decodedPayload = jwt.decode(req.body.accessToken);

  if (decodedPayload && typeof decodedPayload !== 'string') {
  const userId = (decodedPayload as JwtPayload)._id;
  const user = await userModel.findOne({_id : userId});
    if (!user) {
      res.status(400).send('Couldnt find user');
      return;
    }
    await user.deleteOne();
    res.status(200).send('User deleted');
    return;
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

export default {register , login, logout , updatePassword , updateParentsMail, getUserProfile , deleteUser};  
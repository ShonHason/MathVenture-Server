import mongoose from "mongoose";

export interface IUser extends Document {
  username:      string;
  email:         string;
  gender:        "female" | "male";
  password:      string;
  refreshTokens: string[];
  parent_email?: string;
  parent_name?:  string;
  parent_phone?: string;
  grade?:        string;
  rank?:         string;
  dateOfBirth?:  Date;
  imageUrl?:     string;
  subjectsList?:    string[];  
}

export interface User {
  _id: string;
  username: string;
  fullname: string;
  email: string;
  grade?: string;
  gender?: string;
  rank?: string;
  dateOfBirth?: string;
  imageUrl?: string;
  opportunities?: string;
  twoFactorAuth?: boolean;
  parent_email?: string;
  parent_name?: string;
  parent_phone?: string;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    gender: {
      type: String,
      required: true,
      enum: ["female","male"],
      default: "male",
    },
    password: {
      type: String,
      required: true,
    },
    refreshTokens: {
      type: [String],
      default: [],
    },
    parent_email: {
      type: String,
      required: false,
    },
    parent_name: {            
      type: String,
      required: false,
    },
    parent_phone: {
      type: String,
      required: false,
    },
    grade: {
      type: String,
      required: false,
      enum: ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"],
    },
    rank: {
      type: String,
      required: false,
      default: "1",
      enum: ["1", "2", "3"],
    },
    dateOfBirth: {
      type: Date,
      required: false,
    },
    imageUrl: {
      type: String,
      default: '',
      required: false,
    },
    subjectsList: {
      type: [String],
      default: [],
    },
  },
  {
    toJSON: {
      transform: (doc, ret) => {
        const { _id, ...rest } = ret;
        return { _id, ...rest };
      },
    },
  }
);

const userModel = mongoose.model("Users", userSchema);
export default userModel;

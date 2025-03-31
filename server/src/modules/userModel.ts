import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
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
      required: false,
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

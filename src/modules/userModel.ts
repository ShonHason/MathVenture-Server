import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
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
    parent_phone: {
      type: String,
      required: false,
    },
    grade: {
      type: String,
      required: true,
      enum: ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"],
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
  },
  {
    toJSON: {
      transform: (doc, ret) => {
        // Ensure _id appears first in the JSON response
        const { _id, ...rest } = ret;
        return { _id, ...rest }; // Return _id first followed by the rest of the fields
      },
    },
  }
);

const userModel = mongoose.model("Users", userSchema);
export default userModel;

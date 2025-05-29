import mongoose from "mongoose";

export interface Iboard extends Document {

  userId:    string; 
  username:      string;
  score:         number;
  date:          Date;
  email:        string;
  gameType:    string;  
  gameDifficulty: string;
}


const leaderboardSchema = new mongoose.Schema<Iboard>(
  {

    userId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
      default: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    email: {
      type: String,
      required: true,
    },
    gameType: {
      type: String,
      required: true,
    },
    gameDifficulty: {
      type: String,
      required: true,
    }
  },
  {
    toJSON: {
      transform: (doc, ret) => {
        const { _id, ...rest } = ret;
        return { _id, ...rest };
      }
    }


  })

const leaderboardModel = mongoose.model("leaderboard", leaderboardSchema);
export default leaderboardModel;

import express, { Express } from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import path from 'path';
import userRoutes from './routes/userRoutes';
import emailRoutes from './routes/emailRoutes';
import lessonsRoutes from "./routes/lessonsRoutes";

dotenv.config();

const app: Express = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/lessons", lessonsRoutes);
app.use('/user', userRoutes);
app.use('/email', emailRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

const initApplication = async (): Promise<Express> => {
  return new Promise<Express>((resolve, reject) => {
    const db = mongoose.connection;

    db.on("error", (error) => {
      console.error("Database connection error:", error);
    });

    db.once("open", () => {
      console.log("Connected to database");
    });

    if (!process.env.DATABASE_URL) {
      console.error("initApplication UNDEFINED DATABASE_URL");
      reject();
      return;
    } else {
      mongoose.connect(process.env.DATABASE_URL).then(() => {
        resolve(app);
      });
    }
  });
};

export default { initApplication };

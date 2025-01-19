
import express, { Express } from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import userRoutes from './routes/userRoutes';
import emailRoutes from './routes/emailRoutes';
import lessonsRoutes from "./routes/lessonsRoutes";
import apiRoutes from './routes/apiRoutes'; // ייבוא של ה-Route החדש


dotenv.config();

const app: Express = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/lessons", lessonsRoutes);
app.use('/user',userRoutes)
app.use('/email',emailRoutes)
app.use('/api', apiRoutes);
app.get('/', (req, res) => {
  res.status(200).send('Hello World!');
})

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
        //app.use(express.json());
        resolve(app);
      });
    }
  });
};

export default { initApplication };

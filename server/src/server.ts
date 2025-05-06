import express, { Express } from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import path from "path";
import cors from "cors";
import userRoutes from "./routes/userRoutes";
import emailRoutes from "./routes/emailRoutes";
import lessonsRoutes from "./routes/lessonsRoutes";
import apiRoutes from "./routes/apiRoutes";
import swaggerUI from "swagger-ui-express";
import swaggerJsDoc from "swagger-jsdoc";
//import multer from "multer";
import fs from "fs-extra";
//import sharp from "sharp";

const app: Express = express();

// הגדרות CORS – חשוב להגדיר לפני שאר ה-middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Configure body parser with increased limits for image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads/profile-images');
fs.ensureDirSync(uploadDir);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger documentation setup (as needed)
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "2025 REST API-MathVenture By Shon,Dan,Roey,Rotem",
      version: "1.0.0",
      description: "REST server including authentication using JWT",
    },
    servers: [{ url: `http://localhost:${process.env.PORT}` }],
  },
  apis: ["./src/routes/*.ts"],
};
const specs = swaggerJsDoc(options);
app.use("/swagger", swaggerUI.serve, swaggerUI.setup(specs));

// API routes
app.use("/lessons", lessonsRoutes);
app.use("/user", userRoutes);
app.use("/email", emailRoutes);
app.use("/api", apiRoutes);

// Production settings
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve(__dirname, "../client/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client/build", "index.html"));
  });
}

const initApplication = async (): Promise<Express> => {
  return new Promise((resolve, reject) => {
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
      mongoose
        .connect(process.env.DATABASE_URL)
        .then(() => {
          resolve(app);
        })
        .catch((err) => reject(err));
    }
  });
};

export default { initApplication };
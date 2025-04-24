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

const app: Express = express();

// הגדרות CORS – חשוב להגדיר לפני שאר ה-middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// הגדרת Swagger לדוקומנטציה (לפי הצורך)
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

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve(__dirname, "../client/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client/build", "index.html"));
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

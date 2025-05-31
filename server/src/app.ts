import appInit from "./server";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";

// ✅ FORCE dotenv to load the correct file from the project root
const envPath = path.resolve(__dirname, "../.env");
console.log("📦 Loading .env from:", envPath);


if (fs.existsSync(envPath)) {
  //console.log("📄 .env content:\n" + fs.readFileSync(envPath, "utf-8"));
  console.log("✅ .env file FOUND at:", envPath);
} else {
  console.error("❌ .env file NOT FOUND at:", envPath);
}

dotenv.config({ path: envPath,override: true });

// ✅ Log critical variables
console.log(
  "✅ Loaded OPENAI_API_KEY:",
  process.env.GEMINI_API_KEY?.slice(0, 12)
);
console.log("✅ Loaded DATABASE_URL:", process.env.DATABASE_URL?.slice(0, 40));
console.log("🛠 Current working directory:", process.cwd());

// ✅ Port fallback if not defined in .env
const port = process.env.PORT || 4000;

// ✅ Launch server
appInit
  .initApplication()
  .then((app) => {
    const server = http.createServer(app);
    server.listen(port, () => {
      console.log(`🚀 Server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error initializing app", err);
  });

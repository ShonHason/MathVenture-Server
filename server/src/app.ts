import appInit from "./server";
import http from "http";
import https from "https";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";

// ✅ FORCE dotenv to load the correct file from the project root
const envPath = path.resolve(__dirname, "../.env");
// const envPath = path.join(__dirname, "../../.env"); // Alternative if you prefer relative paths DEV!!
console.log("📦 Loading .env from:", envPath);

if (fs.existsSync(envPath)) {
  //console.log("📄 .env content:\n" + fs.readFileSync(envPath, "utf-8"));
  console.log("✅ .env file FOUND at:", envPath);
} else {
  console.error("❌ .env file NOT FOUND at:", envPath);
}

dotenv.config({ path: envPath, override: true });

// ✅ Log critical variables
console.log(
  "✅ Loaded OPENAI_API_KEY:",
  process.env.GEMINI_API_KEY?.slice(0, 12)
);
console.log("✅ Loaded DATABASE_URL:", process.env.DATABASE_URL?.slice(0, 40));

// Check Google OAuth config
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log("✅ Google OAuth credentials found");
} else {
  console.warn("⚠️ Google OAuth credentials missing - auth will be disabled");
}

console.log("🛠 Current working directory:", process.cwd());

// ✅ Port fallback if not defined in .env
const port = process.env.PORT || 443;

// ✅ Launch server
appInit
  .initApplication()
  .then((app) => {  
    if (process.env.NODE_ENV !== "production") {
     console.log(" Running in development mode");
     http.createServer(app).listen(port);
     console.log("Server is Running in Http mode")
    }
    else{
   
    const option = {
      key: fs.readFileSync(path.resolve(process.cwd(), "myserver.key")),
      cert: fs.readFileSync(path.resolve(process.cwd(), "CSB.crt")),
    };
    https.createServer(option, app).listen(port);
    console.log(`✅ Server is running on (HTTPS) in port ${port}`);
  
  }}).catch((err) => {
    console.error("Problem Intlize The HTTP/HTTPS Server", err);
    process.exit(1);  
  });
 
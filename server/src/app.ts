import appInit from "./server";
import http from "http";

import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 4000;

appInit
  .initApplication()
  .then((app) => {
    const server = http.createServer(app);
    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Error initializing app", err);
  });

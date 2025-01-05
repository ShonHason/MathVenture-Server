import appInit from "./server";

const port = process.env.PORT;

appInit
  .initApplication()
  .then((app) => {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log("server is running");
    });
  })
  .catch((err) => {
    console.log("Error initializing app", err);
  });

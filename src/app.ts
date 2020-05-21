import express from "express";
import mongoose from "mongoose";
import env from "./environment";
import startEndOfWeekReminder from "./reminders/endOfWeek";
import oauth2Router from "./routes/auth/index";
import slackRouter from "./routes/slack";
import createErrorView from "./views/error";

const app = express();

const dbOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
  auth: {
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  },
  dbName: "alvtime-slack-app",
};

mongoose
  .connect(env.DB_CONNECTION_STRING, dbOptions)
  .then(() => {
    console.log("Database connected");
  })
  .catch((error) => {
    console.error("Database connection error: " + error);
  });

app.use(express.static("public"));
app.use("/slack", slackRouter);
app.use("/oauth2", oauth2Router);
app.use("/something-went-wrong", (_req, res) => {
  res.status(500).send(createErrorView());
});

app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.redirect("/something-went-wrong");
});

// startEndOfWeekReminder();

// Starts server
const port = env.PORT || 3000;
app.listen(port, function () {
  console.log("Alvtime slack app is listening on port " + port);
});

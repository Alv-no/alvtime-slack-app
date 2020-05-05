import express from "express";
import startEndOfWeekReminder from "./reminders/endOfWeek";
import oauth2Router from "./routes/oauth2";
import slackRouter from "./routes/slack";
import mongoose from "mongoose";
import env from "./environment";

const app = express();

const dbOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
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

app.use("/slack", slackRouter);
app.use("/oauth2", oauth2Router);

startEndOfWeekReminder();

// Starts server
const port = env.PORT || 3000;
app.listen(port, function () {
  console.log("Alvtime slack app is listening on port " + port);
});

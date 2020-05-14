import mongoose from "mongoose";

export interface UserData {
  name: string;
  email: string;
  slackUserName: string;
  slackUserID: string;
  auth: {
    tokenType: string;
    scope: string;
    expiresOn: string;
    expiresIn: number;
    extExpiresIn: number;
    accessToken: string;
    idToken: string;
    refreshToken: string;
  };
}

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  slackUserName: String,
  slackUserID: String,
  auth: {
    tokenType: String,
    scope: String,
    expiresOn: String,
    expiresIn: Number,
    extExpiresIn: Number,
    accessToken: String,
    idToken: String,
    refreshToken: String,
  },
});

export default mongoose.model("User", userSchema);

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  slackUserName: String,
  slackUserID: String,
  auth: {
    tokenType: String,
    scope: String,
    expiresIn: String,
    extExpiresIn: String,
    expiresOn: String,
    notBefore: String,
    resource: String,
    accessToken: String,
    idToken: String,
    refreshToken: String,
  },
});

export default mongoose.model("User", userSchema);

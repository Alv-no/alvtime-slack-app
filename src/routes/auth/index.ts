import express from "express";
import session from "express-session";
import jwt from "jwt-simple";
import passport from "passport";
import config from "../../config";
import env from "../../environment";
import UserModel from "../../models/user";
import { slackWebClient } from "../slack/index";
import runCommand from "../slack/runCommand";
import { actionTypes } from "../slack/slashCommand";
import azureAdStrategy, { AuthenticatedUser, DoneFunc } from "./azureAd";
import createLoginPage from "./loginPage";

passport.use("azureAd", azureAdStrategy);
passport.serializeUser((_user: AuthenticatedUser, done: DoneFunc) =>
  done(null, "not in use")
);

const oauth2Router = express.Router();
export default oauth2Router;

oauth2Router.use(passport.initialize());
oauth2Router.use(passport.session());
oauth2Router.use(
  session({
    secret: config.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
  })
);

oauth2Router.get("/login", (req, res) => {
  const { slackTeamDomain, exp } = jwt.decode(
    req.query.token,
    config.JWT_SECRET
  );
  const now = new Date().getTime();
  if (now > exp) {
    throw "Expired";
  }
  req.session.loginToken = req.query.token;
  res.send(createLoginPage(slackTeamDomain));
});

oauth2Router.get("/azuread", passport.authenticate("azureAd"));

oauth2Router.get(
  "/cb",
  passport.authenticate("azureAd", {
    failureRedirect: "/login",
  }),
  async (req, res, next) => {
    const { slackTeamDomain, slackChannelID } = jwt.decode(
      req.session.loginToken,
      config.JWT_SECRET
    );
    try {
      const written = await writeUserToDb(
        req.user as AuthenticatedUser,
        req.session.loginToken
      );
      if (written) {
        next();
      } else {
        res.redirect(
          `https://${slackTeamDomain}.slack.com/app_redirect?channel=${slackChannelID}`
        );
      }
    } catch (error) {
      console.error("error", error);
      res.redirect("/login");
    }
  },
  (req, res) => {
    const { slackTeamDomain, slackChannelID, slackUserID, action } = jwt.decode(
      req.session.loginToken,
      config.JWT_SECRET
    );

    const { email } = req.user as AuthenticatedUser;

    const loginSuccessMessage = createLoginSuccessMessage(
      slackUserID,
      email,
      slackChannelID
    );
    if (actionTypes.COMMAND === action.type) runCommand(action.value);
    slackWebClient.chat.postEphemeral({
      token: env.SLACK_BOT_TOKEN,
      channel: slackChannelID,
      user: slackUserID,
      ...loginSuccessMessage,
    });
    res.redirect(
      `https://${slackTeamDomain}.slack.com/app_redirect?channel=${slackChannelID}`
    );
  }
);

function createLoginSuccessMessage(
  slackUserID: string,
  alvtimeUserName: string,
  channelId: string
) {
  return {
    text: "",
    response_type: "ephemeral",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:white_check_mark: Success! <@${slackUserID}> is now connected to ${alvtimeUserName}`,
        },
      },
    ],
    channel: channelId,
  };
}

async function writeUserToDb(
  authenticatedUser: AuthenticatedUser,
  loginToken: string
) {
  let written = false;
  const { slackUserName, slackUserID } = jwt.decode(
    loginToken,
    config.JWT_SECRET
  );

  const user = await UserModel.findOne({ slackUserID });
  if (!user) {
    const { name, email, auth } = authenticatedUser;
    const doc = {
      name,
      email,
      slackUserName,
      slackUserID,
      auth,
    };

    const user = new UserModel(doc);
    await user.save();
    written = true;
  }
  return written;
}

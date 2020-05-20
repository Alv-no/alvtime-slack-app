import express from "express";
import session from "express-session";
import jwt from "jwt-simple";
import passport from "passport";
import config from "../../config";
import env from "../../environment";
import UserModel from "../../models/user";
import azureAdStrategy, { AuthenticatedUser, DoneFunc } from "./azureAd";
import { slackWebClient } from "../slack/index";
import { actionTypes } from "../slack/slashCommand";
import runCommand from "../slack/runCommand";

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

function createLoginPage(slackTeamDomain: string) {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title></title>
    <style>
      body {
        display: grid;
        justify-content: center;
        background-color: #f7f7f7;
        font-family: "Source Sans Pro", sans-serif;
        font-weight: 400;
        line-height: 1.5;
        color: #312f30;
      }

      .container {
        margin-top: 3rem;
        padding: 2rem;
        border-radius: 30px;
        text-align: center;
      }

      .yellow-button {
        display: inline-block;
        background-color: transparent;
        -webkit-border-radius: 30px;
        -moz-border-radius: 30px;
        -ms-border-radius: 30px;
        border-radius: 30px;
        -khtml-border-radius: 30px;
        padding: 10px 40px;
        border: 2px solid #e8b925;
        line-height: 1rem;
        font-family: "Source Sans Pro", sans-serif;
        font-weight: 600;
        font-size: 14px;
        white-space: nowrap;
        cursor: pointer;
        -webkit-transition: all 300ms linear;
        -moz-transition: all 300ms linear;
        -ms-transition: all 300ms linear;
        -o-transition: all 300ms linear;
        transition: all 300ms linear;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        text-transform: uppercase;
        color: black;
        text-decoration: none;
      }

      .yellow-button:hover {
        background-color: #eabb26;
      }

      .workspace-line {
        margin-bottom: 2rem;
      }

      .workspace {
        font-size: 26px;
        font-weight: 300;
      }
    </style>
  </head>
  <body>
    <body>
      <div class="container">
        <div
          class="container-lg p-responsive py-6 py-lg-10"
          style="max-width: 600px;"
        >
          <img
            src="/images/alvtimeplusslack.svg"
            class="alvtimeplusslack"
            style="max-width: 300px;"
          />
          <p>Finish connecting your Alvtime account to your Slack account</p>
          <p class="workspace-line">
            on the
            <span class="workspace">${slackTeamDomain}.slack.com</span>
            workspace
          </p>
          <p>
            This will connect your accounts so that you can use Slack to view
            rich previews for reported hours, report and remove hours, and other
            features that depend on your access to Alvtime.
          </p>
          <p></p>
          <a
            href="${env.HOST}/oauth2/azureAd"
            class="yellow-button"
            >Connect Alvtime account</a
          >
        </div>
      </div>
    </body>
  </body>
</html>
  `;
}

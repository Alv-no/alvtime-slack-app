import express from "express";
import env from "../../environment";
import { slackWebClient, slackInteractions } from "./index";
import { capitalizeFirstLetter } from "../../utils/text";
import jwt from "jwt-simple";
import config from "../../config";
import UserModel from "../../models/user";
import runCommand from "./runCommand";

export interface CommandBody {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id: string;
}

interface LoginInfo {
  slackUserName: string;
  slackUserID: string;
  slackChannelID: string;
  action: { type: string; value: { [key: string]: string } };
}

const actionTypes = Object.freeze({
  COMMAND: "COMMAND",
});

export default function createSlashCommandRouter() {
  const slashCommandRouter = express.Router();

  slashCommandRouter.use("/", authenticate);

  slashCommandRouter.post("/", (req, res) => {
    const commandBody = req.body as CommandBody;
    runCommand(commandBody);
    res.send("");
  });

  slackInteractions.action({ actionId: "open_login_in_browser" }, () => ({
    text: "Åpner login nettside...",
  }));

  return slashCommandRouter;
}

async function authenticate(
  req: { body: CommandBody },
  res: { send: (s: string) => void },
  next: (s?: string) => void
) {
  const user = await UserModel.findOne({ slackUserID: req.body.user_id });
  if (!user) {
    const { user_name, user_id, channel_id, command, text } = req.body;
    const loginInfo = {
      slackUserName: user_name,
      slackUserID: user_id,
      slackChannelID: channel_id,
      action: { type: actionTypes.COMMAND, value: { command, text } },
    };
    sendLoginMessage(loginInfo);
    res.send("");
  } else {
    next();
  }
}

function sendLoginMessage(info: LoginInfo) {
  const { slackUserName, slackChannelID } = info;
  const token = createToken(info);
  const loginMessage = createLoginMessage(slackUserName, slackChannelID, token);
  slackWebClient.chat.postMessage(loginMessage);
}

function createToken(info: LoginInfo) {
  const iat = new Date().getTime();
  const exp = iat + 60 * 60 * 1000;
  const payload = {
    ...info,
    iat,
    exp,
  };
  return jwt.encode(payload, config.JWT_SECRET);
}

function createLoginMessage(name: string, channelId: string, token: string) {
  name = capitalizeFirstLetter(name);
  return {
    text: "",
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `Hei ${name} :wave:` },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: "Du er ikke logget inn." },
        accessory: {
          type: "button",
          action_id: "open_login_in_browser",
          text: {
            type: "plain_text",
            text: "Login med Azure Ad",
            emoji: true,
          },
          url: env.HOST + "/oauth2/azuread?token=" + token,
          value: "login_button_clicked",
        },
      },
    ],
    channel: channelId,
  };
}

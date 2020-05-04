import express from "express";
import env from "../../environment";
import { slackWebClient, slackInteractions } from "./index";
import { capitalizeFirstLetter } from "../../utils/text";
import jwt from "jwt-simple";
import config from "../../config";

interface CommandBody {
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

function createSlashCommandRouter() {
  const slashCommandRouter = express.Router();

  slashCommandRouter.use("/", (req, res, next) => {
    const {
      text,
      channel_id,
      user_name,
      trigger_id,
      team_id,
      team_domain,
      user_id,
    } = req.body;

    if (text === "test") {
      const iat = new Date().getTime();
      const oneHoure = 60 * 60 * 1000;
      const payload = {
        trigger_id,
        teamSlackId: team_id,
        teamSlackDomain: team_domain,
        userSlackId: user_id,
        channelSlackId: channel_id,
        replaySlashCommand: true,
        iat,
        exp: iat + oneHoure,
      };
      const token = jwt.encode(payload, config.JWT_SECRET);
      const loginMessage = createLoginMessage(user_name, channel_id, token);
      slackWebClient.chat.postMessage(loginMessage);
      res.send("");
    } else {
      next();
    }
  });

  slashCommandRouter.post("/", (req, res) => {
    const body = req.body as CommandBody;
    slackWebClient.chat.postMessage({
      text: "Her kommer det alvtime funksjonalitet",
      channel: body.channel_id,
    });
    res.send("");
  });

  slackInteractions.action(
    { actionId: "open_login_in_browser" },
    async function () {
      return {
        text: "Åpner login nettside...",
      };
    }
  );

  return slashCommandRouter;
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

export default createSlashCommandRouter;

import fetch from "node-fetch";
import createAlvtimeClient from "../../client/index";
import config from "../../config";
import env from "../../environment";
import UserModel, { UserData } from "../../models/user";
import { slackWebClient } from "./index";
import { CommandBody } from "./slashCommand";

const commands = Object.freeze({
  REGISTRER: "REGISTRER",
  TASKS: "TASKS",
});

const { REGISTRER, TASKS } = commands;

const client = createAlvtimeClient(env.ALVTIME_API_URI);

export default async function runCommand(commandBody: CommandBody) {
  const textArray = commandBody.text.split(" ");
  const command = textArray[0].toUpperCase();
  const params = textArray.filter((_t, i) => i !== 0);
  const userData = await UserModel.findOne({
    slackUserID: commandBody.user_id,
  });

  switch (command) {
    case REGISTRER:
      register(params, commandBody, (userData as unknown) as UserData);
      break;

    case TASKS:
      tasks(params, commandBody, (userData as unknown) as UserData);
      break;
    default:
      break;
  }
}

function register(
  params: string[],
  commandBody: CommandBody,
  userData: UserData
) {}

async function tasks(
  params: string[],
  commandBody: CommandBody,
  userData: UserData
) {
  try {
    const accessToken = await getAccessToken(userData);
    const tasks = await client.getTasks(accessToken);
    slackWebClient.chat.postMessage({
      text: JSON.stringify(tasks),
      channel: commandBody.channel_id,
    });
  } catch (e) {
    console.log("error", e);
  }
}

interface RefreshAccessTokenRespons {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
  refresh_token: string;
  id_token: string;
}

interface RefreshAccessTokenErrorRespons {
  error: string;
  error_description: string;
  error_codes: number[];
  timestamp: string;
  trace_id: string;
  correlation_id: string;
}

async function getAccessToken(userData: UserData) {
  let accessToken;
  const now = Math.floor(new Date().getTime() / 1000);
  const expiresOn = parseInt(userData.auth.expiresOn);
  const isExpired = now > expiresOn;

  if (isExpired) {
    const refreshTokenBody = await refreshAccessToken(userData);
    const doc = {
      auth: {
        tokenType: refreshTokenBody.token_type,
        scope: refreshTokenBody.scope,
        expiresIn: refreshTokenBody.expires_in,
        expiresOn: now + refreshTokenBody.expires_in,
        accessToken: refreshTokenBody.access_token,
        idToken: refreshTokenBody.id_token,
        refreshToken: refreshTokenBody.refresh_token,
      },
    };
    UserModel.findOneAndUpdate({ slackUserID: userData.slackUserID }, doc, {
      upsert: true,
    });
    accessToken = refreshTokenBody.access_token;
  } else {
    accessToken = userData.auth.accessToken;
  }

  return accessToken;
}

async function refreshAccessToken(userData: UserData) {
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };

  const body = new URLSearchParams();
  body.append("client_id", env.AZURE_AD_CLIENT_ID);
  body.append("scope", userData.auth.scope);
  // body.append("redirect_uri", "http://localhost/myapp/");
  body.append("grant_type", "refresh_token");
  body.append("client_secret", env.AZURE_AD_CLIENT_SECTRET);
  body.append("refresh_token", userData.auth.refreshToken);
  const url =
    config.AUTHORITY + config.TENANT_ID + "/oauth2/v2.0/token HTTP/1.1";
  const init = { method: "POST", headers, body };

  const response = await fetch(url, init);

  if (response.status !== 200) {
    throw response.statusText;
  }

  const json = ((await response.json()) as unknown) as RefreshAccessTokenRespons &
    RefreshAccessTokenErrorRespons;

  if (json.error) {
    throw response;
  }
  return json;
}

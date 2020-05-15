import fetch from "node-fetch";
import createAlvtimeClient from "../../client/index";
import config from "../../config";
import env from "../../environment";
import UserModel, { UserData } from "../../models/user";
import { slackWebClient } from "./index";
import { CommandBody } from "./slashCommand";
import getAccessToken from "../auth/getAccessToken";

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

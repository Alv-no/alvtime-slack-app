import { v4 as uuidv4 } from "uuid";

export default Object.freeze({
  DATE_FORMAT: "YYYY-MM-DD",
  AUTHORITY: "https://login.microsoftonline.com/",
  TENANT_ID: "76749190-4427-4b08-a3e4-161767dd1b73",
  JWT_SECRET: uuidv4(),
  SESSION_SECRET: uuidv4(),
});

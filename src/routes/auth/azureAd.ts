import jwt from "jwt-simple";
import OAuth2Strategy from "passport-oauth2";
import config from "../../config";
import env from "../../environment";

interface Params {
  token_type: string;
  scope: string;
  expires_in: string;
  ext_expires_in: string;
  expires_on: string;
  not_before: string;
  resource: string;
  access_token: string;
  id_token: string;
}

interface Profile {
  provider: string;
}

interface User {
  aud: string;
  iss: string;
  iat: number;
  nbf: number;
  exp: number;
  amr: string[];
  ipaddr: string;
  name: string;
  oid: string;
  sub: string;
  tid: string;
  unique_name: string;
  upn: string;
  ver: string;
}

export interface AuthenticatedUser {
  user: User;
  params: Params;
  refreshToken: string;
}

export type DoneFunc = (error: Error | null, user: AuthenticatedUser) => void;

const azureAdBaseUrl = "https://login.windows.net/";
const authorizationURL =
  azureAdBaseUrl + config.TENANT_ID + "/oauth2/authorize";
const tokenURL = azureAdBaseUrl + config.TENANT_ID + "/oauth2/token";

const oauth2Options = {
  authorizationURL,
  tokenURL,
  clientID: env.AZURE_AD_CLIENT_ID,
  clientSecret: env.AZURE_AD_CLIENT_SECTRET,
  callbackURL: env.HOST + "/oauth2/cb",
};

export default new OAuth2Strategy(oauth2Options, azureAdLoginSuccess);

function azureAdLoginSuccess(
  _accessToken: string,
  refreshToken: string,
  params: Params,
  _profile: Profile,
  done: DoneFunc
) {
  const user = jwt.decode(params.id_token, "", true) as User;
  done(null, { user, params, refreshToken });
}

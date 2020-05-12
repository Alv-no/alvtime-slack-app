import express from "express";
import session from "express-session";
import jwt from "jwt-simple";
import passport from "passport";
import config from "../../config";
import UserModel from "../../models/user";
import azureAdStrategy, { AuthenticatedUser, DoneFunc } from "./azureAd";

passport.use("azureAd", azureAdStrategy);
passport.serializeUser((user: AuthenticatedUser, done: DoneFunc) =>
  done(null, user)
);

const oauth2Router = express.Router();

oauth2Router.use(passport.initialize());
oauth2Router.use(passport.session());
oauth2Router.use(
  session({
    secret: config.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
  })
);

oauth2Router.get(
  "/azuread",
  (req, _res: {}, next: () => void) => {
    req.session.loginToken = req.query.token;
    next();
  },
  passport.authenticate("azureAd", { successRedirect: "/" })
);

oauth2Router.get(
  "/cb",
  passport.authenticate("azureAd", {
    failureRedirect: "/login",
  }),
  async (req, res, next) => {
    try {
      await writeUserToDb(
        req.user as AuthenticatedUser,
        req.session.loginToken
      );
      next();
    } catch (error) {
      console.error(error);
      res.redirect("/login");
    }
  },
  function (_req, res) {
    res.redirect("/");
  }
);

async function writeUserToDb(
  authenticatedUser: AuthenticatedUser,
  loginToken: string
) {
  const { slackUserName, slackUserID } = jwt.decode(
    loginToken,
    config.JWT_SECRET
  );
  const { user, params, refreshToken } = authenticatedUser;
  const doc = {
    name: user.name,
    email: user.unique_name,
    slackUserName,
    slackUserID,
    auth: {
      tokenType: params.token_type,
      scope: params.scope,
      expiresIn: params.expires_in,
      extExpiresIn: params.ext_expires_in,
      expiresOn: params.expires_on,
      notBefore: params.not_before,
      resource: params.resource,
      accessToken: params.access_token,
      idToken: params.id_token,
      refreshToken,
    },
  };
  await UserModel.findOneAndUpdate({ slackUserID }, doc, { upsert: true });
}

export default oauth2Router;

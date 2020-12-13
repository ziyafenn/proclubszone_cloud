import * as admin from "firebase-admin";
import * as matches from "./scheduleMatches";

const serviceAccount = require("../keys/pro-clubs-zone-v2-firebase-adminsdk-jnm79-b0e14206de.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pro-clubs-zone-v2.firebaseio.com",
});

export const scheduleMatches = matches.scheduleMatches;

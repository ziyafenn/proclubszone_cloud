import * as functions from "firebase-functions";
const sgMail = require("@sendgrid/mail");

export const notifyOnNewLeague = functions.firestore
  .document("leagues/{leagueId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const name = data.name;
    const leagueType = data.private ? "Private" : "Public";

    const leagueLink = `https://console.firebase.google.com/project/pro-clubs-zone-v2/firestore/data/~2Fleagues~2F${snap.id}`;

    const msg = {
      to: "team@proclubs.zone", // Change to your recipient
      from: "noreply@proclubs.zone", // Change to your verified sender
      subject: `New League Created on PRZ`,
      // text: "and easy to do anywhere, even with Node.js",
      html: `<p>New ${leagueType} League Name: <b>${name}</b></p><p><a href="${leagueLink}">View League on Firebase</a></p>`,
    };

    try {
      await sgMail.send(msg);
    } catch (e) {
      throw new Error(e);
    }
  });

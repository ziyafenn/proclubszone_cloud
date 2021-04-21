import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
const sgMail = require("@sendgrid/mail");
const jwt = require("jsonwebtoken");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendAdminInvite = functions.https.onCall(
  async ({
    email,
    leagueId,
    leagueName,
    ownerUsername,
  }: {
    email: string;
    leagueId: string;
    leagueName: string;
    ownerUsername: string;
  }) => {
    try {
      const userRecord = await admin.auth().getUserByEmail(email);

      const token = jwt.sign(
        { uid: userRecord.uid, username: userRecord.displayName, leagueId },
        process.env.JTW_SECRET,
        {
          algorithm: "HS256",
          expiresIn: "1h",
        }
      );
      const msg = {
        to: email, // Change to your recipient
        from: "noreply@proclubs.zone", // Change to your verified sender
        subject: `${ownerUsername} invites you to become an admin on PRZ`,
        // text: "and easy to do anywhere, even with Node.js",
        html: "",
      };

      //const link = `http://0.0.0.0:5001/pro-clubs-zone-dev/us-central1/acceptAdmin?token=${token}`;
      const link = `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/acceptAdmin?token=${token}`;
      if (!userRecord.emailVerified) {
        throw new Error("not verified");
      }
      msg.html = `<p>You have been invited by <b>${ownerUsername}</b> to become an admin of <b>${leagueName}</b> on Pro Clubs Zone.</p><br/><a href=${link} style="font-size: 1rem">Click to accept request.</a>`;
      await sgMail.send(msg);
    } catch (error) {
      throw new Error(error);
    }
  }
);

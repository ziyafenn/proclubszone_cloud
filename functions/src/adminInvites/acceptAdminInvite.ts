import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
const jwt = require("jsonwebtoken");

export const acceptAdminInvite = functions.https.onRequest(async (req, res) => {
  const { token } = req.query as {
    token: string;
  };

  let payload;
  try {
    payload = jwt.verify(token, process.env.JTW_SECRET);

    const { uid, username, leagueId } = payload;

    const firestore = admin.firestore();
    const batch = firestore.batch();

    const leagueRef = firestore.collection("leagues").doc(leagueId);
    const userRef = firestore.collection("users").doc(uid);

    batch.set(
      leagueRef,
      {
        admins: {
          [uid]: {
            owner: false,
            username: username,
          },
        },
      },
      { merge: true }
    );

    batch.set(
      userRef,
      {
        leagues: {
          [leagueId]: {
            admin: true,
          },
        },
      },
      { merge: true }
    );

    await batch.commit();
    res
      .status(200)
      .send(
        "<p>You are now part of the admin team. You can close this window.</p>"
      );
  } catch (jwtErr) {
    if (jwtErr.name === "TokenExpiredError") {
      res
        .status(401)
        .send("<p>Link expired. Please request new invitation.</p>");
    } else {
      res.status(400).send(400);
    }
  }
});

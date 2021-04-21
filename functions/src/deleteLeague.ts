import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { ClubInt } from "./utils/interface";
const firebase_tools = require("firebase-tools");

const logger = functions.logger;

export const deleteLeague = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .https.onCall(
    async (
      data: {
        leagueId: string;
        leagueOwnerId: string;
      },
      context
    ) => {
      logger.info("data", data);

      const firestore = admin.firestore();
      const batch = firestore.batch();
      const leagueId = data.leagueId;
      const ownerId = context.auth?.uid;
      const isAdmin = context.auth && data.leagueOwnerId === ownerId;
      const firTools = firebase_tools.firestore;
      const users = firestore.collection("users");
      const leagueClubs = await firestore
        .collection("leagues")
        .doc(leagueId)
        .collection("clubs")
        .get();
      const path = `/leagues/${leagueId}`;

      if (!isAdmin) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Must be league admin to initiate delete."
        );
      }

      if (!leagueClubs.empty) {
        leagueClubs.forEach((doc) => {
          const club = doc.data() as ClubInt;
          for (const memberId of Object.keys(club.roster)) {
            const userRef = users.doc(memberId);
            if (memberId !== data.leagueOwnerId) {
              batch.update(userRef, {
                ["leagues." + leagueId]: admin.firestore.FieldValue.delete(),
              });
            }
          }
        });
      }
      const adminRef = users.doc(data.leagueOwnerId);
      batch.update(adminRef, {
        ["leagues." + leagueId]: admin.firestore.FieldValue.delete(),
      });
      return batch
        .commit()
        .then(async () => {
          await firTools.delete(path, {
            project: process.env.GCLOUD_PROJECT,
            recursive: true,
            yes: true,
            //     token: functions.config().fb.token,
          });
        })
        .then(() => {
          return "Success";
        })
        .catch((error) => {
          console.log("something went wrong", error);
          return "Something went wrong, please report";
        });
    }
  );

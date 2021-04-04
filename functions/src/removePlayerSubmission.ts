import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoalkeeperStats, OutfieldPlayerStats } from "./utils/interface";

type Props = {
  leagueID: string;
  matchID: string;
  clubID: string;
  playerID: string;
};

export const removePlayerSubmission = functions.https.onCall(
  async ({ leagueID, matchID, clubID, playerID }: Props) => {
    const firestore = admin.firestore();
    const bucket = admin.storage().bucket();
    const batch = firestore.batch();

    const leagueRef = firestore.collection("leagues").doc(leagueID);
    const totalStatsRef = leagueRef.collection("stats").doc("players");
    const matchStatsRef = totalStatsRef
      .collection("playerMatches")
      .doc(playerID.slice(0, -9));

    try {
      const getMatchStats = await matchStatsRef.get();
      const playerMatchStats = getMatchStats.data() as {
        [matchID: string]: GoalkeeperStats & OutfieldPlayerStats;
      };

      let statsUpdate = {};

      for (const [stat, value] of Object.entries(playerMatchStats[matchID])) {
        const firDecrement = () => {
          const negativeValue = -Math.abs(value);
          if (stat === "rating") {
            return admin.firestore.FieldValue.arrayRemove(value);
          } else {
            return admin.firestore.FieldValue.increment(negativeValue);
          }
        };
        statsUpdate = {
          ...statsUpdate,
          [stat]: firDecrement(),
        };
      }
      batch.set(
        totalStatsRef,
        {
          [playerID.slice(0, -9)]: {
            ...statsUpdate,
            matches: admin.firestore.FieldValue.increment(-1),
          },
        },
        { merge: true }
      );

      batch.update(matchStatsRef, {
        [matchID]: admin.firestore.FieldValue.delete(),
      });

      const storagePath = `${leagueID}/${matchID}/${clubID}/performance/${playerID}`;
      await Promise.all([bucket.file(storagePath).delete(), batch.commit()]);
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }
);

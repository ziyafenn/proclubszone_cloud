import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { MatchData } from "./utils/interface";
import updateStandings from "./actions/updateStandings";

export const undoMatch = functions.https.onCall(
  async ({ match }: { match: MatchData }) => {
    const firestore = admin.firestore();
    const batch = firestore.batch();
    const motm = match.motm;
    const motmSubmissions = match.motmSubmissions;
    const submissions = match.submissions;
    const homeTeamId = match.homeTeamId;
    const awayTeamId = match.awayTeamId;
    const result = match.result!;

    const leagueRef = firestore.collection("leagues").doc(match.leagueId);
    const standingsRef = leagueRef.collection("stats").doc("standings");
    const matchRef = leagueRef.collection("matches").doc(match.matchId);
    const totalStatsRef = leagueRef.collection("stats").doc("players");

    const submissionCorrect = () => {
      if (submissions && Object.keys(submissions).length > 1) {
        return false;
      }
      return true;
    };
    const motmSubmissionCorrect = () => {
      if (motmSubmissions && Object.keys(motmSubmissions).length > 1) {
        return false;
      } else {
        return true;
      }
    };

    try {
      const standings = await updateStandings(match, result, false);

      batch.update(standingsRef, {
        [homeTeamId]: standings[homeTeamId],
        [awayTeamId]: standings[awayTeamId],
      });
      batch.update(matchRef, {
        published: false,
        result: admin.firestore.FieldValue.delete(),
        conflict: !submissionCorrect(),
        motmConflict: !motmSubmissionCorrect(),
        motm: admin.firestore.FieldValue.delete(),
      });

      if (motm) {
        const matchStatsRef = totalStatsRef
          .collection("playerMatches")
          .doc(motm);

        batch.set(
          matchStatsRef,
          {
            [match.matchId]: {
              motm: 0,
            },
          },
          { merge: true }
        );

        batch.set(
          totalStatsRef,
          {
            [motm]: {
              motm: admin.firestore.FieldValue.increment(-1),
            },
          },
          { merge: true }
        );
      }
      await batch.commit();
      return "Success";
    } catch (error) {
      console.log(error);
      throw new Error("Submission commit error");
    }
  }
);

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { MatchData } from "./utils/interface";
import updateStandings from "./actions/updateStandings";

const logger = functions.logger;

export const matchSubmission = functions.https.onCall(
  async ({ match }: { match: MatchData }) => {
    const firestore = admin.firestore();
    const submissions = match.submissions;
    const motmSubmissions = match.motmSubmissions;
    const homeTeamId = match.homeTeamId;
    const awayTeamId = match.awayTeamId;
    const homeResult = submissions![homeTeamId];
    const awayResult = submissions![awayTeamId];

    const leagueRef = firestore.collection("leagues").doc(match.leagueId);
    const standingsRef = leagueRef.collection("stats").doc("standings");
    const matchRef = leagueRef.collection("matches").doc(match.matchId);
    const totalStatsRef = leagueRef.collection("stats").doc("players");

    const batch = firestore.batch();

    const submissionCorrect = () => {
      if (
        homeResult[homeTeamId] === awayResult[homeTeamId] &&
        homeResult[awayTeamId] === awayResult[awayTeamId]
      ) {
        return true;
      } else {
        return false;
      }
    };

    const motmSubmissionCorrect = () => {
      if (motmSubmissions && Object.keys(motmSubmissions).length > 1) {
        return false;
      } else {
        return true;
      }
    };

    if (submissionCorrect() && motmSubmissionCorrect()) {
      try {
        const standings = await updateStandings(match, homeResult, true);
        batch.update(standingsRef, {
          [homeTeamId]: standings[homeTeamId],
          [awayTeamId]: standings[awayTeamId],
        });
        batch.update(matchRef, {
          published: true,
          result: homeResult,
          motm: motmSubmissions ? Object.values(motmSubmissions)[0] : null,
        });

        if (motmSubmissions) {
          const playerId = Object.values(motmSubmissions)[0];
          logger.info("found submissions", playerId);

          const matchStatsRef = totalStatsRef
            .collection("playerMatches")
            .doc(playerId);

          batch.set(
            matchStatsRef,
            {
              [match.matchId]: {
                motm: 1,
              },
            },
            { merge: true }
          );
          batch.set(
            totalStatsRef,
            {
              [playerId]: {
                motm: admin.firestore.FieldValue.increment(1),
              },
            },
            { merge: true }
          );
        }

        await batch.commit();
        return "Success";
      } catch (error) {
        logger.error("commit error", error);
        throw new Error("Submission commit error");
      }
    } else {
      batch.update(matchRef, {
        conflict: submissionCorrect() ? false : true,
        motmConflict: motmSubmissionCorrect() ? false : true,
      });
      batch.update(leagueRef, {
        conflictMatchesCount: admin.firestore.FieldValue.increment(1),
      });
      try {
        await batch.commit();
        return "Conflict";
      } catch (error) {
        logger.error("Conflict commit error", error);
        throw new Error("Conflict commit error");
      }
    }
  }
);

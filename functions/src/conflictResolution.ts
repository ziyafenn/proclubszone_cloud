import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Match, MatchData, Submission } from "./utils/interface";
import updateStandings from "./actions/updateStandings";

const logger = functions.logger;

export const conflictResolution = functions.https.onCall(
  async ({
    match,
    selectedTeam,
    adminResolution,
  }: {
    match: MatchData;
    selectedTeam: string;
    adminResolution: boolean;
  }) => {
    const firestore = admin.firestore();
    const batch = firestore.batch();
    const leagueRef = firestore.collection("leagues").doc(match.leagueId);
    const standingsRef = leagueRef.collection("stats").doc("standings");
    const matchRef = leagueRef.collection("matches").doc(match.matchId);
    const totalStatsRef = leagueRef.collection("stats").doc("players");

    const homeTeamId = match.homeTeamId;
    const awayTeamId = match.awayTeamId;
    const motmSubmissions = match.motmSubmissions;
    let result: Submission;

    if (adminResolution) {
      result = {
        [homeTeamId]:
          selectedTeam === "home" ? 3 : selectedTeam === "draw" ? 1 : 0,
        [awayTeamId]:
          selectedTeam === "away" ? 3 : selectedTeam === "draw" ? 1 : 0,
      };
    } else {
      result = match.submissions![selectedTeam];
    }

    try {
      const standings = await updateStandings(match, result, true);
      batch.update(standingsRef, {
        [homeTeamId]: standings[homeTeamId],
        [awayTeamId]: standings[awayTeamId],
      });

      const submissionData: Partial<Match> = {
        published: true,
        result: result,
        conflict: false,
        motmConflict: false,
      };

      if (motmSubmissions) {
        let motmPlayerID: string;
        if (match.motmConflict) {
          motmPlayerID = motmSubmissions[selectedTeam];
        } else {
          motmPlayerID = Object.values(motmSubmissions)[0];
        }
        submissionData.motm = motmPlayerID;

        const matchStatsRef = totalStatsRef
          .collection("playerMatches")
          .doc(motmPlayerID);

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
            [motmPlayerID]: {
              motm: admin.firestore.FieldValue.increment(1),
            },
          },
          { merge: true }
        );
      }

      batch.update(matchRef, submissionData);

      if (match.submissions && Object.keys(match.submissions).length > 1) {
        batch.update(leagueRef, {
          conflictMatchesCount: admin.firestore.FieldValue.increment(-1),
        });
      }

      await batch.commit();
      return "Match Resolved";
    } catch (error) {
      logger.error(error);
      throw new Error(error);
    }
  }
);

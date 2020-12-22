import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { MatchData, Submission } from "./utils/interface";
import updateStandings from "./actions/updateStandings";

const logger = functions.logger;

export const conflictResolution = functions.https.onCall(
  async ({ match, result }: { match: MatchData; result: Submission }) => {
    const firestore = admin.firestore();
    const batch = firestore.batch();
    const leagueRef = firestore.collection("leagues").doc(match.leagueId);
    const standingsRef = leagueRef.collection("stats").doc("standings");
    const matchRef = leagueRef.collection("matches").doc(match.matchId);

    const homeTeam = match.home;
    const awayTeam = match.away;

    await updateStandings(match, result)
      .then((standings) => {
        batch.update(standingsRef, {
          [homeTeam]: standings[homeTeam],
          [awayTeam]: standings[awayTeam],
        });
      })
      .then(() => {
        batch.update(matchRef, {
          published: true,
          result: result,
          conflict: false,
        });
      })
      .then(() => {
        batch.commit().catch((err) => logger.error("commit error", err));
      })
      .then(() => {
        return "Conflict Resolved";
      })
      .catch((err) => {
        logger.error(err, "Err from commit");
      });
  }
);

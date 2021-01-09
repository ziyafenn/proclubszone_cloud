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

    const homeTeamId = match.homeTeamId;
    const awayTeamId = match.awayTeamId;

    return updateStandings(match, result)
      .then((standings) => {
        batch.update(standingsRef, {
          [homeTeamId]: standings[homeTeamId],
          [awayTeamId]: standings[awayTeamId],
        });
      })
      .then(() => {
        batch.update(matchRef, {
          published: true,
          result: result,
          conflict: false,
        });
        batch.update(leagueRef, {
          conflictMatchesCount: admin.firestore.FieldValue.increment(-1),
        });
      })
      .then(async () => {
        await batch.commit().catch((err) => logger.error("commit error", err));
      })
      .then(() => {
        return "Conflict Resolved";
      })
      .catch((err) => {
        logger.error(err, "Err from commit");
      });
  }
);

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { MatchData } from "./utils/interface";
import updateStandings from "./actions/updateStandings";

const logger = functions.logger;

export const matchSubmission = functions.https.onCall(
  async ({ match }: { match: MatchData }) => {
    const firestore = admin.firestore();
    const submissions = match.submissions;
    const homeTeamId = match.homeTeamId;
    const awayTeamId = match.awayTeamId;
    const homeResult = submissions[homeTeamId];
    const awayResult = submissions[awayTeamId];

    const leagueRef = firestore.collection("leagues").doc(match.leagueId);
    const standingsRef = leagueRef.collection("stats").doc("standings");
    const matchRef = leagueRef.collection("matches").doc(match.matchId);

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

    if (submissionCorrect()) {
      return updateStandings(match, homeResult)
        .then((standings) => {
          batch.update(standingsRef, {
            [homeTeamId]: standings[homeTeamId],
            [awayTeamId]: standings[awayTeamId],
          });
        })
        .then(() => {
          batch.update(matchRef, {
            published: true,
            result: homeResult,
          });
        })
        .then(async () => {
          return batch
            .commit()
            .then(() => {
              return "Success";
            })
            .catch((err) => logger.error("commit error", err));
        });
    } else {
      batch.update(matchRef, {
        conflict: true,
      });
      batch.update(leagueRef, {
        conflictMatchesCount: admin.firestore.FieldValue.increment(1),
      });
      return batch
        .commit()
        .then(() => {
          return "Conflict";
        })
        .catch((err) => {
          logger.error(err, "Err from commit");
        });
    }
  }
);

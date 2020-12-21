import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { MatchData } from "./utils/interface";
import updateStandings from "./actions/updateStandings";

const logger = functions.logger;

export const matchSubmission = functions.https.onCall(async (data) => {
  const firestore = admin.firestore();
  const match: MatchData = data.data;
  const submissions = match.submissions;
  const homeTeam = match.home;
  const awayTeam = match.away;
  const homeResult = submissions[match.home];
  const awayResult = submissions[match.away];

  const leagueRef = firestore.collection("leagues").doc(match.leagueId);
  const standingsRef = leagueRef.collection("stats").doc("standings");
  const matchRef = leagueRef.collection("matches").doc(match.matchId);

  const batch = firestore.batch();

  const submissionCorrect = () => {
    if (
      homeResult[homeTeam] === awayResult[homeTeam] &&
      homeResult[awayTeam] === awayResult[awayTeam]
    ) {
      return true;
    } else {
      return false;
    }
  };

  if (submissionCorrect()) {
    updateStandings(match)
      .then((standings) => {
        batch.update(standingsRef, {
          [homeTeam]: standings[homeTeam],
          [awayTeam]: standings[awayTeam],
        });
      })
      .then(() => {
        batch.update(matchRef, {
          published: true,
          result: homeResult,
        });
      })
      .then(() => {
        batch.commit().catch((err) => logger.error("commit error", err));
      })
      .then(() => {
        return "All Good Bruh";
      })
      .catch((err) => {
        logger.error(err, "Err from commit");
      });
  } else {
    batch.update(matchRef, {
      conflict: true,
    });
    return batch
      .commit()
      .then(() => {
        return "Match is set to conflict mode";
      })
      .catch((err) => {
        logger.error(err, "Err from commit");
      });
  }
});

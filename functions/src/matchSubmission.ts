import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { ClubStanding, MatchData } from "./utils/interface";

const logger = functions.logger;

// type Match = {
//   away: string;
//   conflict: boolean;
//   published: boolean;
//   home: string;
//   teams: [string, string];
//   id: number;
//   submissions: {
//     [id: string]: {
//       homeResult: number;
//       awayResult: number;
//     };
//   };
// };

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
  let standings: ClubStanding;

  const updateStandings = async (result: { [team: string]: number }) => {
    const editStandings = () => {
      const homeTeamStanding = standings[homeTeam];
      const awayTeamStanding = standings[awayTeam];

      const winUpd = (team: ClubStanding[string]) => {
        return {
          won: team.won + 1,
          points: team.points + 3,
        };
      };
      const drawUpd = (team: ClubStanding[string]) => {
        return {
          draw: team.draw + 1,
          points: team.draw + 1,
        };
      };

      const defeatUpd = (team: ClubStanding[string]) => {
        return {
          lost: team.lost + 1,
        };
      };

      const updateGamesGoalsHome = {
        played: homeTeamStanding.played + 1,
        conceded: homeTeamStanding.conceded + result[awayTeam],
        scored: homeTeamStanding.scored + result[homeTeam],
      };

      const updateGamesGoalsAway = {
        played: awayTeamStanding.played + 1,
        conceded: awayTeamStanding.conceded + result[homeTeam],
        scored: awayTeamStanding.scored + result[awayTeam],
      };

      if (result[homeTeam] > result[awayTeam]) {
        standings[homeTeam] = {
          ...homeTeamStanding,
          ...updateGamesGoalsHome,
          ...winUpd(homeTeamStanding),
        };
        standings[awayTeam] = {
          ...awayTeamStanding,
          ...updateGamesGoalsAway,
          ...defeatUpd(awayTeamStanding),
        };
      }
      if (result[homeTeam] === result[awayTeam]) {
        standings[homeTeam] = {
          ...homeTeamStanding,
          ...updateGamesGoalsHome,
          ...drawUpd(homeTeamStanding),
        };
        standings[awayTeam] = {
          ...awayTeamStanding,
          ...updateGamesGoalsAway,
          ...drawUpd(awayTeamStanding),
        };
      }
      if (result[homeTeam] < result[awayTeam]) {
        standings[homeTeam] = {
          ...homeTeamStanding,
          ...updateGamesGoalsHome,
          ...defeatUpd(homeTeamStanding),
        };
        standings[awayTeam] = {
          ...awayTeamStanding,
          ...updateGamesGoalsAway,
          ...winUpd(awayTeamStanding),
        };
      }
    };

    await standingsRef
      .get()
      .then((doc) => {
        standings = doc.data() as ClubStanding;
      })
      .then(() => {
        editStandings();
      })
      .then(() => {
        return batch.update(standingsRef, {
          [homeTeam]: standings[homeTeam],
          [awayTeam]: standings[awayTeam],
        });
      })
      .catch((err) => logger.error(err));
  };

  const submissionCorrect =
    JSON.stringify(homeResult) === JSON.stringify(awayResult);

  if (submissionCorrect) {
    return updateStandings(homeResult)
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

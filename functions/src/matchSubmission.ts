import * as functions from "firebase-functions";
import { ClubStanding } from "./utils/interface";

const logger = functions.logger;

type Match = {
  away: string;
  conflict: boolean;
  published: boolean;
  home: string;
  teams: [string, string];
  id: number;
  submissions: {
    [id: string]: {
      homeScore: number;
      awayScore: number;
    };
  };
};

export const matchSubmission = functions.firestore
  .document("leagues/{leagueId}/matches6/{matchId}")
  .onUpdate((change) => {
    const docRef = change.after.ref;
    const match: Match = change.after.data() as Match;
    const submissions = match.submissions;
    const submissionCount = Object.keys(submissions).length;
    const homeTeam = match.home;
    const awayTeam = match.away;

    if (!match.published) {
      if (submissionCount === 1) {
        return logger.log("first submission");
      } else {
        const homeScore = submissions[match.home];
        const awayScore = submissions[match.away];
        const batch = change.after.ref.firestore.batch();
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

          const leagueRef = docRef.parent.parent;
          const standingsRef = leagueRef?.collection("stats").doc("standings");
          await standingsRef
            ?.get()
            .then((doc) => {
              standings = doc.data() as ClubStanding;
              logger.info("old", standings);
            })
            .then(() => {
              editStandings();
            })
            .then(() => {
              logger.info("new", standings);
              return batch.update(standingsRef, {
                [homeTeam]: standings[homeTeam],
                [awayTeam]: standings[awayTeam],
              });
            })
            .catch((err) => logger.error(err));
        };

        const submissionCorrect =
          JSON.stringify(homeScore) === JSON.stringify(awayScore);

        if (submissionCorrect) {
          return updateStandings(homeScore)
            .then(() => {
              batch.update(docRef, {
                published: true,
                result: homeScore,
              });
            })
            .then(() => {
              return batch.commit().catch((err) => {
                logger.error(err, "Err from commit");
              });
            })
            .catch((err) => {
              logger.error("update standings error", err);
            });
        } else {
          batch.update(docRef, {
            conflict: true,
          });
          return batch.commit().catch((err) => {
            logger.error(err, "Err from commit");
          });
        }
      }
    } else {
      logger.info("match published");
    }
  });

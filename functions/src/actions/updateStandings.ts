import { ClubStanding, MatchData, Submission } from "../utils/interface";
import * as admin from "firebase-admin";

const updateStandings = async (
  data: MatchData,
  result: Submission,
  publish: boolean
): Promise<ClubStanding> => {
  const firestore = admin.firestore();
  const leagueRef = firestore.collection("leagues").doc(data.leagueId);
  const standingsRef = leagueRef.collection("stats").doc("standings");
  let standings: ClubStanding;
  const homeTeamId = data.homeTeamId;
  const awayTeamId = data.awayTeamId;
  const awayResult = Number(result[awayTeamId]);
  const homeResult = Number(result[homeTeamId]);

  const editStandings = () => {
    const homeTeamStanding = standings[homeTeamId];
    const awayTeamStanding = standings[awayTeamId];

    const winUpd = (team: ClubStanding[string]) => {
      return {
        won: publish ? team.won + 1 : team.won - 1,
        points: publish ? team.points + 3 : team.points - 3,
      };
    };
    const drawUpd = (team: ClubStanding[string]) => {
      return {
        draw: publish ? team.draw + 1 : team.draw - 1,
        points: publish ? team.points + 1 : team.draw - 1,
      };
    };

    const defeatUpd = (team: ClubStanding[string]) => {
      return {
        lost: publish ? team.lost + 1 : team.lost - 1,
      };
    };

    const updateGamesGoalsHome = {
      played: publish
        ? homeTeamStanding.played + 1
        : homeTeamStanding.played - 1,
      conceded: publish
        ? homeTeamStanding.conceded + awayResult
        : homeTeamStanding.conceded - awayResult,
      scored: publish
        ? homeTeamStanding.scored + homeResult
        : homeTeamStanding.scored - homeResult,
    };

    const updateGamesGoalsAway = {
      played: publish
        ? awayTeamStanding.played + 1
        : awayTeamStanding.played - 1,
      conceded: publish
        ? awayTeamStanding.conceded + homeResult
        : awayTeamStanding.conceded - homeResult,
      scored: publish
        ? awayTeamStanding.scored + awayResult
        : awayTeamStanding.scored - awayResult,
    };

    if (result[homeTeamId] > result[awayTeamId]) {
      standings[homeTeamId] = {
        ...homeTeamStanding,
        ...updateGamesGoalsHome,
        ...winUpd(homeTeamStanding),
      };
      standings[awayTeamId] = {
        ...awayTeamStanding,
        ...updateGamesGoalsAway,
        ...defeatUpd(awayTeamStanding),
      };
    }
    if (result[homeTeamId] === result[awayTeamId]) {
      standings[homeTeamId] = {
        ...homeTeamStanding,
        ...updateGamesGoalsHome,
        ...drawUpd(homeTeamStanding),
      };
      standings[awayTeamId] = {
        ...awayTeamStanding,
        ...updateGamesGoalsAway,
        ...drawUpd(awayTeamStanding),
      };
    }
    if (result[homeTeamId] < result[awayTeamId]) {
      standings[homeTeamId] = {
        ...homeTeamStanding,
        ...updateGamesGoalsHome,
        ...defeatUpd(homeTeamStanding),
      };
      standings[awayTeamId] = {
        ...awayTeamStanding,
        ...updateGamesGoalsAway,
        ...winUpd(awayTeamStanding),
      };
    }
  };

  return standingsRef
    .get()
    .then((doc) => {
      standings = doc.data() as ClubStanding;
    })
    .then(() => {
      editStandings();
    })
    .then(() => {
      return standings;
    });
};

export default updateStandings;

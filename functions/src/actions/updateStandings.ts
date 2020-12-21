import { ClubStanding, MatchData } from "../utils/interface";
import * as admin from "firebase-admin";

const updateStandings = async (data: MatchData): Promise<ClubStanding> => {
  const firestore = admin.firestore();
  const leagueRef = firestore.collection("leagues").doc(data.leagueId);
  const standingsRef = leagueRef.collection("stats").doc("standings");
  let standings: ClubStanding;
  const homeTeam = data.home;
  const awayTeam = data.away;
  const result = data.submissions[homeTeam];
  const awayResult = Number(result[awayTeam]);
  const homeResult = Number(result[homeTeam]);

  console.log("updating standings", data);
  console.log("home team", homeTeam);
  console.log("result", result);

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
      conceded: homeTeamStanding.conceded + awayResult,
      scored: homeTeamStanding.scored + homeResult,
    };

    const updateGamesGoalsAway = {
      played: awayTeamStanding.played + 1,
      conceded: awayTeamStanding.conceded + homeResult,
      scored: awayTeamStanding.scored + awayResult,
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

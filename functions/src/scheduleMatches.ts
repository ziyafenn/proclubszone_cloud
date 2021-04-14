import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { ClubInt, Match, ClubStanding } from "./utils/interface";
// @ts-ignore
import { generateRandomFixtureFromAllPermutations } from "./utils/fixture-generator/fixtureGenerator.js";
// const util = require("util");

type ClubProps = {
  [clubId: string]: ClubInt;
};

type DataProps = {
  leagueId: string;
  matchNum: number;
};

export const scheduleMatches = functions.https.onCall(
  async (data: DataProps, context) => {
    const firestore = admin.firestore();
    const batch = firestore.batch();
    const leagueId: string = data.leagueId;
    const matchesAgainst = data.matchNum;
    const acceptedClubsIds: string[] = [];
    const acceptedClubs: ClubProps[] = [];
    const leagueRef = firestore.collection("leagues").doc(leagueId);

    const getTeams = async () => {
      const query = leagueRef.collection("clubs").where("accepted", "==", true);
      await query.get().then((querySnapshot) => {
        querySnapshot.forEach((documentSnapshot) => {
          const clubId = documentSnapshot.id;
          const clubData = documentSnapshot.data() as ClubInt;
          const club: ClubProps = {
            [clubId]: clubData,
          };
          acceptedClubs.push(club);
          acceptedClubsIds.push(clubId);
        });
      });
    };

    const createMatches = () => {
      let matchId = 1;

      const rounds = generateRandomFixtureFromAllPermutations(
        acceptedClubsIds,
        matchesAgainst
      );
      rounds.forEach((round) => {
        round.forEach((matchday) => {
          matchday.value.forEach(
            (teams: { homeTeamId: string; awayTeamId: string }) => {
              const match: Match = {
                homeTeamId: teams.homeTeamId,
                awayTeamId: teams.awayTeamId,
                id: matchId,
                teams: [teams.homeTeamId, teams.awayTeamId],
                published: false,
                conflict: false,
                motmConflict: false,
              };

              const matchRef = leagueRef.collection("matches").doc();
              batch.set(matchRef, match);

              matchId++;
            }
          );
        });
      });
    };

    const createStandings = () => {
      const standingsRef = leagueRef.collection("stats").doc("standings");

      acceptedClubs.forEach((club) => {
        const clubId = Object.keys(club)[0];
        const clubStanding: ClubStanding = {
          [clubId]: {
            name: club[clubId].name,
            played: 0,
            won: 0,
            lost: 0,
            draw: 0,
            points: 0,
            scored: 0,
            conceded: 0,
          },
        };
        functions.logger.info(clubId);
        functions.logger.info(club);
        batch.set(standingsRef, clubStanding, { merge: true });
      });
    };

    try {
      await getTeams();
      createMatches();
      createStandings();

      batch.update(leagueRef, {
        scheduled: true,
      });

      const playerStatsRef = leagueRef.collection("stats").doc("players");
      batch.create(playerStatsRef, {});

      return await batch.commit();
    } catch (error) {
      throw new Error(error);
    }
  }
);

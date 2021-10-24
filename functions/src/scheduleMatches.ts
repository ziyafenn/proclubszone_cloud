import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { ClubInt, Match, ClubStanding } from "./utils/interface";
// @ts-ignore
import generator from "tournament-generator";

type ClubProps = {
  [clubId: string]: ClubInt;
};

type DataProps = {
  leagueId: string;
  matchNum: number;
  acceptedClubs: number;
  teamNum: number;
};

export const scheduleMatches = functions.https.onCall(
  async (data: DataProps, context) => {
    const firestore = admin.firestore();
    let batch = firestore.batch();
    const leagueId: string = data.leagueId;
    const acceptedClubsIds: string[] = [];
    const acceptedClubs: ClubProps[] = [];
    const leagueRef = firestore.collection("leagues").doc(leagueId);

    const createBotTeam = (index: string) => {
      const userRef = firestore.collection("users").doc(`bot${index}`);
      const clubRef = leagueRef.collection("clubs").doc();
      const botClub: ClubInt = {
        name: `PRZ Bot ${index}`,
        accepted: true,
        created: admin.firestore.Timestamp.now(),
        managerId: userRef.id,
        leagueId: leagueId,
        managerUsername: `PRZ Bot ${index}`,
        roster: {
          [userRef.id]: {
            accepted: true,
            username: `PRZ Bot ${index}`,
          },
        },
      };

      const botManager = {
        premium: false,
        username: `PRZ Bot ${index}`,
        leagues: {
          [leagueId]: {
            accepted: true,
            clubId: clubRef.id,
            clubName: `PRZ Bot ${index}`,
            manager: true,
          },
        },
      };

      batch.set(userRef, botManager, { merge: true });
      batch.set(clubRef, botClub);
      batch.set(
        leagueRef,
        {
          acceptedClubs: admin.firestore.FieldValue.increment(1),
          clubIndex: {
            [clubRef.id]: `PRZ Bot ${index}`,
          },
        },
        { merge: true }
      );
    };

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
      const rounds = data.matchNum === 1 ? "single-round" : "double-round";
      let matchId = 1;
      const { data: games } = generator(acceptedClubsIds, {
        type: rounds,
      });

      games.forEach((game: { homeTeam: string; awayTeam: string }) => {
        const match: Match = {
          homeTeamId: game.homeTeam,
          awayTeamId: game.awayTeam,
          id: matchId,
          teams: [game.homeTeam, game.awayTeam],
          published: false,
          conflict: false,
          motmConflict: false,
          submissionCount: 0,
        };

        const matchRef = leagueRef.collection("matches").doc();
        batch.set(matchRef, match);

        matchId++;
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
      if (data.acceptedClubs < data.teamNum) {
        const missingClubs = data.teamNum - data.acceptedClubs;
        for (let i = 0; i < missingClubs; i++) {
          createBotTeam((i + 1).toString());
        }

        await batch.commit();
        batch = firestore.batch();
      }
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

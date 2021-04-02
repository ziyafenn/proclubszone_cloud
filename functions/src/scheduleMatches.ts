import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { ClubInt, ClubStanding, Match } from "./utils/interface";

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
      const teams: number = acceptedClubsIds.length;
      const matchesPerTeam = teams * matchesAgainst - matchesAgainst;
      const totalMatches = (matchesPerTeam * teams) / 2;
      const ids: number[] = Array.from(
        { length: totalMatches },
        (_, i) => i + 1
      );

      const matchIdGen = () => {
        const randomIndex = Math.floor(Math.random() * Math.floor(ids.length));
        const pickedId: number[] = ids.splice(randomIndex, 1);

        return pickedId[0];
      };

      for (let round = 0; round < matchesAgainst; round++) {
        for (
          let firstTeamIndex = 0;
          firstTeamIndex < teams - 1;
          firstTeamIndex++
        ) {
          for (
            let secondTeamIndex = firstTeamIndex + 1;
            secondTeamIndex < teams;
            secondTeamIndex++
          ) {
            const firstTeamHome =
              round % 2 === 0 ? firstTeamIndex : secondTeamIndex;
            const firstTeamAway =
              round % 2 === 0 ? secondTeamIndex : firstTeamIndex;

            const match: Match = {
              homeTeamId: acceptedClubsIds[firstTeamHome],
              awayTeamId: acceptedClubsIds[firstTeamAway],
              id: matchIdGen(),
              teams: [
                acceptedClubsIds[firstTeamIndex],
                acceptedClubsIds[secondTeamIndex],
              ],
              published: false,
              conflict: false,
              motmConflict: false,
            };

            console.log("match", match);

            const matchRef = leagueRef.collection("matches").doc();
            batch.set(matchRef, match);
          }
        }
      }
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

    return getTeams()
      .then(() => createMatches())
      .then(() => createStandings())
      .then(() => {
        batch.update(leagueRef, {
          scheduled: true,
        });
        const playerStatsRef = leagueRef.collection("stats").doc("players");
        batch.create(playerStatsRef, {});
      })
      .then(
        async () =>
          await batch.commit().catch((err) => {
            console.log("something went wrong during batch commit:", err);
          })
      );
  }
);

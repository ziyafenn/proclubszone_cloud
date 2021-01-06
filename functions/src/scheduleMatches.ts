import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { ClubInt, ClubStanding, Match } from "./utils/interface";

type ClubType = {
  [clubId: string]: ClubInt;
};

export const scheduleMatches = functions.https.onCall(async (data, context) => {
  const firestore = admin.firestore();
  const batch = firestore.batch();
  const leagueId = data.leagueId;
  const matchesAgainst = 1;
  const acceptedClubsIds: string[] = [];
  const acceptedClubs: ClubType[] = [];
  const leagueRef = firestore.collection("leagues").doc(leagueId);

  const getTeams = async () => {
    const query = leagueRef.collection("clubs").where("accepted", "==", true);
    await query.get().then((querySnapshot) => {
      querySnapshot.forEach((documentSnapshot) => {
        const clubId = documentSnapshot.id;
        const clubData = documentSnapshot.data() as ClubInt;
        const club: ClubType = {
          [clubId]: clubData,
        };
        acceptedClubs.push(club);
        acceptedClubsIds.push(clubId);
      });
    });
  };

  const createMatches = () => {
    const teams: number = acceptedClubsIds.length;
    const ids: number[] = Array.from({ length: teams * 3 }, (_, i) => i + 1);

    const matchIdGen = () => {
      const randomIndex = Math.floor(Math.random() * Math.floor(ids.length));
      const pickedId: number[] = ids.splice(randomIndex, 1);

      return pickedId[0];
    };

    for (let r = 0; r < matchesAgainst; r++) {
      for (let ht = 0; ht < teams; ht++) {
        for (let at = 0; at < teams; at++) {
          if (at !== ht) {
            const match: Match = {
              homeTeamId: acceptedClubsIds[ht],
              awayTeamId: acceptedClubsIds[at],
              id: matchIdGen(),
              teams: [acceptedClubsIds[ht], acceptedClubsIds[at]],
              published: false,
              conflict: false,
            };
            const matchRef = leagueRef.collection("matches").doc();

            batch.set(matchRef, match);
          }
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
    })
    .then(
      async () =>
        await batch.commit().catch((err) => {
          console.log("something went wrong during batch commit:", err);
        })
    );
});

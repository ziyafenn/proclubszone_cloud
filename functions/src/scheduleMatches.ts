import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { ClubInt, ClubStanding } from "./utils/interface";

type ClubType = {
  [clubId: string]: ClubInt;
};

export const scheduleMatches = functions.https.onCall((data, context) => {
  const firestore = admin.firestore();
  const batch = firestore.batch();
  const leagueId = "italy";
  const matchesAgainst = 1;
  const acceptedClubsIds: string[] = [];
  const acceptedClubs: ClubType[] = [];

  interface Match {
    home: string;
    away: string;
    date?: string;
    id: number;
    teams: [string, string];
  }

  const getTeams = async () => {
    const query = firestore
      .collection("leagues")
      .doc(leagueId)
      .collection("clubs")
      .where("accepted", "==", true);
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
      const randomIndex = Math.floor(
        Math.random() * Math.floor(ids.length - 1)
      );
      const pickedId: number[] = ids.splice(randomIndex, 1);

      return pickedId[0];
    };

    for (let r = 0; r < matchesAgainst; r++) {
      for (let ht = 0; ht < teams; ht++) {
        for (let at = 0; at < teams; at++) {
          if (at !== ht) {
            const match: Match = {
              home: acceptedClubsIds[ht],
              away: acceptedClubsIds[at],
              id: matchIdGen(),
              teams: [acceptedClubsIds[ht], acceptedClubsIds[at]],
            };
            const matchRef = firestore
              .collection("leagues")
              .doc(leagueId)
              .collection("matches")
              .doc();

            batch.set(matchRef, match);
          }
        }
      }
    }
  };

  const createStandings = () => {
    const standingsRef = firestore
      .collection("leagues")
      .doc(leagueId)
      .collection("stats")
      .doc("standings");

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
    .then(
      async () =>
        await batch.commit().catch((err) => {
          console.log("something went wrong during batch commit:", err);
        })
    );
});

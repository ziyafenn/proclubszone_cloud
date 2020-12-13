import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const scheduleMatches = functions.https.onCall((data, context) => {
  const firestore = admin.firestore();

  const leagueId = "italy";
  const matchesAgainst = 1;
  const acceptedClubs: string[] = [];

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
        acceptedClubs.push(clubId);
        console.log(acceptedClubs.length, acceptedClubs);
      });
    });
  };

  const createMatches = async () => {
    const batch = firestore.batch();

    const teams: number = acceptedClubs.length;
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
              home: acceptedClubs[ht],
              away: acceptedClubs[at],
              id: matchIdGen(),
              teams: [acceptedClubs[ht], acceptedClubs[at]],
            };
            const docRef = firestore
              .collection("leagues")
              .doc(leagueId)
              .collection("matches")
              .doc();

            batch.set(docRef, match);
          }
        }
      }
    }
    await batch.commit().catch((err) => {
      console.log("something went wrong during batch commit:", err);
    });
  };

  return getTeams()
    .then(() => createMatches())
    .then(
      () => {
        return "Matches are scheduled and leagues can start!";
      },
      (err) => {
        console.log("function failed", err);
      }
    );
});

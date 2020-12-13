import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

var serviceAccount = require("../keys/pro-clubs-zone-v2-firebase-adminsdk-jnm79-b0e14206de.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pro-clubs-zone-v2.firebaseio.com",
});

const firestore = admin.firestore();

exports.scheduleMatches = functions.https.onCall((data, context) => {
  const leagueId = "14M4HeJnNnwPbqJ0BvsU";
  const matchDays = 1;
  let acceptedClubs: string[] = [];

  interface Match {
    home: string;
    away: string;
    date?: string;
    id: number;
    teams: [string, string];
  }

  const getTeams = async () => {
    let query = firestore
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

  const createMatches = () => {
    const batch = firestore.batch();

    const cNum: number = acceptedClubs.length;
    let ids: number[] = Array.from({ length: cNum * 3 }, (_, i) => i + 1);

    console.log(ids);

    const matchIdGen = () => {
      const randomIndex = Math.floor(
        Math.random() * Math.floor(ids.length - 1)
      );
      let pickedId: number[] = ids.splice(randomIndex, 1);

      return pickedId[0];
    };

    for (let r = 0; r < matchDays; r++) {
      for (let ht = 0; ht < cNum; ht++) {
        for (let at = 0; at < cNum; at++) {
          if (at != ht) {
            let match: Match = {
              home: acceptedClubs[ht],
              away: acceptedClubs[at],
              id: matchIdGen(),
              teams: [acceptedClubs[ht], acceptedClubs[at]],
            };
            let docRef = firestore
              .collection("leagues")
              .doc(leagueId)
              .collection("matches2")
              .doc();

            batch.set(docRef, match);
          }
        }
      }
    }

    batch.commit().then((res) => {
      console.log("Successfully executed batch.");
    });
  };

  getTeams().then(() => createMatches());

  return "Matches are scheduled and leagues can start!";
});

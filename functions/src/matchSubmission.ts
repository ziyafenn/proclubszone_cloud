import * as functions from "firebase-functions";

const logger = functions.logger;

type Match = {
  away: string;
  conflict: boolean;
  published: boolean;
  home: string;
  teams: [string, string];
  id: number;
  submission: {
    [id: string]: {
      homeScore: string;
      awayScore: string;
    };
  };
};

export const matchSubmission = functions.firestore
  .document("leagues/{leagueId}/matches6/{matchId}")
  .onUpdate((change) => {
    const docRef = change.after.ref;
    const match: Match = change.after.data() as Match;
    const submissions = match.submission;
    const submissionCount = Object.keys(submissions).length;

    if (submissionCount === 1) {
      return logger.log("first submission");
    } else {
      const home = submissions[match.home];
      const away = submissions[match.away];
      const batch = change.after.ref.firestore.batch();

      const submissionCorrect = JSON.stringify(home) === JSON.stringify(away);
      if (submissionCorrect) {
        batch.update(docRef, {
          published: true,
        });
      } else {
        batch.update(docRef, {
          conflict: true,
        });
      }
      return batch.commit().catch((err) => {
        logger.error(err);
      });
    }
  });

import * as functions from "firebase-functions";
const firestore = require("@google-cloud/firestore");
const client = new firestore.v1.FirestoreAdminClient();

// Schedule the automated backup
export const backupFirestore = functions.pubsub
  .schedule("every 168 hours")
  .onRun(() => {
    const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
    const databaseName = client.databasePath(projectId, "(default)");
    return client
      .exportDocuments({
        name: databaseName,
        // Add your bucket name here
        outputUriPrefix: "gs://prz-backups",
        // Empty array == all collections
        collectionIds: [],
      })
      .then((responses: any) => {
        const response = responses[0];
        console.log(`Operation Name: ${response["name"]}`);
      })
      .catch((err: any) => {
        console.error(err);
        throw new Error("Export operation failed");
      });
  });

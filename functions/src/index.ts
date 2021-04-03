import * as admin from "firebase-admin";
import * as schedule from "./scheduleMatches";
import * as match from "./matchSubmission";
import * as conflictedMatch from "./conflictResolution";
import * as deleteUserLeague from "./deleteLeague";
import * as removePlayerSubmission from "./removePlayerSubmission";

admin.initializeApp();

export const scheduleMatches = schedule.scheduleMatches;
export const matchSubmission = match.matchSubmission;
export const conflictResolution = conflictedMatch.conflictResolution;
export const deleteLeague = deleteUserLeague.deleteLeague;
export const removeSubmission = removePlayerSubmission.removePlayerSubmission;

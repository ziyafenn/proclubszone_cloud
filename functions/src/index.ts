require("dotenv").config();

import * as admin from "firebase-admin";
import * as schedule from "./scheduleMatches";
import * as match from "./matchSubmission";
import * as conflictedMatch from "./conflictResolution";
import * as deleteUserLeague from "./deleteLeague";
import * as removePlayerSubmission from "./removePlayerSubmission";
import * as sendAdminInvite from "./adminInvites/sendAdminInvite";
import * as acceptAdminInvite from "./adminInvites/acceptAdminInvite";
import * as undoMatch from "./undoMatch";
import * as backupFirestore from "./backup";
import * as notifyOnNewLeague from "./notifyOnNewLeague";

admin.initializeApp();

export const scheduleMatches = schedule.scheduleMatches;
export const matchSubmission = match.matchSubmission;
export const conflictResolution = conflictedMatch.conflictResolution;
export const deleteLeague = deleteUserLeague.deleteLeague;
export const removeSubmission = removePlayerSubmission.removePlayerSubmission;
export const inviteAdmin = sendAdminInvite.sendAdminInvite;
export const acceptAdmin = acceptAdminInvite.acceptAdminInvite;
export const undoPublishedMatch = undoMatch.undoMatch;
export const backup = backupFirestore.backupFirestore;
export const notify = notifyOnNewLeague.notifyOnNewLeague;

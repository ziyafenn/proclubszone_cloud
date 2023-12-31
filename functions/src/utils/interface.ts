export interface CommonPlayerStats {
  rating: any;
  assists: any;
  completedShortPasses: any;
  completedMediumPasses: any;
  completedLongPasses: any;
  failedShortPasses: any;
  failedMediumPasses: any;
  failedLongPasses: any;
  keyPasses: any;
  successfulCrosses: any;
  failedCrosses: any;
  interceptions: any;
  blocks: any;
  outOfPosition: any;
  possessionWon: any;
  possessionLost: any;
  clearances: any;
  headersWon: any;
  heardersLost: any;
}

export interface GoalkeeperStats extends CommonPlayerStats {
  goalsConceded: any;
  shotsCaught: any;
  shotsParried: any;
  crossesCaught: any;
  ballsStriped: any;
}

export interface OutfieldPlayerStats extends CommonPlayerStats {
  goals: any;
  shotsOnTarget: any;
  shotsOffTarget: any;
  keyDribbles: any;
  fouled: any;
  successfulDribbles: any;
  wonTackles: any;
  lostTackles: any;
  fouls: any;
  penaltiesConceded: any;
}

export interface ClubInt {
  leagueId: string;
  managerUsername: string;
  name: string;
  managerId: string;
  accepted: boolean;
  roster: {
    [uid: string]: ClubRosterMember;
  };
  created: any;
}

export interface ClubRosterMember {
  accepted: boolean;
  username: string;
}

export interface ClubStanding {
  [id: string]: {
    name: string;
    played: number;
    won: number;
    lost: number;
    draw: number;
    points: number;
    scored: number;
    conceded: number;
  };
}

export interface MatchData extends Match {
  matchId: string;
  leagueName: string;
  clubName: string;
  clubId: string;
  leagueId: string;
  manager: boolean;
  opponentName: string;
}

export interface MatchPlayerData {
  submitted: boolean;
  clubId: string;
  username: string;
  motm: boolean;
  club: string;
}

export interface Match {
  awayTeamId: string;
  homeTeamId: string;
  id: number;
  motmSubmissions?: {
    [team: string]: string;
  };
  submissions?: {
    [team: string]: Submission;
  };
  teams?: [string, string];
  published: boolean;
  conflict: boolean;
  motmConflict: boolean;
  result?: Submission;
  motm?: string;
  players?: { [id: string]: MatchPlayerData };
  submissionCount: number;
}

export interface Submission {
  [team: string]: number;
}

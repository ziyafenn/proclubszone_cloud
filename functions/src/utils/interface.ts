export interface ClubInt {
  name: string;
  managerId: string;
  accepted: boolean;
  roster: {
    [uid: string]: ClubRosterMember;
  };
  created: string;
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
  submissions: {
    [team: string]: Submission;
  };
}

export interface Match {
  awayTeamId: string;
  homeTeamId: string;
  id: number;
  submissions?: {
    [team: string]: {
      [team: string]: number;
    };
  };
  teams?: [string, string];
  published: boolean;
  conflict: boolean;
  result?: { [team: string]: number };
}

export interface Submission {
  [team: string]: number;
}

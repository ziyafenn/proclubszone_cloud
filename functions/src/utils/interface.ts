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

export interface MatchData {
  matchId: string;
  leagueName: string;
  clubName: string;
  home: string;
  away: string;
  clubId: string;
  leagueId: string;
  manager: boolean;
  opponentName: string;
  submissions: {
    [team: string]: Submission;
  };
}

export interface Submission {
  [team: string]: number;
}

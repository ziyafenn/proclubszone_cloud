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

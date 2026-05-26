export type VoteType = "upvote" | "downvote";

export type ViewMode = "map" | "feed";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Report extends Coordinates {
  id: string;
  timestamp: Date;
  expiryTimestamp: Date;
  createdBy: string;
  note?: string;
  upvotes: number;
  downvotes: number;
  areaKey?: string;
}

export interface CreateReportInput extends Coordinates {
  note?: string;
}

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

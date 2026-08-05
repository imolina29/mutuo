import type {
  DeclarationStatus,
  ClauseType,
  PostMeetingStatus,
  NotificationType,
} from "@prisma/client";

export type {
  DeclarationStatus,
  ClauseType,
  PostMeetingStatus,
  NotificationType,
};

export interface DeclarationWithRelations {
  id: string;
  creatorId: string;
  invitedId: string | null;
  status: DeclarationStatus;
  inviteToken: string;
  inviteTokenExpiresAt: Date | null;
  meetingDate: Date | null;
  meetingPlace: string | null;
  meetingType: string | null;
  currentRound: number;
  maxRounds: number;
  signedByAAt: Date | null;
  signedByBAt: Date | null;
  sealedHash: string | null;
  sealedAt: Date | null;
  createdAt: Date;
  creator: { id: string; fullName: string; email: string };
  invited: { id: string; fullName: string; email: string } | null;
  clauses: ClauseData[];
}

export interface ClauseData {
  id: string;
  type: ClauseType;
  text: string;
  acceptedByA: boolean;
  acceptedByB: boolean;
  version: number;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      fullName: string;
      verified: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    fullName: string;
    verified: boolean;
  }
}

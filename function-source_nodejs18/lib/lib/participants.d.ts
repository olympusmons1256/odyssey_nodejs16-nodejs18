import { ParticipantUsage } from "./docTypes";
export declare function calculateParticipantUsage(organizationId: string, roomId: string, isFinal: boolean, eventTimestamp: Date, participantDoc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>): Promise<{
    organizationId: string;
    roomId: string;
    participantDoc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>;
    participantUsage: ParticipantUsage;
} | undefined>;

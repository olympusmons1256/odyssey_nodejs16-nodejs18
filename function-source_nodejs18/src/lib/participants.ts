import {Participant, ParticipantUsage} from "./docTypes";
import * as admin from "firebase-admin";
import {getParticipantUsageCollectionRef} from "./documents/firestore";

export async function calculateParticipantUsage(organizationId: string, roomId: string, isFinal: boolean, eventTimestamp: Date, participantDoc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) {
  try {
    const p = participantDoc.data() as Participant;
    const lastParticipantUsageDoc = (await getParticipantUsageCollectionRef(organizationId, roomId, participantDoc.id).orderBy("end", "desc").limit(1).get()).docs.pop();
    if (lastParticipantUsageDoc != undefined) console.debug(`Got latest participantUsage doc for participant: ${participantDoc.ref.path}`);
    const lastReachedPodReadyAt = (p.stateChanges == undefined) ? undefined : [...p.stateChanges]
      .sort((scA, scB) => scB.timestamp.toMillis() - scA.timestamp.toMillis()) // descending order by timestamp
      .find((sc) => sc.state == "ready-deployment")?.timestamp;
    if (lastReachedPodReadyAt == undefined || lastReachedPodReadyAt.toMillis() < p.created.toMillis()) {
      if (isFinal) {
        console.debug(`Participant never reached ready-deployment state after it was created, no usage recorded: ${participantDoc.ref.path} at ${eventTimestamp}`);
      } else {
        console.debug(`Skipping usage check as participant has not reached ready-deployment state since it was created: ${participantDoc.ref.path} at ${eventTimestamp}`);
      }
      return undefined;
    }
    const lastParticipantUsageDocEndedAt = lastParticipantUsageDoc == undefined ? undefined : (lastParticipantUsageDoc.data() as ParticipantUsage).end;
    const start = (lastParticipantUsageDocEndedAt == undefined || lastParticipantUsageDocEndedAt.toMillis() < lastReachedPodReadyAt.toMillis()) ? lastReachedPodReadyAt : lastParticipantUsageDocEndedAt;
    const startMillis = start.toMillis();
    const eventTimestampMillis = eventTimestamp.valueOf();
    console.debug(`Recording usage check on participant: ${participantDoc.ref.path} since ${start}, at ${eventTimestamp}`);
    const durationMillis = eventTimestampMillis - startMillis;
    const creditsPerHour = 1.0;
    const durationSeconds = durationMillis / 1000;
    const totalDurationMillis = eventTimestampMillis - lastReachedPodReadyAt.toMillis();
    const totalDurationSeconds = totalDurationMillis / 1000;
    const totalCreditsUsed = (totalDurationSeconds / 3600) * creditsPerHour;
    const creditsUsed = (durationSeconds / 3600) * creditsPerHour;
    const participantUsage : ParticipantUsage = {
      start,
      end: admin.firestore.Timestamp.fromDate(eventTimestamp),
      isFinal,
      creditsUsed,
      creditsPerHour,
      totalDurationSeconds: (isFinal == true) ? totalDurationSeconds : undefined,
      totalCreditsUsed: (isFinal == true) ? totalCreditsUsed : undefined,
      durationSeconds,
    };
    return {organizationId, roomId, participantDoc, participantUsage};
  } catch (e: any) {
    console.error(e);
    console.error(`Failed to calculate usage for participant ${participantDoc.id}`);
    return undefined;
  }
}

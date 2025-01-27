import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});
import {BrowserStateUpdateWebRtc, Device, Participant} from "../lib/docTypes";
import {getDeviceRef, getParticipantBrowserStateUpdateWebRtcRef, getParticipantsRef} from "../lib/documents/firestore";
import {sleepForever} from "../lib/misc";

async function f() {
  const createdDocs : string[] = [];
  const participants = getParticipantsRef("WASawul3Mkg61Ia0schw", "2DSPxPFcB3dXBvt297DDTr");
  participants.onSnapshot((participants) => {
    participants.docs.map((participantDoc) => {
      const roomDoc = participantDoc.ref.parent.parent;
      if (roomDoc == undefined || roomDoc == null) throw new Error("Room invalid");
      const organizationDoc = roomDoc?.parent.parent;
      if (organizationDoc == undefined || organizationDoc == null) throw new Error("Organization invalid");
      const isNew = !createdDocs.includes(participantDoc.id);
      const participant = participantDoc.data() as Participant;
      console.log(JSON.stringify(
        {...participant,
          id: participantDoc.id,
          isNew,
          deleted: !participantDoc.exists,
          timestamp: participantDoc.updateTime.toDate() ?? new Date(),
        }
      ));
      if (isNew) {
        getDeviceRef(participant.userId, participant.deviceId).onSnapshot((deviceDoc) => {
          const device = deviceDoc.data() as Device;
          console.log(JSON.stringify(
            {
              ...device,
              deleted: !deviceDoc.exists,
              timestamp: deviceDoc.updateTime?.toDate() ?? new Date(),
            }
          ));
        });
        getParticipantBrowserStateUpdateWebRtcRef(organizationDoc.id, roomDoc.id, participantDoc.id).onSnapshot((webRtcDoc) => {
          const webRtc = webRtcDoc.data() as BrowserStateUpdateWebRtc;
          console.log(JSON.stringify(
            {
              ...webRtc,
              updated: webRtc.updated.toDate(),
              participantId: webRtcDoc.ref.parent.parent?.id,
              deleted: !webRtcDoc.exists,
              timestamp: webRtcDoc.updateTime?.toDate() ?? new Date(),
            }
          ));
        });
        createdDocs.push(participantDoc.id);
      }
    });
  });
  await sleepForever();
}

f();

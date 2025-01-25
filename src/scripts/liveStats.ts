import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {Participant} from "../lib/docTypes";
import {getOrganizationsRef, getParticipants, getRoomsRef, getUser} from "../lib/documents/firestore";
import * as fs from "fs";

type ParticipantWithDocRoomAndOrgIds = [string, string, string, Participant];

async function getDeploymentTimes(participantsWithDocIds: ParticipantWithDocRoomAndOrgIds[]) {
  return participantsWithDocIds.map(async (participantWithDocId) => {
    const [docId,,, participant] = participantWithDocId;
    const [docUserId, docDeviceId] = docId.split(":");
    if (participant == undefined) {
      return 0;
    } else {
      if (participant.state == "ready-deployment") {
        const createdAt = Math.floor(participant.created.toDate().getTime()/1000);
        const updatedAt = Math.floor(participant.updated.toDate().getTime()/1000);
        const differenceSeconds = updatedAt - createdAt;
        if (differenceSeconds > 45) {
          console.log(`Slow deployment: ${docUserId}:${docDeviceId}`);
        }
        return differenceSeconds;
      } else {
        return 0;
      }
    }
  });
}

interface DeviceStatus {
  state: "online" | "offline"
  lastChanged: admin.firestore.Timestamp
}

type DeviceStatusWithDocIdAndRoomId = [DeviceStatus, string, string];

async function getOnlineDevices() {
  const deviceDocs = (await admin.firestore().collectionGroup("devices").get()).docs;
  const upToDateDeviceDocs = deviceDocs.flatMap((doc) => {
    const deviceStatus = doc.data() as DeviceStatus;
    const lastChanged = deviceStatus.lastChanged.toDate().getTime()/1000;
    // const oneDayAgo = Math.floor(new.toDate().getTime()/1000);
    // const eightHoursAgo = new Date(Date.now() - ((60 * 60 * 8) * 1000)).getTime()/1000;
    const thirtyMinutesAgo = new Date(Date.now() - ((60 * 30) * 1000)).getTime()/1000;
    return (deviceStatus.state == "online" && lastChanged > thirtyMinutesAgo) ? [doc] : [];
  });

  upToDateDeviceDocs.map(async (doc) => {
    const deviceStatus = doc.data() as DeviceStatus;
    return [deviceStatus, doc.id, doc.ref.parent.id] as DeviceStatusWithDocIdAndRoomId;
  });
  return upToDateDeviceDocs;
}

interface ParticipantWithUserDetails {
  created: FirebaseFirestore.Timestamp
  updated: FirebaseFirestore.Timestamp
  name?: string
  userId: string
  roomId: string
  organizationId: string
  deviceId: string
  state?: string
  email: string
}
interface UniqueParticipantWithUserDetails {
  firstOnline: FirebaseFirestore.Timestamp
  totalSeconds: number
  numberOfParticipants: number
  roomIds: string[]
  organizationId: string
  averageParticipantLengthSeconds: number
  name?: string
  email: string
}

async function getParticipantDetails(participantsWithDocIds: ParticipantWithDocRoomAndOrgIds[]) {
  return (await Promise.all(participantsWithDocIds.flatMap(async (participantWithDocId) => {
    const [docId, roomId, organizationId, participant] = participantWithDocId;
    if (participant == undefined) {
      // console.log("ERROR: Participant is undefined");
      return [];
    }
    const [docUserId] = docId.split(":");
    const [, user] = await getUser(docUserId);
    if (user == undefined) {
      return [];
    }
    const participantWithUserDetails: ParticipantWithUserDetails = {
      roomId,
      organizationId,
      state: participant.state,
      updated: participant.updated,
      created: participant.created,
      deviceId: participant.deviceId,
      userId: participant.userId,
      name: user.name,
      email: user.email,
    };
    return [participantWithUserDetails];
  }))).flat();
}

type UniqueUserParticipation = {
  [key: string]: UniqueParticipantWithUserDetails
}

function getUniqueParticipants(participantsWithUserDetails: ParticipantWithUserDetails[]) {
  return participantsWithUserDetails.reduce<UniqueUserParticipation>((acc, participantWithUserDetails) => {
    const existingEntry = acc[participantWithUserDetails.userId];
    if (existingEntry == undefined) {
      const getTotalSeconds = () => {
        return Date.now() - participantWithUserDetails.created.seconds;
      };
      acc[participantWithUserDetails.userId] = {
        organizationId: participantWithUserDetails.organizationId,
        email: participantWithUserDetails.email,
        name: participantWithUserDetails.name,
        numberOfParticipants: 1,
        roomIds: [participantWithUserDetails.roomId],
        firstOnline: participantWithUserDetails.created,
        totalSeconds: getTotalSeconds(),
        averageParticipantLengthSeconds: getTotalSeconds(),
      };
      return acc;
    } else {
      const numberOfParticipants = existingEntry.numberOfParticipants + 1;
      const getTotalSeconds = () => {
        return existingEntry.totalSeconds + (Date.now() - participantWithUserDetails.created.seconds);
      };
      acc[participantWithUserDetails.userId] = {
        organizationId: participantWithUserDetails.organizationId,
        email: participantWithUserDetails.email,
        name: participantWithUserDetails.name,
        numberOfParticipants: existingEntry.numberOfParticipants + 1,
        firstOnline: (existingEntry.firstOnline.seconds < participantWithUserDetails.created.seconds) ? existingEntry.firstOnline : participantWithUserDetails.created,
        roomIds: [...new Set([...existingEntry.roomIds, participantWithUserDetails.roomId])],
        totalSeconds: getTotalSeconds(),
        averageParticipantLengthSeconds: getTotalSeconds() / numberOfParticipants,
      };
      return acc;
    }
  }, {});
}

type MapStringNumber = {
  [key: string]: number
}

type OrganizationRoomParticipantSummary = {
  [key: string]: MapStringNumber
}

function getOrganizationRoomUserCount(uniqueUserParticipation: UniqueUserParticipation) {
  return Object.values(uniqueUserParticipation).reduce<OrganizationRoomParticipantSummary>((acc, v) => {
    v.roomIds.forEach((roomId) => {
      if (acc[v.organizationId] == undefined) acc[v.organizationId] = {};
      (acc[v.organizationId][roomId] == undefined) ? acc[v.organizationId][roomId] = 1 : acc[v.organizationId][roomId] = acc[v.organizationId][roomId] + 1;
    });
    return acc;
  }, {});
}

function getOrganizationRoomParticipantCount(participants: ParticipantWithUserDetails[]) {
  return participants.reduce<OrganizationRoomParticipantSummary>((acc, v) => {
    if (acc[v.organizationId] == undefined) acc[v.organizationId] = {};
    (acc[v.organizationId][v.roomId] == undefined) ? acc[v.organizationId][v.roomId] = 1 : acc[v.organizationId][v.roomId] = acc[v.organizationId][v.roomId] + 1;
    return acc;
  }, {});
}

type RoomIdWithOrganizationId = [string, string]

async function getAllCurrentParticipants() {
  const organizations = (await getOrganizationsRef().listDocuments()).map((doc) => doc.id);
  const roomIds = (await Promise.all(organizations.map(async (organizationId) => (await getRoomsRef(organizationId).get()).docs.map((doc) => [organizationId, doc.id] as RoomIdWithOrganizationId)))).flat();
  console.log(roomIds);
  return (await Promise.all(roomIds.map(async ([organizationId, roomId]) => {
    const participants = await getParticipants(organizationId, roomId);
    if (participants == undefined) {
      return [];
    } else {
      console.log(`${roomId} had ${participants.length} participants`);
      return participants.flatMap(([pD, p]) => {
        if (pD == undefined || p == undefined) {
          return [];
        } else {
          const roomRef = pD.ref.parent.parent;
          const organizationRef = roomRef?.parent.parent;
          return [[pD.id, roomRef?.id, organizationRef?.id, p] as ParticipantWithDocRoomAndOrgIds];
        }
      });
    }
  }))).flat();
}


type OrganizationRoomUserParticipantCount = {
  total: number,
  participants: {
    [key: string]: {
      [key: string]: MapStringNumber
    }
  }
}


function getParticipantsOver4HoursOld(currentParticipantUserDetails:ParticipantWithUserDetails[]) {
  return currentParticipantUserDetails.flatMap((participant) =>
    (participant.created.seconds < (Date.parse((new Date).toUTCString()) / 1000) - (60 * 60 * 4)) ? [participant] : [])
    .reduce<OrganizationRoomUserParticipantCount>((acc, v) => {
    acc.total = acc.total + 1;
    if (acc.participants[v.organizationId] == undefined) acc.participants[v.organizationId] = {};
    if (acc.participants[v.organizationId][v.roomId] == undefined) acc.participants[v.organizationId][v.roomId] = {};
    (acc.participants[v.organizationId][v.roomId][v.userId] == undefined) ? acc.participants[v.organizationId][v.roomId][v.userId] = 1 : acc.participants[v.organizationId][v.roomId][v.userId] = acc.participants[v.organizationId][v.roomId][v.userId] + 1;
    return acc;
  }, {total: 0, participants: {}});
}

function getMedianDeploymentTime(times: number[]) {
  const mid = Math.floor(times.length / 2);
  const sorted = [...times].sort((a, b) => a - b);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function f() {
  const currentParticipants = await getAllCurrentParticipants();
  const deploymentTimesBase = await Promise.all(await getDeploymentTimes(currentParticipants));
  const currentParticipantUserDetails = await getParticipantDetails(currentParticipants);
  const uniqueCurrentParticipants = getUniqueParticipants(currentParticipantUserDetails);
  const organizationRoomParticipantCount = getOrganizationRoomParticipantCount(currentParticipantUserDetails);
  const organizationRoomUserCount = getOrganizationRoomUserCount(uniqueCurrentParticipants);
  //  Participants > 4 hours old
  const participantsOver4HoursOld = getParticipantsOver4HoursOld(currentParticipantUserDetails);
  const actualDeploymentTimes = deploymentTimesBase.filter((a) => a != 0);
  //  Mean client pod provisioning time
  const averageDeploymentTime = actualDeploymentTimes.length > 0 ? actualDeploymentTimes.reduce((a, b) => a + b) / actualDeploymentTimes.length : 0;
  //  Median client pod provisioning time
  const medianDeploymentTime = getMedianDeploymentTime(actualDeploymentTimes);
  const onlineUsers = await getOnlineDevices();
  //  Users with > 1 participant (including participant count)
  //  Number of participants not in "pod-ready" but > 2 minutes old
  //  Rooms in "deprovisioning" for > 2 minutes
  //  Rooms not in "pod-ready" state with participants
  console.log("Online browser tabs: ", onlineUsers.length);
  console.log("Total room participants: ", currentParticipants.length);
  // await getAllUsersWhoCameOnline(organizationId);
  const stats = {
    participantCount: currentParticipants.length,
    usersWithAtLeastOneParticipant: Object.values(uniqueCurrentParticipants).length,
    participantsDeployed: deploymentTimesBase.length,
    averageDeploymentTime,
    medianDeploymentTime,
    onlineDevices: onlineUsers.length,
    participantsOver4HoursOld,
    organizationRoomParticipantCount,
    organizationRoomUserCount,
  };
  const statsOutputFile = "livestats.json";
  await fs.promises.writeFile(statsOutputFile, JSON.stringify(stats, undefined, 2));
  console.log("Successfully wrote Odyssey live stats to: ", statsOutputFile);
}

f();

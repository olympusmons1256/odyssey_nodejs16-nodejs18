import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {HistoricParticipant, Organization, Room} from "../lib/docTypes";
import {getHistoricParticipants, getOrganizationRef, getOrganizations, getUser} from "../lib/documents/firestore";
import * as fs from "fs";
import {createArrayCsvWriter} from "csv-writer";
import {OrgSpace} from "../lib/cmsDocTypes";

type HistoricParticipantWithIds = {
  id: string,
  roomId: string,
  spaceId: string,
  historicParticipant: HistoricParticipant
};

interface HistoricParticipantWithUserDetails {
  created: FirebaseFirestore.Timestamp
  deleted?: FirebaseFirestore.Timestamp
  duration: number
  userId: string
  roomId: string
  deviceId: string
  spaceId: string,
  spaceName: string,
  name: string
  email: string
}

interface UniqueHistoricParticipantWithUserDetails {
  firstOnline: FirebaseFirestore.Timestamp
  lastOnline: FirebaseFirestore.Timestamp
  totalSeconds: number
  numberOfParticipants: number
  numberOfParticipantsPerRoom: number
  roomIds: string[]
  averageParticipantLengthSeconds: number
  name: string
  email: string
}

async function getHistoricParticipantDetails(participantsWithDocIds: HistoricParticipantWithIds[]) {
  // const spaceIds = dedupList(participantsWithDocIds.map((p) => p.spaceId));
  const spaceDocs = (await admin.firestore().collectionGroup("spaces").get()).docs;
  return (await Promise.all(participantsWithDocIds.flatMap(async (participantWithDocId) => {
    const {id, roomId, spaceId, historicParticipant} = participantWithDocId;
    if (historicParticipant == undefined) {
      // console.log("ERROR: Participant is undefined");
      return [];
    }
    const [docUserId] = id.split(":");
    const [, user] = await getUser(docUserId);
    const duration = () => {
      if (historicParticipant.deleted == undefined || historicParticipant.created == undefined) {
        return 0;
      } else {
        try {
          return Math.abs(historicParticipant.deleted.seconds - historicParticipant.created.seconds);
        } catch (e: any) {
          return 0;
        }
      }
    };
    const space = spaceDocs.find((d) => d.id == spaceId);
    const name = (user == undefined || user.name == undefined) ? "" : user.name;
    const email = (user == undefined || user.email == undefined) ? "" : user.email;
    const participantWithUserDetails : HistoricParticipantWithUserDetails = {
      created: historicParticipant.created,
      deleted: historicParticipant.deleted,
      duration: duration(),
      deviceId: historicParticipant.deviceId || "",
      userId: historicParticipant.userId || "",
      spaceId,
      spaceName: (space == undefined) ? "" : (space.data() as OrgSpace).name,
      roomId,
      name,
      email,
    };
    // logger.log("info", participantWithUserDetails);
    return [participantWithUserDetails];
  }))).flat();
}


type UniqueUserParticipation = {
  [key: string]: UniqueHistoricParticipantWithUserDetails
}

function getUniqueHistoricParticipants(historicParticipantsWithUserDetails: HistoricParticipantWithUserDetails[]) {
  return historicParticipantsWithUserDetails.reduce<UniqueUserParticipation>((acc, historicParticipantWithUserDetails) => {
    const existingEntry = acc[historicParticipantWithUserDetails.userId];
    if (existingEntry == undefined) {
      const getLastOnline = () => {
        if (historicParticipantWithUserDetails.deleted == undefined) {
          return historicParticipantWithUserDetails.created;
        } else {
          return historicParticipantWithUserDetails.deleted;
        }
      };
      acc[historicParticipantWithUserDetails.userId] = {
        numberOfParticipantsPerRoom: 1,
        email: historicParticipantWithUserDetails.email,
        name: historicParticipantWithUserDetails.name,
        numberOfParticipants: 1,
        roomIds: [historicParticipantWithUserDetails.roomId],
        firstOnline: historicParticipantWithUserDetails.created,
        lastOnline: getLastOnline(),
        totalSeconds: historicParticipantWithUserDetails.duration,
        averageParticipantLengthSeconds: historicParticipantWithUserDetails.duration,
      };
      return acc;
    } else {
      const getTotalSeconds = () => {
        if (historicParticipantWithUserDetails.deleted == undefined) {
          return existingEntry.totalSeconds;
        } else {
          return existingEntry.totalSeconds + historicParticipantWithUserDetails.duration;
        }
      };
      const getLastOnline = () => {
        if (historicParticipantWithUserDetails.deleted == undefined) {
          return existingEntry.lastOnline;
        } else {
          return (existingEntry.lastOnline.seconds > historicParticipantWithUserDetails.deleted.seconds) ? existingEntry.lastOnline : historicParticipantWithUserDetails.deleted;
        }
      };
      const numberOfParticipants = existingEntry.numberOfParticipants + 1;
      const roomIds = [...new Set([...existingEntry.roomIds, historicParticipantWithUserDetails.roomId])];
      acc[historicParticipantWithUserDetails.userId] = {
        numberOfParticipantsPerRoom: (existingEntry.numberOfParticipants + 1) / roomIds.length,
        email: historicParticipantWithUserDetails.email,
        name: historicParticipantWithUserDetails.name,
        numberOfParticipants: existingEntry.numberOfParticipants + 1,
        firstOnline: (existingEntry.firstOnline.seconds < historicParticipantWithUserDetails.created.seconds) ? existingEntry.firstOnline : historicParticipantWithUserDetails.created,
        roomIds,
        lastOnline: getLastOnline(),
        totalSeconds: getTotalSeconds(),
        averageParticipantLengthSeconds: getTotalSeconds() / numberOfParticipants,
      };
      return acc;
    }
  }, {});
}

type UniqueUsersPerRoomShard = {
  [key: string]: number
}

function getUniqueUsersPerRoomShard(uniqueUserParticipation: UniqueUserParticipation) {
  return Object.values<UniqueHistoricParticipantWithUserDetails>(uniqueUserParticipation).reduce<UniqueUsersPerRoomShard>((acc, v) => {
    v.roomIds.forEach((roomId) => {
      const roomIdFormatted = roomId.slice(0, 5).toUpperCase();
      const existingEntry = acc[roomIdFormatted];
      (existingEntry == undefined) ? acc[roomIdFormatted] = 1 : acc[roomIdFormatted] = acc[roomIdFormatted] + 1;
    });
    return acc;
  }, {});
}

async function getAllHistoricParticipants(organizationId: string, afterTimeUTC?: Date, beforeTimeUTC?: Date, spaceId?: string) {
  const query = (() => {
    const base = getOrganizationRef(organizationId).collection("historicRooms");
    if (spaceId != undefined) return base.where("spaceId", "==", spaceId);
    return base;
  })();
  const historicRooms = (await query.get()).docs.flatMap((doc) => {
    const spaceId = (doc.data() as Room).spaceId;
    if (spaceId == undefined) return [];
    return [{roomId: doc.id, spaceId}];
  });
  return (await Promise.all(historicRooms.map(async ({roomId, spaceId}) => {
    const participants = await getHistoricParticipants(organizationId, roomId);
    if (participants == undefined) {
      return [];
    } else {
      return participants.flatMap(([pD, p]) => {
        if (pD == undefined || p == undefined) {
          return [];
        } else {
          const record : HistoricParticipantWithIds[] = [{
            id: pD.id,
            roomId,
            spaceId,
            historicParticipant: p}];
          if (p.created == undefined || p.created.seconds == undefined) {
            return [];
          }
          if (afterTimeUTC == undefined && beforeTimeUTC == undefined) {
            return record;
          }
          try {
            const afterTimestamp = afterTimeUTC && admin.firestore.Timestamp.fromDate(afterTimeUTC);
            const beforeTimestamp = beforeTimeUTC && admin.firestore.Timestamp.fromDate(beforeTimeUTC);
            const afterSecondsCondition = (afterTimestamp == undefined) ? true : p.created.seconds > afterTimestamp.seconds;
            const beforeSecondsCondition = (beforeTimestamp == undefined) ? true : p.created.seconds < beforeTimestamp.seconds;
            if (afterSecondsCondition && beforeSecondsCondition) {
              return record;
            } else {
              return [];
            }
          } catch {
            // console.debug({p, record});
            return [];
          }
        }
      });
    }
  }))).flat();
}

type HistoricParticipantsByDay = {
  [key: string]: HistoricParticipantWithUserDetails[]
}

function getHistoricParticipantsByDay(historicParticipantsWithUserDetails: HistoricParticipantWithUserDetails[]) {
  return historicParticipantsWithUserDetails.reduce<HistoricParticipantsByDay>((acc, historicParticipantWithUserDetails) => {
    const createdDate = historicParticipantWithUserDetails.created.toDate();
    const day = `${createdDate.getUTCFullYear()}-${createdDate.getUTCMonth() + 1}-${createdDate.getUTCDate()}`;
    if (acc[day] == undefined) {
      acc[day] = [historicParticipantWithUserDetails];
    } else {
      acc[day] = [...acc[day], historicParticipantWithUserDetails];
    }
    return acc;
  }, {});
}

type UniqueHistoricParticipantsByDay = {
  [key: string]: UniqueUserParticipation
}

function getUniqueHistoricParticipantsByDay(historicParticipantsByDay: HistoricParticipantsByDay) {
  return Object.entries(historicParticipantsByDay).reduce<UniqueHistoricParticipantsByDay>((acc, [k, v]) => {
    acc[k] = getUniqueHistoricParticipants(v);
    return acc;
  }, {});
}

type DailyUniqueUsers = {
  [key: string]: number
}

function getDailyUniqueParticipants(uniqueHistoricParticipantsByDay: UniqueHistoricParticipantsByDay) {
  return Object.entries(uniqueHistoricParticipantsByDay).reduce<DailyUniqueUsers>((acc, [k, v]) => {
    acc[k] = Object.values(v).length;
    return acc;
  }, {});
}

type DailyParticipants = {
  [key: string]: number
}

function getDailyParticipants(historicParticipantsByDay: HistoricParticipantsByDay) {
  return Object.entries(historicParticipantsByDay).reduce<DailyParticipants>((acc, [k, v]) => {
    acc[k] = v.length;
    return acc;
  }, {});
}

async function getParticipantStreamingHours(uniqueUserParticipation: UniqueUserParticipation): Promise<number> {
  const totalSeconds = Object.values(uniqueUserParticipation).reduce<number>((acc, p) => acc += p.totalSeconds, 0);
  return totalSeconds / 60 / 60;
}

async function getAverageHoursAllUsers(uniqueUserParticipation: UniqueUserParticipation): Promise<number> {
  const total = Object.values<UniqueHistoricParticipantWithUserDetails>(uniqueUserParticipation).reduce<number>((acc, v) => acc + v.averageParticipantLengthSeconds, 0);
  return (total / Object.values<UniqueHistoricParticipantWithUserDetails>(uniqueUserParticipation).length) / 60 / 60;
}

/*
const adAgeSessions = [
  ["2023-05-09T11:00:00.000-04:00", "Join & Networking"],
  ["2023-05-09T12:00:00.000-04:00", "Welcome remarks"],
  ["2023-05-09T12:05:00.000-04:00", "Reconciling AI and the metaverse"],
  ["2023-05-09T12:35:00.000-04:00", "Why gaming is the first step to the metaverse"],
  ["2023-05-09T13:05:00.000-04:00", "From wild to mild: Taming the virtual world"],
  ["2023-05-09T13:30:00.000-04:00", "Day 1 Networking break"],
  ["2023-05-09T14:00:00.000-04:00", "Future proof of concept"],
  ["2023-05-09T14:30:00.000-04:00", "Foundations of a more just Web3"],
  ["2023-05-09T15:00:00.000-04:00", "How to build a brand in the metaverse"],
  ["2023-05-09T15:30:00.000-04:00", "Day 1 Programming ends/networking"],
  ["2023-05-09T17:00:00.000-04:00", "End of Day 1"],
  ["2023-05-10T11:00:00.000-04:00", "Day 2 Join & Networking"],
  ["2023-05-10T12:00:00.000-04:00", "Day 2 Welcome remarks"],
  ["2023-05-10T12:05:00.000-04:00", "Web3: How brands got here"],
  ["2023-05-10T12:15:00.000-04:00", "Workshop: How to create virtual storefronts"],
  ["2023-05-10T12:50:00.000-04:00", "Here's the answer to building brand loyalty in Web3"],
  ["2023-05-10T13:15:00.000-04:00", "Day 2 Networking break"],
  ["2023-05-10T14:00:00.000-04:00", "Web3’s wholesale transformation of retail"],
  ["2023-05-10T14:35:00.000-04:00", "Workshop: Hold onto your wallets"],
  ["2023-05-10T15:10:00.000-04:00", "The next phase of NFTs"],
  ["2023-05-10T15:35:00.000-04:00", "How to measure the metaverse"],
  ["2023-05-10T16:00:00.000-04:00", "Closing"],
  ["2023-05-10T16:05:00.000-04:00", "Day 2 Afternoon Networking"],
  ["2023-05-10T17:00:00.000-04:00", "End of Day 2"],
];

interface AdAgeSessionWithUserCount {
  sessionTime: string
  sessionName: string
  userCount: number
}

function getUniqueUsersPerAdAgeSession(historicParticipantDetails: HistoricParticipantWithUserDetails[]) : AdAgeSessionWithUserCount[] {
  return adAgeSessions.map<AdAgeSessionWithUserCount>(([sessionTime, sessionName], index) => {
    const sessionStartTime = new Date(sessionTime);
    const nextSessionTime = (() => {
      try {
        return new Date(adAgeSessions[index + 1][0]);
      } catch (e:any) {
        console.error(e);
        return undefined;
      }
    })();
    if (nextSessionTime == undefined) {
      return {
        sessionName,
        userCount: 0,
        sessionTime,
      };
    }
    const sessionStartTimeMillis = sessionStartTime.valueOf();
    const sessionEndTimeMillis = nextSessionTime.valueOf();
    const userEmails = historicParticipantDetails.flatMap((hpd) => {
      const createdAtMillis = hpd.created.toMillis();
      const deletedAtMillis = hpd.created.toMillis() + (hpd.duration * 1000);
      if (
        // Created during
        (createdAtMillis >= sessionStartTimeMillis && createdAtMillis < sessionEndTimeMillis) ||
        // Deleted during
        (deletedAtMillis >= sessionStartTimeMillis && deletedAtMillis < sessionEndTimeMillis) ||
        // Created before and deleted after
        (createdAtMillis <= sessionStartTimeMillis && deletedAtMillis >= sessionEndTimeMillis)
      ) {
        // console.debug(`Participant ${hpd.email} started at ${new Date(createdAtMillis)} and ended at ${new Date(deletedAtMillis)}. It appears it was in the session ${sessionName} between ${sessionTime} and ${nextSessionTime}?`);
        return [hpd.email];
      } else {
        return [];
      }
    });
    const uniqueUsers = new Set(userEmails);
    console.debug(`User list for ${sessionName} at ${sessionTime}: `, [...uniqueUsers].join(","));
    const userCount = uniqueUsers.size;
    return {
      sessionTime,
      userCount,
      sessionName,
    };
  });
}
*/


async function calculateUsage(organization: Organization, organizationId: string, startDate: Date, endDate: Date, name?: string, spaceId?: string) {
  console.debug("Calculating usage for organization: ", organizationId);
  const historicParticipants = await getAllHistoricParticipants(organizationId, startDate, endDate, spaceId);
  const participantCount = historicParticipants.length;
  const historicParticipantDetails = await getHistoricParticipantDetails(historicParticipants);
  const uniqueHistoricParticipants = getUniqueHistoricParticipants(historicParticipantDetails);
  const uniqueUsersPerRoomShard = getUniqueUsersPerRoomShard(uniqueHistoricParticipants);
  // const adAgeSessionParticipantCounts = getUniqueUsersPerAdAgeSession(historicParticipantDetails);
  const uniqueParticipantCount = Object.keys(uniqueHistoricParticipants).length;
  const historicParticipantsByDay = getHistoricParticipantsByDay(historicParticipantDetails);
  const dailyParticipants = getDailyParticipants(historicParticipantsByDay);
  const uniqueHistoricParticipantsByDay = getUniqueHistoricParticipantsByDay(historicParticipantsByDay);
  const dailyUniqueParticipants = getDailyUniqueParticipants(uniqueHistoricParticipantsByDay);
  const participantStreamingHours = await getParticipantStreamingHours(uniqueHistoricParticipants);
  const averageHoursAllUsers = await getAverageHoursAllUsers(uniqueHistoricParticipants);
  const usageSummary = {
    organization,
    organizationId,
    participantStreamingHours,
    averageHoursAllUsers,
    dailyUniqueParticipants,
    dailyParticipants,
    uniqueParticipantCount,
    participantCount,
    uniqueUsersPerRoomShard,
    // adAgeSessionParticipantCounts,
  };

  const isAnonymous = ((email: string) => {
    if (email.startsWith("guest") && email.endsWith("@newgameplus.live")) return true;
    if (email.endsWith("@anonymous.noreply.odyssey.stream")) return true;
    return false;
  });

  async function writeReportToCsv(path: string): Promise<void> {
    const entries = Object.entries(uniqueHistoricParticipants).map(([k, v]) => {
      return [
        k,
        (isAnonymous(v.email) ? "N/A (Anonymous)" : v.email),
        v.name,
        v.roomIds.map((id) => id.slice(0, 5).toUpperCase()).join("; "),
        v.firstOnline.toDate().toISOString(),
        v.lastOnline.toDate().toISOString(),
        v.numberOfParticipants.toString(),
        v.numberOfParticipantsPerRoom.toFixed(1).toString(),
        (v.totalSeconds / 60).toFixed(0),
      ];
    });
    const csvWriter = createArrayCsvWriter({
      header: ["UserId", "Email", "Name", "Rooms Joined", "First Online", "Last Online", "Number of Joins", "Number of Joins per Room", "Total Streaming Minutes"],
      path,
    });
    return await csvWriter.writeRecords(entries);
  }

  async function writeDetailsToCsv(path: string): Promise<void> {
    const entries = historicParticipantDetails.map((v) => {
      return [
        v.userId,
        (isAnonymous(v.email) ? "N/A (Anonymous)" : v.email),
        v.name,
        v.roomId,
        v.spaceId,
        v.spaceName,
        v.created.toDate().toISOString(),
        v.deleted?.toDate().toISOString() || "",
        (v.duration / 60).toFixed(0),
      ];
    });
    const csvWriter = createArrayCsvWriter({
      header: ["UserId", "Email", "Name", "RoomId", "SpaceId", "SpaceName", "First Online", "Last Online", "Streaming Minutes"],
      path,
    });
    return await csvWriter.writeRecords(entries);
  }

  async function writeSummaryToCsv(path: string): Promise<void> {
    const entries = [
      [],
      ["Daily Participant Count"],
      ...Object.entries(usageSummary.dailyParticipants).map(([day, count]) => {
        return [
          day,
          count,
        ];
      }),
      [],
      ["Daily Unique Participant Count"],
      ...Object.entries(usageSummary.dailyUniqueParticipants).map(([day, count]) => {
        return [
          day,
          count,
        ];
      }),
      [],
      ["Total Participant Count"],
      [usageSummary.participantCount],
      ["Total Unique Participant Count"],
      [usageSummary.uniqueParticipantCount],
      ["Average hours per user"],
      [usageSummary.averageHoursAllUsers],
      ["Total streaming hours"],
      [usageSummary.participantStreamingHours],
    ];

    const csvWriter = createArrayCsvWriter({
      path,
    });
    return await csvWriter.writeRecords(entries);
  }

  const outputDir = "output";
  if (!fs.existsSync(outputDir)) await fs.promises.mkdir(outputDir);
  if (fs.existsSync(outputDir) && !(await fs.promises.stat(outputDir)).isDirectory()) console.error("Output dir can't be created because it's a file");
  const spaceIdFilename = () => (spaceId == undefined) ? "" : "-" + spaceId + "-";
  try {
    const usageSummaryFileCsv = `${outputDir}/usage-summary-${name}-${organizationId}${spaceIdFilename()}-${startDate.getFullYear()}-${startDate.getMonth()}-${endDate.getFullYear()}-${endDate.getMonth()}.csv`;
    const usageSummaryFile = `${outputDir}/usage-summary-${name}-${organizationId}${spaceIdFilename()}-${startDate.getFullYear()}-${startDate.getMonth()}-${endDate.getFullYear()}-${endDate.getMonth()}.json`;
    const usageReportFile = `${outputDir}/usage-report-${name}-${organizationId}${spaceIdFilename()}-${startDate.getFullYear()}-${startDate.getMonth()}-${endDate.getFullYear()}-${endDate.getMonth()}.csv`;
    const usageDetailsFile = `${outputDir}/usage-details-${name}-${organizationId}${spaceIdFilename()}-${startDate.getFullYear()}-${startDate.getMonth()}-${endDate.getFullYear()}-${endDate.getMonth()}.csv`;
    console.debug("Writing JSON summary");
    await fs.promises.writeFile(usageSummaryFile, JSON.stringify(usageSummary, undefined, 2));
    console.log("Successfully wrote usage summary (JSON) to: ", usageSummaryFile);
    console.debug("Writing CSV summary");
    await writeSummaryToCsv(usageSummaryFileCsv);
    console.log("Successfully wrote usage summary (CSV) to: ", usageSummaryFileCsv);
    console.debug("Writing CSV report");
    await writeReportToCsv(usageReportFile);
    console.log("Successfully wrote Odyssey report (CSV) to: ", usageReportFile);
    console.debug("Writing CSV details");
    await writeDetailsToCsv(usageDetailsFile);
    console.log("Successfully wrote Odyssey details (CSV) to: ", usageDetailsFile);
    return usageSummary;
  } catch (e: any) {
    console.error("ERROR: ", e);
    return undefined;
  }
}

export async function calculateUsageAllCustomersLastMonth() {
  const organizations = await getOrganizations();
  if (organizations == undefined || organizations.length < 1) {
    console.error("ERROR: No organizations found");
    return;
  }
  const startOfThisMonth = new Date();
  startOfThisMonth.setDate(1);
  const startOfLastMonth = new Date();
  startOfLastMonth.setDate(0);
  startOfLastMonth.setDate(1);
  organizations.map(async ([organizationRef, organization]) => {
    if (organizationRef?.id == undefined || organization == undefined) {
      console.error("ERROR: organization is undefined: ", getOrganizationRef);
      return;
    }
    return await calculateUsage(organization, organizationRef.id, startOfLastMonth, startOfThisMonth, undefined, undefined);
  });
}

export async function calculateUsageAllCustomersThisMonth() {
  const organizations = await getOrganizations();
  if (organizations == undefined || organizations.length < 1) {
    console.error("ERROR: No organizations found");
    return;
  }
  const startOfThisMonth = new Date();
  startOfThisMonth.setDate(1);
  const now = new Date();
  organizations.map(async ([organizationRef, organization]) => {
    if (organizationRef?.id == undefined || organization == undefined) {
      console.error("ERROR: organization is undefined: ", getOrganizationRef);
      return;
    }
    return await calculateUsage(organization, organizationRef.id, startOfThisMonth, now, undefined, undefined);
  });
}

export async function calculateUsageSpecificEvent() {
  const organizations = await getOrganizations();
  if (organizations == undefined || organizations.length < 1) {
    console.error("ERROR: No organizations found");
    return;
  }
  const startOfEvent = new Date("2023-06-01T00:00:00.000Z");
  const endOfEvent = new Date("2023-11-30T23:59:59.999Z");
  organizations.map(async ([organizationRef, organization]) => {
    if (organizationRef?.id == undefined || organization == undefined) {
      console.error("ERROR: organization is undefined: ", organizationRef?.id);
      return;
    }
    if (organizationRef.id != "WASawul3Mkg61Ia0schw" || organization.name == undefined) {
      return;
    }
    return await calculateUsage(organization, organizationRef.id, startOfEvent, endOfEvent);
  });
}

export async function calculateUsageAllTime() {
  const organizations = await getOrganizations();
  if (organizations == undefined || organizations.length < 1) {
    console.error("ERROR: No organizations found");
    return;
  }
  const startOfEvent = new Date("2023-01-01T00:00:00Z");
  const endOfEvent = new Date("2023-05-10T17:00:00.000+09:00");
  const totalUniqueParticipantCount = (await Promise.all(organizations.map(async ([organizationRef, organization]) => {
    if (organizationRef?.id == undefined || organization == undefined || organization.name == undefined) {
      console.error("ERROR: organization is undefined: ", organizationRef?.id);
      return undefined;
    } else {
      return await calculateUsage(organization, organizationRef.id, startOfEvent, endOfEvent, organization.name.replace(" ", ""), undefined);
    }
  }))).reduce((acc, summary) => {
    if (summary != undefined) {
      return acc + summary.uniqueParticipantCount;
    } else return acc;
  }, 0);
  console.log("totalUniqueParticipantCount: ", totalUniqueParticipantCount);
}

// calculateUsageAllTime();
// calculateUsageAllCustomersLastMonth();
// calculateUsageAllCustomersThisMonth();
calculateUsageSpecificEvent();

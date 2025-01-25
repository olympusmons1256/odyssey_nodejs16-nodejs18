import * as admin from "firebase-admin";
import * as jsum from "jsum";
import * as cmsDocTypes from "./cmsDocTypes";
import {getSpace, getSpaceHistoryCollectionRef, getSpaceItems, getSpaceItemsHistoryPagesRef, getUser} from "./documents/firestore";

interface SpaceItemsWithIds {
  [key: string]: cmsDocTypes.SpaceItem
}

export async function saveSpaceHistory(organizationId: string, spaceId: string, timestamp?: Date, space?: cmsDocTypes.OrgSpace, authorUserId?: string, name?: string) {
  const getAuthorUser = async () => {
    if (authorUserId == undefined) return undefined;
    const [, user] = await getUser(authorUserId);
    if (user == undefined) return "error-not-found";
    return user;
  };

  try {
    const authorUser = await getAuthorUser();
    if (authorUser == "error-not-found") return "error-author-user-not-found";
    const spaceItemDocs = await getSpaceItems(organizationId, spaceId);
    if (spaceItemDocs == undefined) return "error-space-items-not-found";
    const spaceItems = spaceItemDocs.reduce<SpaceItemsWithIds>((acc, [doc, item]) => {
      if (doc != undefined && item != undefined) {
        acc[doc.id] = item;
      }
      return acc;
    }, {} as SpaceItemsWithIds);

    if (Object.values(spaceItems).length != spaceItemDocs.length) {
      console.error("Some space items are missing from query");
      return "error-internal";
    }
    const getSpaceIfNotSet = async () => {
      if (space != undefined) return space;
      const [, spaceLatest] = await getSpace(organizationId, spaceId);
      return spaceLatest;
    };
    const spaceToUse = await getSpaceIfNotSet();
    if (spaceToUse == undefined) {
      console.error("Couldn't find space", {organizationId, spaceId});
      return "error-not-found";
    }

    const checksum = jsum.digest({space, spaceItems}, "SHA256", "hex");
    const spaceHistory: cmsDocTypes.SpaceHistory = {
      name,
      timestamp: admin.firestore.Timestamp.now(),
      authorName: (authorUser != undefined) ? authorUser.name : undefined,
      authorUserId,
      authorType: (authorUser != undefined) ? "user" : "system",
      checksum,
      space: spaceToUse,
    };

    const spaceHistoryDocId = (timestamp != undefined) ? timestamp.toISOString() : new Date().toISOString();
    await getSpaceHistoryCollectionRef(organizationId, spaceId).doc(spaceHistoryDocId).create(spaceHistory);

    const spaceItemsJson = JSON.stringify(spaceItems);
    const maxDataLength = 1048576 - 1024; // 1MB less 1KB for extra fields in future
    const pages = Array.from(Array(Math.ceil(spaceItemsJson.length / maxDataLength)).keys()).map((v) => {
      const start = maxDataLength * v;
      const end = (maxDataLength * (v + 1)) - 1;
      const data = spaceItemsJson.slice(start, end);
      return {
        data,
      } as cmsDocTypes.SpaceItemsHistoryPage;
    });

    await Promise.all(pages.map(async (page, index) => {
      return await getSpaceItemsHistoryPagesRef(organizationId, spaceId, spaceHistoryDocId).doc(index.toString()).create(page);
    }));

    return {
      id: spaceHistoryDocId,
      spaceHistory,
      spaceItemsHistoryPages: pages,
    };
  } catch (e: any) {
    console.error(e);
    return "error-internal";
  }
}


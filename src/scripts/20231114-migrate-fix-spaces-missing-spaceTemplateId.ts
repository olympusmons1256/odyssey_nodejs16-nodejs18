import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {getSpaceTemplates, getUnrealProjectRef} from "../lib/documents/firestore";
import {OrgSpace} from "../lib/cmsDocTypes";

import {sleep, timeChunkedOperation} from "../lib/misc";

(async () => {
  const spaces = (await admin.firestore().collectionGroup("spaces").get()).docs;
  console.debug(`Space docs found: ${spaces.length}`);
  const spacesMissingSpaceTemplateId = spaces
    .flatMap((doc) => {
      const space = doc.data() as OrgSpace;
      if (space.spaceTemplateId == undefined || space.spaceTemplateId == "") {
        console.debug(`Space has missing spaceTemplateId: ${doc.ref.path}`);
        return [{doc, space}];
      }
      return [];
    });
  console.debug(`Space docs to update: ${spacesMissingSpaceTemplateId.length}`);

  const spaceTemplates = await getSpaceTemplates();
  if (spaceTemplates == undefined) throw new Error("Failed to get any space templates");

  const spaceTemplatesByUnrealProjectId = spaceTemplates?.reduce<{ [unrealProjectId: string]: string }>((acc, sT) => {
    const [spaceTemplateDoc, spaceTemplate] = sT;
    if (spaceTemplateDoc == undefined || spaceTemplate == undefined || spaceTemplate.unrealProject?.unrealProjectId == undefined) {
      console.debug(`SpaceTemplate is invalid: ${sT[0]?.ref.path}`);
      return acc;
    }
    acc[spaceTemplate.unrealProject.unrealProjectId] = spaceTemplateDoc.id;
    return acc;
  }, {});

  const spaceUpdates = spacesMissingSpaceTemplateId.flatMap((space) => {
    const unrealProjectId = space.space.unrealProject?.unrealProjectId;
    if (unrealProjectId == undefined) {
      console.debug(`Space is missing unrealProject.unrealProjectId: ${space.doc.ref.path}`);
      return [];
    }
    const spaceTemplateId = spaceTemplatesByUnrealProjectId[unrealProjectId];
    if (spaceTemplateId == undefined) {
      console.debug(`Failed to resolve new spaceTemplateId for: ${space.doc.ref.path}`);
      return [];
    }
    return [{
      update: {...space.space, spaceTemplateId},
      doc: space.doc,
    }];
  });

  const unrealProjectsToRedenormalize = spaceUpdates.flatMap((s) => s.update.unrealProject?.unrealProjectId ? [s.update.unrealProject?.unrealProjectId] : []);


  await timeChunkedOperation(spaceUpdates, 10, 1000, undefined, undefined, async (spaceUpdate) => {
    console.debug(`Updatng space: ${spaceUpdate.doc.ref.path}`);
    await spaceUpdate.doc.ref.update(spaceUpdate.update);
  });

  await timeChunkedOperation(unrealProjectsToRedenormalize, 10, 1000, undefined, undefined, async (unrealProjectId) => {
    const latestProjectVersionDoc = (await getUnrealProjectRef(unrealProjectId).collection("unrealProjectVersions")
      .orderBy("created", "desc")
      .limit(1).get()).docs.pop();
    if (latestProjectVersionDoc == undefined || latestProjectVersionDoc.exists != true) return console.error(`Failed to get latest project version for unrealProjectId: ${unrealProjectId}`);

    console.debug(`Updating UPV ${latestProjectVersionDoc.ref.path} for redenormalization of spaceTemplate ${spaceTemplatesByUnrealProjectId[unrealProjectId]}`);
    await latestProjectVersionDoc.ref.update({state: "re-denormalize"});
    await sleep(1000);
    await latestProjectVersionDoc.ref.update({state: "volume-copy-complete"});
  });
}
)();


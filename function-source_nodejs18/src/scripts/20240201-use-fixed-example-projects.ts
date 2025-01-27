import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {getSpaceTemplateRef, getSpaceTemplates} from "../lib/documents/firestore";
import {OrgSpace, SpaceTemplate, SpaceUnrealProject} from "../lib/cmsDocTypes";

import {timeChunkedOperation} from "../lib/misc";

const newProjectIds = {
  "Mountain Campus": "42JjBN0QabURvzsRmepg",
  "Naturedome": "XZ4ANw5muyjmjRXLCUPu",
  "Lighthouse": "LSITF0tX5fO3q0afBu5j",
  "Beach": "MzlMWHqKFnFw27rIzSIl",
  "Classroom": "VxCGhTVwuLzseXBkN9CF",
  "Courtyard": "uhoIenJfJIico5OUDGCo",
  "Villa": "4FrvrJe1q27ec6ZFrVI0",
};

function oldProjectToNew(oldProjectId: string) {
  switch (oldProjectId) {
    case "NQ2g2SfWm3QvZa00KPp9": return {name: "Mountain Campus", newProjectId: newProjectIds["Mountain Campus"], oldProjectId: oldProjectId};
    case "QeiAtPQEGVJVf2uHkRty": return {name: "Naturedome", newProjectId: newProjectIds["Naturedome"], oldProjectId: oldProjectId};
    case "FW7I0VORLDKAbHmgKwVM": return {name: "Lighthouse", newProjectId: newProjectIds["Lighthouse"], oldProjectId: oldProjectId};
    case "VhN9W7e2RaouYaPnhdh7": return {name: "Beach", newProjectId: newProjectIds["Beach"], oldProjectId: oldProjectId};
    case "TC35zrIEtjLLGRpnV1yu": return {name: "Classroom", newProjectId: newProjectIds["Classroom"], oldProjectId: oldProjectId};
    case "eipn2YEBNx4VtbFPQZJG": return {name: "Courtyard", newProjectId: newProjectIds["Courtyard"], oldProjectId: oldProjectId};
    case "Gb6TfcvXRadaOpcgJlDU": return {name: "Villa", newProjectId: newProjectIds["Villa"], oldProjectId: oldProjectId};
    default: return undefined;
  }
}

(async () => {
  const spaceTemplates = await getSpaceTemplates();
  if (spaceTemplates == undefined) throw new Error("Failed to get any space templates");
  console.debug(`Found ${spaceTemplates.length} space templates`);

  /*
  const spacesTemplatesToUpdate = spaceTemplates
    .flatMap(([doc, spaceTemplate]) => {
      if (doc == undefined || spaceTemplate == undefined) {
        return [];
      }
      if (spaceTemplate.unrealProject?.unrealProjectId == undefined) {
        console.debug(`Space template doesn't have an unrealProject.unrealProjectId: ${doc.ref.path}`);
        return [];
      }
      const update = oldProjectToNew(spaceTemplate.unrealProject.unrealProjectId);
      if (update == undefined) {
        return [];
      }
      console.debug(`Space template on outdated ${update.name}: ${doc.ref.path}`);
      return [{doc, update, spaceTemplate}];
    });
  console.debug(`Space template docs to update: ${spacesTemplatesToUpdate.length}`);

  const spaceTemplateUpdates = spacesTemplatesToUpdate.map((spaceTemplate) => {
    const unrealProject : SpaceUnrealProject = {
      unrealProjectId: spaceTemplate.update.newId,
      unrealProjectVersionId: "latest",
    };
    return {
      update: {
        ...spaceTemplate.spaceTemplate,
        unrealProject,
        oldUnrealProjectId: spaceTemplate.update.oldProjectId,
        migratedAt: admin.firestore.Timestamp.now(),
      },
      doc: spaceTemplate.doc,
    };
  });
  */

  const spaces = (await admin.firestore().collectionGroup("spaces").get()).docs;
  console.debug(`Space docs found: ${spaces.length}`);
  const spacesToUpdate = spaces
    .flatMap((doc) => {
      if (doc.exists == false) {
        console.debug(`Space doesn't exist: ${doc.ref.path}`);
        return [];
      }
      const space = doc.data() as OrgSpace;
      if (space.unrealProject?.unrealProjectId == undefined) {
        console.debug(`Space doesn't have an unrealProject.unrealProjectId: ${doc.ref.path}`);
        return [];
      }
      const update = oldProjectToNew(space.unrealProject.unrealProjectId);
      if (update == undefined) {
        return [];
      }
      // console.debug(`Space on outdated ${update.name}: ${doc.ref.path}`);
      return [{doc, update, space}];
    });
  console.debug(`Spaces to update: ${spacesToUpdate.length}`);

  const newSpaceTemplatesByUnrealProjectId = spaceTemplates.reduce<{ [unrealProjectId: string]: {oldTemplate: SpaceTemplate & {id: string}, newTemplate: SpaceTemplate & {id: string}} }>((acc, sT) => {
    const [spaceTemplateDoc, spaceTemplate] = sT;
    if (spaceTemplateDoc == undefined || spaceTemplate == undefined || spaceTemplate.unrealProject?.unrealProjectId == undefined) return acc;
    const newAndOldProjects = oldProjectToNew(spaceTemplate.unrealProject.unrealProjectId);
    if (newAndOldProjects == undefined) return acc;
    const newTemplateRecord = spaceTemplates.find((o) => o[1]?.unrealProject?.unrealProjectId == newAndOldProjects.newProjectId);
    if (newTemplateRecord == undefined) return acc;
    const [newTemplateDoc, newTemplate] = newTemplateRecord;
    if (newTemplateDoc == undefined || newTemplate == undefined) return acc;
    const newTemplateD = {
      ...newTemplate,
      id: newTemplateDoc.id,
    };
    const oldTemplateD = {
      ...spaceTemplate,
      id: spaceTemplateDoc.id,
    };
    acc[newAndOldProjects.newProjectId] = {oldTemplate: oldTemplateD, newTemplate: newTemplateD};
    console.debug(`New project: ${spaceTemplate.unrealProject.unrealProjectId} has old template: ${oldTemplateD.id} and new template: ${newTemplateD.id}`);
    return acc;
  }, {});

  const spaceUpdates = spacesToUpdate.flatMap((space) => {
    const newSpaceTemplateId = newSpaceTemplatesByUnrealProjectId[space.update.newProjectId].newTemplate.id;
    const unrealProject : SpaceUnrealProject = {
      unrealProjectId: space.update.newProjectId,
      unrealProjectVersionId: "latest",
    };
    if (newSpaceTemplateId == undefined) {
      console.debug(`Failed to resolve new spaceTemplateId for: ${space.doc.ref.path}`);
      return [];
    }
    return [{
      update: {
        ...space.space,
        unrealProject,
        oldUnrealProjectId: space.update.oldProjectId,
        oldSpaceTemplateId: space.space.spaceTemplateId,
        migratedAt: admin.firestore.Timestamp.now(),
        spaceTemplateId: newSpaceTemplateId,
      },
      doc: space.doc,
    }];
  });

  const spaceTemplateUpdates =
      Object.values(newSpaceTemplatesByUnrealProjectId).flatMap((o) => {
        return [{
          ...o.newTemplate,
          thumb: o.oldTemplate.thumb,
          name: o.oldTemplate.name,
          public: o.oldTemplate.public,
          description: o.oldTemplate.description,
          demoUrl: o.oldTemplate.demoUrl,
        },
        {
          ...o.oldTemplate,
          public: false,
        },
        ];
      });

  console.debug(`Space templates to update: ${spaceTemplateUpdates.length}`);

  await timeChunkedOperation(spaceUpdates, 10, 1000, undefined, undefined, async (u) => {
    console.debug(`Updatng space: ${u.doc.ref.path} to`);
    console.debug(u.update);
    await u.doc.ref.update(u.update);
  });

  await timeChunkedOperation(spaceTemplateUpdates, 10, 1000, undefined, undefined, async (u) => {
    const spaceTemplateRef = getSpaceTemplateRef(u.id);
    console.debug(`Updatng space template: ${spaceTemplateRef.path} to`);
    console.debug(u);
    await spaceTemplateRef.update(u);
  });
})();


import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {getSpaceTemplates} from "../lib/documents/firestore";

(async () => {
  const spaceTemplates = await getSpaceTemplates();
  if (spaceTemplates == undefined) return [];
  console.log(`Got ${spaceTemplates.length} space templates`);
  const spaceTemplatesFiltered = spaceTemplates.flatMap(([doc, spaceTemplate]) => {
    if (doc == undefined || spaceTemplate == undefined) return [];
    if (spaceTemplate.unrealProject == undefined) return [];
    if (spaceTemplate.ueId != undefined && spaceTemplate.ueId != "") return [];
    return [{
      id: doc.id,
      name: spaceTemplate.name,
      created: spaceTemplate.created,
    }];
  });
  console.log(`Got ${spaceTemplatesFiltered.length} space templates that match`);
  return console.log(JSON.stringify(spaceTemplatesFiltered, undefined, 2));
})();

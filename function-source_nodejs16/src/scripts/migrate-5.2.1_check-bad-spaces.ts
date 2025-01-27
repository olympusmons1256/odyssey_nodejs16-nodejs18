import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {getOrganizations, getSpaces} from "../lib/documents/firestore";

function log(level: string, msg: string, obj?: any) {
  const message = `${new Date().toISOString()} - ${level}: ${msg}`;
  if (obj == undefined) {
    console.log(message);
  } else {
    console.log(message, obj);
  }
}

function loginfo(msg: string, obj?: any) {
  log("INFO", msg, obj);
}

function logwarn(msg: string, obj?: any) {
  log("WARN", msg, obj);
}

(async () => {
  const organizations = await getOrganizations();
  if (organizations == undefined || organizations.length < 1) {
    logwarn("No organizations found");
    return;
  }
  loginfo(`Found ${organizations.length} organizations`);

  const spaceDocs = (await Promise.all(organizations.map(async ([organizationDoc]) => {
    if (organizationDoc == undefined) return [];
    const result = await getSpaces(organizationDoc.id);
    if (result == undefined) return [];
    return result;
  }))).flat().flatMap(([spaceDoc, space]) => {
    if (spaceDoc == undefined || space == undefined) return [];
    const organizationId = spaceDoc.ref.parent.parent?.id;
    if (organizationId == undefined) {
      logwarn(`Failed to get organizationId of space: ${spaceDoc.id}`);
      return [];
    }
    return [{
      organizationId: spaceDoc.ref.parent.parent?.id,
      doc: spaceDoc,
      space,
    }];
  });

  loginfo(`Got ${spaceDocs.length} space docs`);
  spaceDocs.forEach((o) => {
    if (o.doc.id == "tCpWu8htNK3xTy6HuQhSRe") {
      loginfo(o.doc.id + ": " + JSON.stringify(o.space));
    } else {
      loginfo(o.doc.id + " not matched");
    }
  });
})();

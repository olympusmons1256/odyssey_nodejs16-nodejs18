import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});
import * as fs from "node:fs";

import {getOrganization, getSpaceItems, getSpaces} from "../lib/documents/firestore";

function log(level: string, msg: string, obj?: any) {
  const message = `${new Date().toISOString()} - ${level}: ${msg}`;
  if (obj == undefined) {
    console.error(message);
  } else {
    console.error(message, obj);
  }
}

function loginfo(msg: string, obj?: any) {
  log("INFO", msg, obj);
}

function logerror(msg: string, obj?: any) {
  log("ERROR", msg, obj);
}

function logwarn(msg: string, obj?: any) {
  log("WARN", msg, obj);
}

(async () => {
  const organizationId = process.env["ORGANIZATION_ID"];
  if (organizationId == undefined) {
    logerror("Must specify ORGANIZATION_ID");
    process.exit(1);
  }

  const [organizationDoc, organization] = await getOrganization(organizationId);

  if (organizationDoc == undefined || organization == undefined) {
    logerror(`Organization ${organizationId} not found`);
    process.exit(1);
  }

  // const irisHallOrgId = "89A7mkSxFRM7tNydH2xcqd";
  // const irisHallOrgId = "lUhC4Ckd1yuaOFf9nEbJ";
  const spaces = await getSpaces(organizationId);
  if (spaces == undefined || spaces.length < 1) {
    logerror("No spaces found");
    return;
  }

  const spacesWithSpaceItems = (await Promise.all(spaces.map(async ([spaceDoc, space]) => {
    if (spaceDoc == undefined || space == undefined) {
      logwarn("Space undefined");
      return undefined;
    }
    const spaceItems = await getSpaceItems(organizationId, spaceDoc.id);
    if (spaceItems == undefined) {
      return undefined;
    }
    const spaceItemsFiltered = spaceItems.flatMap(([spaceItemDoc, spaceItem]) => {
      if (
        spaceItemDoc == undefined ||
        spaceItem == undefined ||
        spaceItemDoc.id === "BridgeToolkitSettings" ||
        spaceItem.type === "BridgeToolkitSettings"
      ) return [];
      return {
        id: spaceItemDoc.id,
        spaceItem,
      };
    });
    loginfo(`Got ${spaceItemsFiltered.length} space items in space ${spaceDoc.ref.path}`);
    return {
      space: {
        id: spaceDoc.id,
        name: space.name,
        created: space.created,
        updated: space.updated,
        isPublic: space.isPublic,
        allowEmbed: space.allowEmbed,
      },
      items: spaceItemsFiltered,
    };
  }))).flatMap((v) => v == undefined ? [] : v);

  const outfile = `/tmp/odyssey-spaces-with-spaceItems-${organizationDoc.id}-${Date.now()}.json`;
  loginfo("Writing spaces & spaceItems to JSON file");
  fs.writeFileSync(outfile, JSON.stringify(spacesWithSpaceItems, undefined, 2));
})();

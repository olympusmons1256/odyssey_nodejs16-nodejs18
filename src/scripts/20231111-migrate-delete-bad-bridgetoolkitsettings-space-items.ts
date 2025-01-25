import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});
import {SpaceItem} from "../lib/cmsDocTypes";

import {timeChunkedOperation} from "../lib/misc";


(async () => {
  const spaceItemDocs = (await admin.firestore().collectionGroup("spaceItems").get()).docs;
  console.debug(`Space item docs found: ${spaceItemDocs.length}`);
  const spaceItemDocsToDelete = spaceItemDocs
    .flatMap((spaceItemDoc) => {
      const spaceItem = spaceItemDoc.data() as SpaceItem;
      if (spaceItemDoc.id != "BridgeToolkitSettings" && spaceItem.type == "BridgeToolkitSettings") {
        return [spaceItemDoc];
      }
      return [];
    });
  console.debug(`Space item docs to delete: ${spaceItemDocsToDelete.length}`);

  return await timeChunkedOperation(spaceItemDocsToDelete, 10, 1000, undefined, undefined, async (spaceItemDoc) => {
    await spaceItemDoc.ref.delete();
    console.debug(`Deleted space item doc: ${spaceItemDoc.ref.path}`);
  });
}
)();


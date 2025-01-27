import {ChangeType} from "@newgameplus/firestore-bigquery-change-tracker";
import * as functions from "firebase-functions";
import {customRunWith} from "./shared";
import {getChangeType} from "./lib/bigQueryExport/util";
import {getUnrealPluginVersion, getUnrealPluginVersionRef, unrealPluginVersionWildcardPath} from "./lib/documents/firestore";
import {deleteUnrealPluginVersionPvcs} from "./lib/unrealPluginVersions/deploy-standard";

export const onWritePluginVersion =
  // onWrite() of plugin version
  functions
    .runWith({...customRunWith, timeoutSeconds: 540})
    .firestore
    .document(unrealPluginVersionWildcardPath())
    .onWrite(async (change, context) => {
      console.log("Document context:");
      console.log(JSON.stringify(context));
      const changeType = getChangeType(change);
      if (changeType == ChangeType.DELETE || changeType == ChangeType.IMPORT) {
        console.debug(`Unreal project version document ${changeType} does nothing.`);
        return;
      }
      console.log("Document data:");
      console.log(JSON.stringify(change.after.data()));
      const unrealPluginVersionId: string = context.params.unrealPluginVersionId;

      const [, unrealPluginVersion] = await getUnrealPluginVersion(unrealPluginVersionId);
      if (unrealPluginVersion == undefined) {
        console.warn("UnrealPluginVersion is undefined");
      }

      switch (unrealPluginVersion?.status) {
        case "expiring":
          if (unrealPluginVersion === undefined) {
            console.error("Regions not set");
            return;
          }
          await deleteUnrealPluginVersionPvcs(unrealPluginVersionId, unrealPluginVersion.regions);
          return await getUnrealPluginVersionRef(unrealPluginVersionId).update({status: "expired"});
        case "expired":
          console.debug(`Unreal project version expired: ${unrealPluginVersionId}`);
          return;
        default:
          return console.error(`Unhandled unreal project version status ${unrealPluginVersion?.status}. Doing nothing.`);
      }
    });

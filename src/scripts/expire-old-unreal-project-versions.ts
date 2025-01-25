import * as admin from "firebase-admin";

admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

async function expireOldUnrealProjectVersions() {
  const query = await admin.firestore().collection("unrealProjects")
    .get();
  const result = query.docs.flatMap(async (doc) => {
    const result = await admin.firestore().collection("unrealProjects")
      .doc(doc.id)
      .collection("unrealProjectVersions")
      .where("state", "==", "volume-copy-complete")
      .orderBy("created", "desc")
      .get();
    if (result.docs === undefined || result.docs.length <= 0) return [];
    return result.docs.slice(2);
  });
  return await Promise.all((await Promise.all(result))
    .flatMap((item) => item === undefined || item.length <= 0 ? [] : item)
    .map(async (doc) => await doc.ref.update({state: "volume-copy-expiring"})));
}

expireOldUnrealProjectVersions();

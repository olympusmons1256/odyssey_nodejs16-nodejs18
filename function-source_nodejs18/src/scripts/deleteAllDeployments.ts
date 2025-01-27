import * as admin from "firebase-admin";
admin.initializeApp();

async function f() {
  const deployments = await admin.firestore().collectionGroup("deployments").get();
  console.log(`Got ${deployments.size} deployments. Deleting them all now`);
  deployments.forEach(async (deployment) => {
    console.log("Deleting ", deployment.ref.path);
    deployment.ref.delete().then(() => console.log("Deleted ", deployment.ref.path));
  });
}

f();

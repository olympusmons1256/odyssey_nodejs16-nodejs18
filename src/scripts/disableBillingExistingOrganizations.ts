import * as admin from "firebase-admin";

async function run() {
  const organizations = await admin.firestore().collection("organizations").get()
    .catch(((err) => {
      console.log(err);
      return undefined;
    }));
  if (organizations == undefined || organizations.empty) {
    console.log("No organization users found");
    return;
  }
  try {
    const promises = organizations.docs.map((doc) => {
      return admin.firestore().collection("organizations").doc(doc.id).collection("billing").doc("public").set(
        {
          disableBilling: true,
          aggregateBillingState: "active",
        },
        {merge: true}
      );
    });
    return await Promise.all(promises);
  } catch (err) {
    console.log(`ERROR: ${err}`);
    return null;
  }
}
run();

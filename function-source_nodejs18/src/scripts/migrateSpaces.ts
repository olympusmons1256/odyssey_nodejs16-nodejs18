import * as admin from "firebase-admin";

admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

async function run() {
  // get reference to templates
  const templates = await admin.firestore().collection("/spaceTemplates").get();
  if (templates.empty) {
    console.log("No templates found");
  }

  // get reference to organizations
  const organizations = await admin.firestore().collection("/organizations").get();
  if (organizations.empty) {
    console.log("No organizations found");
  }

  // iterate through organizations
  const organizationSpaceUpdates = (organizations.docs.map(async (organizationDoc) => {
    // update organizations domain, logo, and splash
    await organizationDoc.ref.set({
      domain: organizationDoc.id,
      logoSmallUrl: "https://firebasestorage.googleapis.com/v0/b/ngp-odyssey-prod.appspot.com/o/orgThumbs%2Fodyssey-logo.jpg?alt=media&token=2457971d-1039-4406-a514-b58006311817",
      splashImageUrl: "http://odyssey-app.imgix.net/banner-abstract/3.jpg?crop=edges&fit=crop&h=1080&w=1920",
    }, {merge: true});

    const organizationData = organizationDoc.data();

    // get rooms > for each room create a space
    const rooms = await admin.firestore().collection(`organizations/${organizationDoc.id}/rooms`).get();
    console.log(`Got ${rooms.docs.length} rooms from organization ${organizationDoc.id}`);
    if (rooms.empty) {
      console.log(`No rooms found in organzation ${organizationData.id}`);
    }

    const promises = rooms.docs.map(async (room)=> {
      // get roomData
      const roomData = room.data();

      // return if space already exists
      if (roomData.spaceId) {
        console.log(`Space already exists: ${roomData.spaceId}`);
        return;
      }

      // find correct template for room
      const templateMatch = templates.docs.find((f)=> f.data().ueId === roomData.levelId);
      if (!templateMatch) {
        console.log(`Template for room ${roomData.id} does not exists`);
        return;
      }
      const spaceCollection = admin.firestore().collection(`organizations/${organizationDoc.id}/spaces`);

      // roomlist we will pass to space
      const roomList = [room.id];
      if (roomData.shards) {
        roomData.shards.map((i: any)=> {
          roomList.push(i);
        });
      }

      // skip shards (their ref is passed through from master room)
      if (!roomData.shardOf) {
        // create new space
        const newSpaceDoc = await spaceCollection.add({
          // copy from template
          created: admin.firestore.Timestamp.now(),
          updated: admin.firestore.Timestamp.now(),
          spaceTemplateId: templateMatch.id,
          ueId: templateMatch.data().ueId,
          thumb: templateMatch.data().thumb,
          // copy from room
          name: roomData.name,
          rooms: roomList,
          description: roomData.description || "",
          persistentLiveStream: roomData.persistentLiveStream || "",
          isLiveStreamActive: roomData.isLiveStreamActive || false,
          isPublic: roomData.isPublic || false,
          showPublicRoomLanding: roomData.showPublicRoomLanding || false,
          enableSharding: roomData.enableSharding || false,
          infoFields: roomData.infoFields || {},
        });
        await newSpaceDoc.update({id: newSpaceDoc.id});
        return await room.ref.update({spaceId: newSpaceDoc.id});
      }
      return;
    });
    return await Promise.all(promises);
  }));

  return await Promise.all(organizationSpaceUpdates);
}

run();

import * as admin from "firebase-admin";
admin.initializeApp();
admin.firestore().settings({ignoreUndefinedProperties: true});

import {getSpaceItems, getSpaces} from "../lib/documents/firestore";

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

function logerror(msg: string, obj?: any) {
  log("ERROR", msg, obj);
}

function logwarn(msg: string, obj?: any) {
  log("WARN", msg, obj);
}

const gdriveIdsAndImages: { [key: string]: string } = {
  "1gfv0XvRSS59wcv8jdsPXL3n77O4PvZ5s": "Photobooth.jpg",
  "1nhyyNTHgeQm8KwjkM5Ck8P6L2ZhG822l": "Photobooth.png",
  "1lOP4-WHcEQTrQteSLVFyyjPyhHBbJBoo": "T_Band.jpg",
  "1ga7EivikiaZnzB6PsZ4CUQ7ZcRbw7547": "T_Barrel_Table.jpg",
  "1DNExqySiMIMEjXbGvNotxMd4F4wx7ZJS": "T_Cake_Table.jpg",
  "1pP-xpQzXYKAO0y-ifMB3th5pygWm7j86": "T_Coffee_Table.jpg",
  "1u-K9d317fiO4VUDIxuEqf9fVtB1djfU3": "T_Curtain_Crystal.jpg",
  "1YdV10qTP5sQOmmMDHengpfwN3_rWwrqO": "T_Curtain_Tie.jpg",
  "1VBQMmEY3G_2IPVbjqtmQhzPUmB2yaC39": "T_Curtain.jpg",
  "1H3obsYQ9LhceA6gqwka8kaixKnYbkn1t": "T_DanceFloor_8x4.jpg",
  "1AyOkldxrwUHjUXQxUutj03mYmFhfYKWB": "T_DanceFloor_9x5.jpg",
  "191brsvqOedCte3kUjtL-IGKTlDQnxSo_": "T_DJStand.jpg",
  "19DfPSKDhpwUzFhwMfKJyI5eKyZxkwkU4": "T_Food_Table_2.jpg",
  "1ntKAya2y4kCkSPAoP8hf-g29s463YYSB": "T_Food_Table.jpg",
  "1i9rPr8cjSHVCTQaYV56AqjL5O1KlLNQp": "T_Gift_Table.jpg",
  "1M4yfY639QLc1jQzDLw2F1fU4tdgE4xQT": "T_Gray_Table.jpg",
  "1o3436DM4eryQLNhr0WpMo6ZUqfH2uzuv": "T_HighTable.jpg",
  "1pZVkIZxhk7xDegiAWHaGQXUQ8tb_qagz": "T_Murray_Table.jpg",
  "1sb1PY1DPIFDkQUa4mX2qC21BoNaG2uVb": "T_Murray_Table04.jpg",
  "1wjBv8PeBaSF09bxtn2mPi49HPupdh8A-": "T_Podium.jpg",
  "1m76mL3H9XnC6sR0td0A2PgtNqnjRUnSN": "T_projector.jpg",
  "1Aq-oqp47TO-ZH1hsTEZA8FwiRpyU9-45": "T_SweetDisplay_Antique.jpg",
  "1in1AlAxHp6fxLSmX_4-tPx73uwZ-0fyn": "T_SweetDisplay_boxwood_1.jpg",
  "1QRnNlonawI_oemiWrfPrkFnH_e14fB5v": "T_SweetDisplay_boxwood_JustMarried.jpg",
  "1DXZ2I3feWhLLTcjyKAsot8mOuHZ_GrDf": "T_SweetDisplay_GlassGold.jpg",
  "1eSyDYJhRzqrNSC6vVGUV2yzVfVBBS3Mk": "T_SweetDisplay_split.jpg",
  "1eWJ71v1EIklQEd_gNKHsK6YIpWUdohPf": "T_TableSetup_72_CC.PNG",
  "1vDyqfkqPYNxgQ8CyCJDUOwr-wIaZyFdQ": "T_TableSetup_Gray_8.jpg",
  "1umiStmMaahLHcOAJP8TQqzPO8ucm23s-": "T_TableSetup_Rect8_8.jpg",
  "1ZhTyydJkzDsqz2UDbwHuqhXegXQyqE85": "T_TableSetup_Wood_8.jpg",
  "1Otgxk1l9xJobMtqUtuoqaa6hZlAcvYMd": "T_Wood_Table.jpg",
  "1FfEp3dcVexu6yNBrK72QhPrwOv3kG60V": "TableNumberWithNotes.png",
};

(async () => {
  const irisHallOrgId = "89A7mkSxFRM7tNydH2xcqd";
  // const irisHallOrgId = "lUhC4Ckd1yuaOFf9nEbJ";
  const spaces = await getSpaces(irisHallOrgId);
  if (spaces == undefined || spaces.length < 1) {
    logwarn("No spaces found");
    return;
  }

  const spaceItems = (await Promise.all(spaces.flatMap(async ([spaceDoc]) => {
    if (spaceDoc == undefined) return undefined;
    // if (spaceDoc.id != "2UxH5bjL6QFcfxnfuaPd7V") return undefined;
    return await getSpaceItems(irisHallOrgId, spaceDoc.id);
  }))).flatMap((v) => v == undefined ? [] : v);

  loginfo(`Got ${spaceItems.length} space items`);

  const spaceItemUpdates = spaceItems.flatMap(([spaceItemDoc, spaceItem]) => {
    if (spaceItemDoc == undefined || spaceItem == undefined) return [];
    if (spaceItem.type != "ConfiguratorObject") return [];
    if (spaceItem.thumb == undefined) return [];
    if (spaceItem.thumb.startsWith("https://drive.google.com/uc?export=download&id=") != true) {
      logwarn(`${spaceItemDoc.ref.path} has thumb ${spaceItem.thumb} which is not a gdrive url.`);
      return [];
    }
    const match = /https:\/\/.*&id=(.*)$/.exec(spaceItem.thumb);
    // console.debug({doc: spaceItemDoc.ref.path, match});
    if (match == null || match.length < 2) {
      logwarn(`${spaceItemDoc.ref.path} has thumb ${spaceItem.thumb} which didn't match regex.`);
      return [];
    }
    const gdriveId = match[1];
    const imageFile = gdriveIdsAndImages[gdriveId];
    if (imageFile == undefined) {
      logwarn(`${spaceItemDoc.ref.path} has gdrive id ${gdriveId} which isn't in the list to be replaced.`);
      return [];
    }
    const newUrl = "https://storage.googleapis.com/odyssey-art-assets/iris-hall-configurator-thumbs/" + imageFile;
    return [{
      doc: spaceItemDoc,
      update: {
        oldThumb: spaceItem.thumb,
        thumb: newUrl,
      },
    }];
  });

  loginfo(`Found ${spaceItemUpdates.length} space items to update`);

  const result = await Promise.all(spaceItemUpdates.map(async (spaceItemUpdate) => {
    try {
      loginfo(`Updating ${spaceItemUpdate.doc.ref.path} thumb ${spaceItemUpdate.update.oldThumb} to ${spaceItemUpdate.update.thumb}.`);
      await spaceItemUpdate.doc.ref.update({
        ...spaceItemUpdate.update,
        migratedThumbAt: admin.firestore.Timestamp.now(),
      });
    } catch (e: any) {
      logerror(e);
      logerror(`Failed to update ${spaceItemUpdate.doc.ref.path} thumb ${spaceItemUpdate.update.oldThumb} to ${spaceItemUpdate.update.thumb}`);
    }
  }));
  loginfo(`Successfully updated ${result.length} space items`);
})();

## Functions

### Firestore -> BigQuery export

Functions in  `src/bigQuery.ts` ensure that all writes are _streamed_ to BigQuery.
This uses the [firestore-bigquery-change-tracker](https://github.com/firebase/extensions/tree/next/firestore-bigquery-export/firestore-bigquery-change-tracker|https://github.com/firebase/extensions/tree/next/firestore-bigquery-export/firestore-bigquery-change-tracker) library.

#### Initial Import

For initial data import, we have a script `./src/scripts/firestore-bigquery-import` which wraps `fs-bq-import-collection`. See [this guide](https://github.com/firebase/extensions/blob/next/firestore-bigquery-export/guides/IMPORT_EXISTING_DOCUMENTS.md).

**WARNING**: The data import only needs to be run once ever. Chances are you don't need to run it.

If you do need to run the import for whatever reason (e.g. new environment):

```sh
export FIREBASE_PROJECT=ngp-odyssey-testing
export GOOGLE_APPLICATION_CREDENTIALS=/home/bramford/Documents/git/github/newgameplus/odyssey-scratch/firebase-functions-backend@$FIREBASE_PROJECT.iam.gserviceaccount.com.json
./src/scripts/firestore-bigquery-import
```

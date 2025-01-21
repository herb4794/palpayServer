import admin from 'firebase-admin';
const sdk = require("./sdk.json")

export const adminApp = admin.initializeApp({
  credential: admin.credential.cert(sdk),
  databaseURL: "https://schoolapp-c2f68-default-rtdb.firebaseio.com"
  
})


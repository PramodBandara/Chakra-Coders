import { readFileSync } from "node:fs";

const emailFlag = process.argv.indexOf("--email");
const roleFlag = process.argv.indexOf("--role");
const email = emailFlag >= 0 ? process.argv[emailFlag + 1] : "";
const role = roleFlag >= 0 ? process.argv[roleFlag + 1] : "";

if (!email || !["admin", "moderator", "student"].includes(role)) {
  console.error("Usage: node scripts/set-role.mjs --email you@gmail.com --role admin|moderator|student");
  process.exit(1);
}

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT;
if (!keyPath) {
  console.error("Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service account JSON file.");
  process.exit(1);
}

let adminApp;
let adminAuth;
let adminFirestore;
try {
  adminApp = await import("firebase-admin/app");
  adminAuth = await import("firebase-admin/auth");
  adminFirestore = await import("firebase-admin/firestore");
} catch {
  console.error("Install the admin SDK first: npm install --save-dev firebase-admin");
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
adminApp.initializeApp({ credential: adminApp.cert(serviceAccount) });

const auth = adminAuth.getAuth();
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, role === "student" ? {} : { role });

const userRef = adminFirestore.getFirestore().doc(`users/${user.uid}`);
const snapshot = await userRef.get();
if (snapshot.exists) {
  await userRef.set({ role }, { merge: true });
} else {
  console.log("No users profile yet. Ask them to sign in once, then run this command again to store the role string.");
}

console.log(`${email} is now ${role}. They must sign out and back in before the new claim is used.`);

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { repository } from "./steam-repository.js";
import { createHandler } from "./steam-handler.js";
initializeApp();
const key = defineSecret("STEAM_WEB_API_KEY");
export const steamApi = onRequest(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 30,
    maxInstances: 2,
    minInstances: 0,
    secrets: [key],
  },
  createHandler({
    auth: getAuth(),
    repo: repository(getFirestore()),
    steamKey: () => key.value(),
  }),
);

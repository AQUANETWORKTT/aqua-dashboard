import webPush from "web-push";

const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
const email = process.env.WEB_PUSH_EMAIL;

if (publicKey && privateKey && email) {
  webPush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
}

export function getWebPush() {
  if (!publicKey || !privateKey || !email) {
    throw new Error("Missing WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY or WEB_PUSH_EMAIL");
  }

  return webPush;
}

export function getPublicVapidKey() {
  if (!publicKey) {
    throw new Error("Missing WEB_PUSH_PUBLIC_KEY");
  }

  return publicKey;
}
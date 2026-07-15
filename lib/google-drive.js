import crypto from "node:crypto";

const SESSION_COOKIE = "sarye_google_session";
const STATE_COOKIE = "sarye_google_oauth_state";
const FOLDER_NAME = "가계도 대상자";
const FOLDER_MIME = "application/vnd.google-apps.folder";

function config() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || "",
    sessionSecret: process.env.GOOGLE_SESSION_SECRET || "",
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || ""
  };
}

export function isConfigured() {
  const value = config();
  return Boolean(value.clientId && value.clientSecret && value.redirectUri && value.sessionSecret);
}

function key() {
  return crypto.createHash("sha256").update(config().sessionSecret).digest();
}

function encode(value) {
  return Buffer.from(value).toString("base64url");
}

function decode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [encode(iv), encode(cipher.getAuthTag()), encode(ciphertext)].join(".");
}

function decrypt(value) {
  try {
    const [ivValue, tagValue, ciphertextValue] = String(value || "").split(".");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, "base64url")),
      decipher.final()
    ]).toString("utf8");
    return JSON.parse(plaintext);
  } catch {
    return null;
  }
}

function cookies(request) {
  return String(request.headers.cookie || "").split(";").reduce((result, part) => {
    const separator = part.indexOf("=");
    if (separator < 0) return result;
    result[part.slice(0, separator).trim()] = decodeURIComponent(part.slice(separator + 1).trim());
    return result;
  }, {});
}

export function getGoogleSession(request) {
  if (!isConfigured()) return null;
  return decrypt(cookies(request)[SESSION_COOKIE]);
}

export function sessionCookie(session, maxAge = 60 * 60 * 24 * 30) {
  return `${SESSION_COOKIE}=${encodeURIComponent(encrypt(session))}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax; Secure`;
}

export function clearGoogleCookies() {
  return [
    `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure`,
    `${STATE_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure`
  ];
}

export function stateCookie(state) {
  return `${STATE_COOKIE}=${encodeURIComponent(state)}; Max-Age=600; Path=/; HttpOnly; SameSite=Lax; Secure`;
}

export function getState(request) {
  return cookies(request)[STATE_COOKIE] || "";
}

export function oauthConfig() {
  return config();
}

export function safeReturnTo(value) {
  const target = String(value || "/genogram");
  return target.startsWith("/") && !target.startsWith("//") ? target : "/genogram";
}

export async function refreshDriveSession(session) {
  if (!session?.refreshToken) throw new Error("Google Drive 연결이 필요합니다.");
  if (session.accessToken && Number(session.expiresAt || 0) > Date.now() + 60_000) {
    return { session, accessToken: session.accessToken, refreshed: false };
  }

  const value = config();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: value.clientId,
      client_secret: value.clientSecret,
      refresh_token: session.refreshToken,
      grant_type: "refresh_token"
    })
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error("Google Drive 인증이 만료되었습니다. 다시 연결해 주세요.");
  }
  const nextSession = {
    ...session,
    accessToken: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000
  };
  return { session: nextSession, accessToken: payload.access_token, refreshed: true };
}

async function driveRequest(accessToken, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Drive 요청 실패 (${response.status}): ${body.slice(0, 240)}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function driveJson(accessToken, method, url, body) {
  return driveRequest(accessToken, url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

export async function driveMultipart(accessToken, method, url, metadata, content) {
  const boundary = `sarye_${crypto.randomBytes(12).toString("hex")}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(content),
    `--${boundary}--`,
    ""
  ].join("\r\n");
  return driveRequest(accessToken, url, {
    method,
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body
  });
}

export async function ensureFolder(session, accessToken) {
  if (session.folderId || config().folderId) {
    return { session: { ...session, folderId: session.folderId || config().folderId }, folderId: session.folderId || config().folderId };
  }
  const params = new URLSearchParams({
    q: `mimeType = '${FOLDER_MIME}' and name = '${FOLDER_NAME}' and trashed = false`,
    spaces: "drive",
    pageSize: "10",
    fields: "files(id,name,appProperties)"
  });
  const found = await driveJson(accessToken, "GET", `https://www.googleapis.com/drive/v3/files?${params}`);
  const existing = (found.files || []).find((item) => item.appProperties?.saryeGenogramFolder === "true") || found.files?.[0];
  if (existing) return { session: { ...session, folderId: existing.id }, folderId: existing.id };

  const created = await driveJson(accessToken, "POST", "https://www.googleapis.com/drive/v3/files?fields=id,name,appProperties", {
    name: FOLDER_NAME,
    mimeType: FOLDER_MIME,
    appProperties: { saryeGenogramFolder: "true" }
  });
  return { session: { ...session, folderId: created.id }, folderId: created.id };
}

export async function driveFiles(session, accessToken, folderId) {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false and appProperties has { key='saryeGenogram' and value='true' }`,
    spaces: "drive",
    pageSize: "100",
    orderBy: "modifiedTime desc",
    fields: "files(id,name,modifiedTime,appProperties,size)"
  });
  return driveJson(accessToken, "GET", `https://www.googleapis.com/drive/v3/files?${params}`);
}

export async function readDriveFile(accessToken, id) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error("저장된 대상자 자료를 읽지 못했습니다.");
  return response.json();
}

export { SESSION_COOKIE, STATE_COOKIE };

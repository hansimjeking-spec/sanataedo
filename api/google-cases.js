import {
  driveFiles,
  driveJson,
  driveMultipart,
  ensureFolder,
  getGoogleSession,
  isConfigured,
  readDriveFile,
  refreshDriveSession,
  sessionCookie
} from "../lib/google-drive.js";

function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  const protocol = request.headers["x-forwarded-proto"] || "https";
  return origin === `${protocol}://${host}`;
}

function cleanName(value) {
  return String(value || "이름 미상")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim()
    .slice(0, 80) || "이름 미상";
}

function responseCase(file, data) {
  return {
    id: file.id,
    subjectName: file.appProperties?.subjectName || file.name.replace(/\.json$/i, ""),
    updatedAt: file.modifiedTime || "",
    data
  };
}

async function context(request, response) {
  if (!isConfigured()) throw new Error("Google Drive 연동 설정이 필요합니다.");
  const stored = getGoogleSession(request);
  if (!stored?.refreshToken) throw new Error("Google Drive 연결이 필요합니다.");
  const token = await refreshDriveSession(stored);
  const folder = await ensureFolder(token.session, token.accessToken);
  const nextSession = folder.session;
  if (token.refreshed || nextSession.folderId !== stored.folderId) {
    response.setHeader("Set-Cookie", sessionCookie(nextSession));
  }
  return { accessToken: token.accessToken, session: nextSession, folderId: folder.folderId };
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (!sameOrigin(request)) return response.status(403).json({ error: "요청 출처를 확인할 수 없습니다." });
  if (!["GET", "POST", "DELETE"].includes(request.method)) {
    response.setHeader("Allow", "GET, POST, DELETE");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const drive = await context(request, response);
    if (request.method === "GET") {
      const id = new URL(request.url, "https://gagyedo-ecomap.vercel.app").searchParams.get("id");
      if (id) {
        const file = await driveJson(
          drive.accessToken,
          "GET",
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=id,name,modifiedTime,appProperties&supportsAllDrives=true`
        );
        const data = await readDriveFile(drive.accessToken, id);
        return response.status(200).json(responseCase(file, data.data || data));
      }
      const listing = await driveFiles(drive.session, drive.accessToken, drive.folderId);
      return response.status(200).json({
        files: (listing.files || []).map((file) => ({
          id: file.id,
          subjectName: file.appProperties?.subjectName || file.name.replace(/\.json$/i, ""),
          updatedAt: file.modifiedTime || ""
        }))
      });
    }

    const url = new URL(request.url, "https://gagyedo-ecomap.vercel.app");
    const id = url.searchParams.get("id") || request.body?.id || "";
    if (request.method === "DELETE") {
      if (!id) return response.status(400).json({ error: "삭제할 대상자를 선택해 주세요." });
      await driveJson(
        drive.accessToken,
        "DELETE",
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?supportsAllDrives=true`
      );
      return response.status(200).json({ ok: true });
    }

    const payload = request.body || {};
    if (!payload.data || typeof payload.data !== "object") {
      return response.status(400).json({ error: "저장할 가계도 자료가 없습니다." });
    }
    const subjectName = cleanName(payload.subjectName || payload.data.people?.find((person) => person.role === "client")?.name);
    const fileMetadata = {
      name: `${subjectName}.json`,
      mimeType: "application/json",
      appProperties: { saryeGenogram: "true", subjectName }
    };
    const fileData = {
      schema: 1,
      subjectName,
      savedAt: new Date().toISOString(),
      data: payload.data
    };
    let file;
    if (id) {
      file = await driveMultipart(
        drive.accessToken,
        "PATCH",
        `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(id)}?uploadType=multipart&fields=id,name,modifiedTime,appProperties&supportsAllDrives=true`,
        fileMetadata,
        fileData
      );
    } else {
      file = await driveMultipart(
        drive.accessToken,
        "POST",
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,appProperties&supportsAllDrives=true",
        { ...fileMetadata, parents: [drive.folderId] },
        fileData
      );
    }
    return response.status(200).json(responseCase(file, payload.data));
  } catch (error) {
    const message = error?.message || "Google Drive 저장 중 오류가 발생했습니다.";
    const status = /연결이 필요|인증이 만료|설정이 필요/.test(message) ? 401 : 500;
    return response.status(status).json({ error: message });
  }
}

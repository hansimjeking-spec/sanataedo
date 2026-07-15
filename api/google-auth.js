import crypto from "node:crypto";
import {
  clearGoogleCookies,
  getGoogleSession,
  getState,
  isConfigured,
  oauthConfig,
  safeReturnTo,
  sessionCookie,
  stateCookie
} from "../lib/google-drive.js";

const RETURN_COOKIE = "sarye_google_return";

function redirect(response, location, cookies = []) {
  response.setHeader("Cache-Control", "no-store");
  if (cookies.length) response.setHeader("Set-Cookie", cookies);
  response.writeHead(302, { Location: location });
  response.end();
}

function returnCookie(value) {
  return `${RETURN_COOKIE}=${encodeURIComponent(value)}; Max-Age=600; Path=/; HttpOnly; SameSite=Lax; Secure`;
}

function readCookie(request, name) {
  return String(request.headers.cookie || "").split(";").reduce((result, part) => {
    const separator = part.indexOf("=");
    if (separator < 0) return result;
    const key = part.slice(0, separator).trim();
    if (key === name) result = decodeURIComponent(part.slice(separator + 1).trim());
    return result;
  }, "");
}

function clearReturnCookie() {
  return `${RETURN_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure`;
}

function errorLocation(returnTo, code) {
  return `${safeReturnTo(returnTo)}?google=${encodeURIComponent(code)}`;
}

export default async function handler(request, response) {
  const url = new URL(request.url, "https://gagyedo-ecomap.vercel.app");
  const action = url.searchParams.get("action") || "status";
  const returnTo = safeReturnTo(url.searchParams.get("returnTo") || "/genogram");
  response.setHeader("Cache-Control", "no-store");

  if (action === "status") {
    const session = getGoogleSession(request);
    return response.status(200).json({
      configured: isConfigured(),
      connected: Boolean(session?.refreshToken)
    });
  }

  if (!isConfigured()) {
    return redirect(response, errorLocation(returnTo, "unconfigured"));
  }

  if (action === "logout") {
    return redirect(response, `${returnTo}?google=disconnected`, clearGoogleCookies().concat(clearReturnCookie()));
  }

  if (action === "login") {
    const value = oauthConfig();
    const state = crypto.randomBytes(24).toString("hex");
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", value.clientId);
    authUrl.searchParams.set("redirect_uri", value.redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email https://www.googleapis.com/auth/drive.file");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("include_granted_scopes", "true");
    authUrl.searchParams.set("state", state);
    return redirect(response, authUrl.toString(), [stateCookie(state), returnCookie(returnTo)]);
  }

  if (action === "callback") {
    const savedState = getState(request);
    const returnedState = url.searchParams.get("state") || "";
    const callbackReturnTo = safeReturnTo(readCookie(request, RETURN_COOKIE));
    if (!savedState || !returnedState || savedState !== returnedState) {
      return redirect(response, errorLocation(callbackReturnTo, "state"), clearGoogleCookies().concat(clearReturnCookie()));
    }
    if (url.searchParams.get("error")) {
      return redirect(response, errorLocation(callbackReturnTo, "cancelled"), clearGoogleCookies().concat(clearReturnCookie()));
    }

    try {
      const value = oauthConfig();
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: url.searchParams.get("code") || "",
          client_id: value.clientId,
          client_secret: value.clientSecret,
          redirect_uri: value.redirectUri,
          grant_type: "authorization_code"
        })
      });
      const token = await tokenResponse.json();
      if (!tokenResponse.ok || !token.access_token) throw new Error("token_exchange_failed");

      const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${token.access_token}` }
      });
      const user = await userResponse.json();
      const previous = getGoogleSession(request);
      const session = {
        refreshToken: token.refresh_token || previous?.refreshToken || "",
        accessToken: token.access_token,
        expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000,
        email: user.email || previous?.email || "",
        folderId: value.folderId || previous?.folderId || ""
      };
      if (!session.refreshToken) throw new Error("refresh_token_missing");
      return redirect(response, `${callbackReturnTo}?google=connected`, [
        sessionCookie(session),
        ...clearGoogleCookies().filter((cookie) => cookie.startsWith("sarye_google_oauth_state=")),
        clearReturnCookie()
      ]);
    } catch (error) {
      return redirect(response, errorLocation(callbackReturnTo, error.message || "failed"), clearGoogleCookies().concat(clearReturnCookie()));
    }
  }

  return response.status(404).json({ error: "Not found" });
}

/**
 * Google Sheets OAuth + API helper (client-side only).
 *
 * Setup:
 *  1. Create a project at https://console.cloud.google.com
 *  2. Enable the Google Sheets API
 *  3. Create an OAuth 2.0 "Web application" credential
 *  4. Add your domain (and http://localhost:3000) to Authorized JavaScript Origins
 *  5. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your .env.local
 */

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

/* ─── Token cache ────────────────────────────────────────── */
let cachedToken: string | null = null;
let tokenExpiry = 0;

function clearToken() {
  cachedToken = null;
  tokenExpiry = 0;
}

/** Opens a Google OAuth popup and resolves with an access token. */
export function getGoogleAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return Promise.resolve(cachedToken);
  }

  if (!CLIENT_ID) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Add it to your .env.local file.")
    );
  }

  return new Promise((resolve, reject) => {
    const redirectUri = window.location.origin;
    const state = Math.random().toString(36).slice(2);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "token",
      scope: SCOPES,
      state,
      prompt: "select_account",
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    const w = 520;
    const h = 620;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;

    const popup = window.open(
      url,
      "google-auth",
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`
    );

    if (!popup) {
      reject(new Error("Popup blocked. Please allow popups for this site."));
      return;
    }

    const interval = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(interval);
          reject(new Error("Auth popup was closed."));
          return;
        }

        const href = popup.location.href;
        if (!href.startsWith(redirectUri)) return;

        // Google returns the token in the hash fragment
        const hash = new URLSearchParams(popup.location.hash.slice(1));
        const token = hash.get("access_token");
        const expiresIn = parseInt(hash.get("expires_in") ?? "3600", 10);

        if (token) {
          cachedToken = token;
          tokenExpiry = Date.now() + expiresIn * 1000 - 60_000; // 1 min buffer
          popup.close();
          clearInterval(interval);
          resolve(token);
        }
      } catch {
        // Cross-origin errors while Google is in the popup — ignore until redirect
      }
    }, 300);

    // Timeout after 3 min
    setTimeout(() => {
      clearInterval(interval);
      if (!popup.closed) popup.close();
      reject(new Error("Auth timed out. Please try again."));
    }, 180_000);
  });
}

/* ─── Row type ───────────────────────────────────────────── */
export type SheetRow = (string | number)[];

/**
 * Creates a new Google Spreadsheet with the given name and rows.
 * Returns the URL of the new spreadsheet.
 */
export async function createGoogleSpreadsheet(
  title: string,
  headers: string[],
  rows: SheetRow[]
): Promise<string> {
  const token = await getGoogleAccessToken();

  // Build the spreadsheet body with the data inline
  const values: SheetRow[] = [headers, ...rows];

  const body = {
    properties: { title },
    sheets: [
      {
        properties: { title: "Issues", sheetId: 0 },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: values.map((row) => ({
              values: row.map((cell) => ({
                userEnteredValue:
                  typeof cell === "number"
                    ? { numberValue: cell }
                    : { stringValue: String(cell ?? "") },
              })),
            })),
          },
        ],
      },
    ],
  };

  const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // Token might be stale
    if (res.status === 401) clearToken();
    throw new Error(err?.error?.message ?? `Sheets API error ${res.status}`);
  }

  const data = await res.json();
  return `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`;
}

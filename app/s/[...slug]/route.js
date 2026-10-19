export const runtime = "nodejs";

import { NextResponse } from "next/server";

export function parseShortUrlSlug(slugArray, searchParams) {
  if (!slugArray || slugArray.length === 0) {
    return { meetupId: null, date: null, pwd: null };
  }

  let meetupId = null;
  let dateRaw = null;
  let pwd = searchParams.get("pwd") || searchParams.get("p") || null;

  if (slugArray.length >= 2) {
    // e.g. /s/58/20261019 or /s/58/20261019/secret
    meetupId = slugArray[0];
    dateRaw = slugArray[1];
    if (slugArray[2] && !pwd) {
      pwd = decodeURIComponent(slugArray[2]);
    }
  } else {
    // Single slug: e.g. /s/58_20261019 or /s/58_20261019_secret
    let raw = slugArray[0];

    // Check if base64url encoded
    if (!raw.includes("_") && !raw.includes("-") && raw.length > 10) {
      try {
        const decoded = Buffer.from(raw, "base64url").toString("utf-8");
        if (decoded.includes("_") || decoded.includes("-")) {
          raw = decoded;
        }
      } catch (_) {}
    }

    let parts = raw.split("_");
    if (parts.length === 1 && raw.includes("-")) {
      const lastDash = raw.lastIndexOf("-");
      const potentialDate = raw.slice(lastDash + 1);
      if (/^\d{8}$/.test(potentialDate) || /^\d{4}$/.test(potentialDate)) {
        parts = [raw.slice(0, lastDash), potentialDate];
      }
    }

    meetupId = parts[0];
    dateRaw = parts[1] || "";
    if (parts[2] && !pwd) {
      pwd = decodeURIComponent(parts[2]);
    }
  }

  // Format date to YYYY-MM-DD
  let formattedDate = "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    formattedDate = dateRaw;
  } else if (/^\d{8}$/.test(dateRaw)) {
    // YYYYMMDD -> YYYY-MM-DD
    formattedDate = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`;
  } else if (/^\d{6}$/.test(dateRaw)) {
    // YYMMDD -> 20YY-MM-DD
    formattedDate = `20${dateRaw.slice(0, 2)}-${dateRaw.slice(2, 4)}-${dateRaw.slice(4, 6)}`;
  } else if (/^\d{4}$/.test(dateRaw)) {
    // MMDD -> YYYY-MM-DD
    const curYear = new Date().getFullYear();
    formattedDate = `${curYear}-${dateRaw.slice(0, 2)}-${dateRaw.slice(2, 4)}`;
  }

  return { meetupId, date: formattedDate, pwd };
}

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const slugArray = resolvedParams?.slug || [];
  const { searchParams } = new URL(request.url);

  const { meetupId, date, pwd } = parseShortUrlSlug(slugArray, searchParams);

  const redirectUrl = new URL("/", request.url);
  if (date) redirectUrl.searchParams.set("date", date);
  if (meetupId) redirectUrl.searchParams.set("meetup_id", meetupId);
  if (pwd) redirectUrl.searchParams.set("pwd", pwd);

  return NextResponse.redirect(redirectUrl, 307);
}

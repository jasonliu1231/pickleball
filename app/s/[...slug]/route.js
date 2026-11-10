export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabase, getSupabaseAdmin } from "@/lib/supabase";

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

  const { meetupId, date } = parseShortUrlSlug(slugArray, searchParams);

  const redirectUrl = new URL("/", request.url);
  if (date) redirectUrl.searchParams.set("date", date);
  if (meetupId) redirectUrl.searchParams.set("meetup_id", meetupId);

  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const isCrawler = /line|facebookexternalhit|facebot|twitterbot|slackbot|whatsapp|telegrambot|discordbot|applebot/i.test(ua);

  if (isCrawler && meetupId) {
    try {
      const client = getSupabaseAdmin() || supabase;
      const isNumericId = /^\d+$/.test(String(meetupId));
      const query = client
        .from("meetups")
        .select("id, short_id, name, city, address, street_address, start_time, end_time, capacity, guest_fee, gear");
      const { data: m } = isNumericId
        ? await query.eq("short_id", Number(meetupId)).maybeSingle()
        : await query.eq("id", String(meetupId)).maybeSingle();

      if (m) {
        let dateLabel = date || "";
        if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
          const [y, mo, dy] = date.split("-").map(Number);
          const dObj = new Date(y, (mo || 1) - 1, dy || 1);
          const wDay = ["日", "一", "二", "三", "四", "五", "六"][dObj.getDay()];
          dateLabel = `${mo}/${dy}（${wDay}）`;
        }
        const sTime = m.start_time ? String(m.start_time).slice(0, 5) : "";
        const eTime = m.end_time ? String(m.end_time).slice(0, 5) : "";
        const timeLabel = sTime && eTime ? `${sTime}–${eTime}` : sTime;

        const city = String(m.city || "").trim();
        const venue = String(m.address || "").trim();
        const street = String(m.street_address || "").trim();
        let locationLabel = "地點另行公告";
        if (venue && venue !== "地點另行公告" && street && street !== venue) {
          const fullStreet = (city && !street.includes(city) && !street.includes(city.replace("台", "臺")))
            ? `${city}${street}`
            : street;
          locationLabel = `${venue}｜${fullStreet}`;
        } else if (venue && venue !== "地點另行公告") {
          locationLabel = (city && !venue.includes(city) && !venue.includes(city.replace("台", "臺")))
            ? `${city}${venue}`
            : venue;
        } else if (street) {
          locationLabel = (city && !street.includes(city) && !street.includes(city.replace("台", "臺")))
            ? `${city}${street}`
            : street;
        }

        const cap = Number(m.capacity || 0);
        const capLabel = cap > 0 ? `${cap} 人` : "不限人數";
        const gFee = m.guest_fee;
        let feeLabel = "現場公告";
        if (gFee !== null && gFee !== undefined && String(gFee).trim() !== "") {
          const str = String(gFee).trim();
          const num = Number(str);
          if (str === "-1" || str.includes("平分")) feeLabel = "場租平分";
          else if (!Number.isNaN(num)) feeLabel = num === 0 ? "免費" : `$${num}／人`;
          else feeLabel = `${str}／人`;
        } else {
          feeLabel = "場租平分";
        }

        let acDesc = "";
        const acMt = String(m.gear || "").match(/AUTO_CANCEL:(\d+(?:\.\d+)?):(\d+)/);
        if (acMt && m.start_time && date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
          const acHours = Number(acMt[1]);
          const acMin = Math.floor(Number(acMt[2]));
          if (acHours > 0 && acMin > 0) {
            const [yr, mo, dy] = date.split("-").map(Number);
            const [sh, sm] = String(m.start_time).slice(0, 5).split(":").map(Number);
            const gStart = new Date(yr, (mo || 1) - 1, dy || 1, sh || 0, sm || 0, 0, 0);
            const dl = new Date(gStart.getTime() - acHours * 3600 * 1000);
            const dH = String(dl.getHours()).padStart(2, "0");
            const dM = String(dl.getMinutes()).padStart(2, "0");
            const sameDay = dl.getFullYear() === gStart.getFullYear() && dl.getMonth() === gStart.getMonth() && dl.getDate() === gStart.getDate();
            const dlText = sameDay ? `${dH}:${dM}` : `${dl.getMonth() + 1}/${dl.getDate()} ${dH}:${dM}`;
            acDesc = ` · ⏳ ${dlText} 截止（滿 ${acMin} 人成團）`;
          }
        }

        const ogTitle = `🏓 ${m.name || "匹克球活動"}｜📅 ${dateLabel}${timeLabel}`;
        const ogDesc = `📍 ${locationLabel} · 👥 ${capLabel}｜💰 ${feeLabel}${acDesc}`;
        const targetHref = redirectUrl.toString();

        const html = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(ogTitle)}</title>
  <meta name="description" content="${escapeHtml(ogDesc)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="匹克球同樂會" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDesc)}" />
  <meta property="og:url" content="${escapeHtml(request.url)}" />
  <meta property="og:image" content="https://pickleball.jason1231.com/icon.png" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(targetHref)}" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(targetHref)});</script>
</body>
</html>`;
        return new NextResponse(html, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
    } catch (_) {}
  }

  return NextResponse.redirect(redirectUrl, 307);
}

const username = "ayushkr063";
const end = new Date();
end.setUTCHours(0, 0, 0, 0);
const start = new Date(end);
start.setUTCDate(start.getUTCDate() - 364);
const iso = (date) => date.toISOString().slice(0, 10);
const from = iso(start);
const to = iso(end);
const url = "https://github.com/users/" + username + "/contributions?from=" + from + "&to=" + to;

const response = await fetch(url, {
  headers: { "User-Agent": "github-profile-contribution-dashboard" },
});
if (!response.ok) {
  throw new Error("Could not fetch the public contribution calendar: HTTP " + response.status);
}
const html = await response.text();
const tags = html.match(/<(?:rect|td)\b[^>]*>/g) || [];
const contributions = new Map();
for (const tag of tags) {
  const dateMatch = tag.match(/\bdata-date="(\d{4}-\d{2}-\d{2})"/);
  const levelMatch = tag.match(/\bdata-level="(\d)"/);
  if (dateMatch && levelMatch) contributions.set(dateMatch[1], Number(levelMatch[1]));
}
if (contributions.size < 300) {
  throw new Error("Contribution calendar data was missing or incomplete.");
}

const day = (value) => new Date(value + "T00:00:00.000Z");
const addDays = (value, count) => {
  const result = day(value);
  result.setUTCDate(result.getUTCDate() + count);
  return iso(result);
};

let longest = 0;
let run = 0;
for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
  if ((contributions.get(cursor) || 0) > 0) {
    run += 1;
    longest = Math.max(longest, run);
  } else {
    run = 0;
  }
}

let current = 0;
let cursor = (contributions.get(to) || 0) > 0 ? to : addDays(to, -1);
if ((contributions.get(cursor) || 0) > 0) {
  while ((contributions.get(cursor) || 0) > 0) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
}

const firstSunday = day(from);
firstSunday.setUTCDate(firstSunday.getUTCDate() - firstSunday.getUTCDay());
const weekCount = Math.floor((day(to).getTime() - firstSunday.getTime()) / (7 * 86400000)) + 1;
const weekly = Array(weekCount).fill(0);
const months = [];
for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
  const date = day(cursor);
  const offset = Math.floor((date.getTime() - firstSunday.getTime()) / 86400000);
  const week = Math.floor(offset / 7);
  weekly[week] += contributions.get(cursor) || 0;
  if (date.getUTCDate() === 1) {
    months.push({ week, label: date.toLocaleString("en", { month: "short", timeZone: "UTC" }) });
  }
}

const axisMax = Math.max(4, Math.ceil(Math.max(...weekly) / 4) * 4);
const plotLeft = 82;
const plotTop = 218;
const plotWidth = 980;
const plotHeight = 112;
const x = (index) => plotLeft + index * plotWidth / Math.max(1, weekly.length - 1);
const y = (value) => plotTop + plotHeight - value * plotHeight / axisMax;
const linePath = weekly.map((value, index) => (index ? "L" : "M") + x(index).toFixed(1) + " " + y(value).toFixed(1)).join(" ");
const areaPath = linePath + " L " + x(weekly.length - 1).toFixed(1) + " " + (plotTop + plotHeight) + " L " + plotLeft + " " + (plotTop + plotHeight) + " Z";
const ticks = Array.from({ length: 5 }, (_, index) => Math.round(axisMax * index / 4));
const grid = ticks.map((tick) => {
  const yPos = y(tick).toFixed(1);
  return '<line x1="' + plotLeft + '" y1="' + yPos + '" x2="' + (plotLeft + plotWidth) + '" y2="' + yPos + '" stroke="#30445D" stroke-width="1"/>' +
    '<text x="68" y="' + (Number(yPos) + 4) + '" text-anchor="end" fill="#9BB0C7" font-size="11">' + tick + '</text>';
}).join("");
const monthLabels = months.map((month) =>
  '<text x="' + x(month.week).toFixed(1) + '" y="352" fill="#9BB0C7" font-size="11">' + month.label + '</text>'
).join("");
const points = weekly.map((value, index) =>
  '<circle cx="' + x(index).toFixed(1) + '" cy="' + y(value).toFixed(1) + '" r="2.4" fill="#42D9FF"><title>Week ' + (index + 1) + ': activity score ' + value + '</title></circle>'
).join("");
const currentText = current === 1 ? "1 day" : current + " days";
const longestText = longest === 1 ? "1 day" : longest + " days";

const svg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="410" viewBox="0 0 1120 410" role="img" aria-labelledby="title desc">',
  '<title id="title">GitHub activity, contribution streaks, and weekly activity graph</title>',
  '<desc id="desc">Current streak ' + currentText + ', longest streak ' + longestText + ' in the last 12 months, and a weekly graph of GitHub contribution intensity.</desc>',
  '<defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#42D9FF" stop-opacity=".28"/><stop offset="1" stop-color="#42D9FF" stop-opacity=".015"/></linearGradient></defs>',
  '<rect x="1" y="1" width="1118" height="408" rx="16" fill="#0D1117" stroke="#30445D"/>',
  '<text x="28" y="36" fill="#E8F3FF" font-family="Arial, sans-serif" font-size="24" font-weight="700">GitHub activity</text>',
  '<text x="1090" y="32" text-anchor="end" fill="#9BB0C7" font-family="Arial, sans-serif" font-size="11" letter-spacing="1">AYUSH / ACTIVITY · UPDATED DAILY</text>',
  '<rect x="20" y="54" width="1080" height="92" rx="14" fill="#111B2B" stroke="#30445D"/>',
  '<line x1="270" y1="70" x2="270" y2="130" stroke="#30445D"/>',
  '<line x1="520" y1="70" x2="520" y2="130" stroke="#30445D"/>',
  '<line x1="770" y1="70" x2="770" y2="130" stroke="#30445D"/>',
  '<text x="42" y="82" fill="#9BB0C7" font-family="Arial, sans-serif" font-size="11" letter-spacing=".7">CURRENT STREAK</text>',
  '<text x="42" y="118" fill="#42D9FF" font-family="Arial, sans-serif" font-size="25" font-weight="700">' + currentText + '</text>',
  '<text x="292" y="82" fill="#9BB0C7" font-family="Arial, sans-serif" font-size="11" letter-spacing=".7">LONGEST · LAST 12 MONTHS</text>',
  '<text x="292" y="118" fill="#B9A9FF" font-family="Arial, sans-serif" font-size="25" font-weight="700">' + longestText + '</text>',
  '<text x="542" y="82" fill="#9BB0C7" font-family="Arial, sans-serif" font-size="11" letter-spacing=".7">PUBLIC REPOSITORIES</text>',
  '<text x="542" y="118" fill="#E8F3FF" font-family="Arial, sans-serif" font-size="25" font-weight="700">6</text>',
  '<text x="792" y="82" fill="#9BB0C7" font-family="Arial, sans-serif" font-size="11" letter-spacing=".7">LANGUAGE FOCUS</text>',
  '<text x="792" y="113" fill="#E8F3FF" font-family="Arial, sans-serif" font-size="15" font-weight="600">Java</text>',
  '<rect x="20" y="158" width="1080" height="234" rx="14" fill="#111B2B" stroke="#30445D"/>',
  '<text x="42" y="188" fill="#E8F3FF" font-family="Arial, sans-serif" font-size="15" font-weight="600">Contribution activity</text>',
  '<text x="1078" y="188" text-anchor="end" fill="#9BB0C7" font-family="Arial, sans-serif" font-size="11">LAST 12 MONTHS · WEEKLY</text>',
  '<text x="82" y="207" fill="#9BB0C7" font-family="Arial, sans-serif" font-size="10">WEEKLY INTENSITY SCORE</text>',
  grid,
  '<path d="' + areaPath + '" fill="url(#activityFill)"/>',
  '<path d="' + linePath + '" fill="none" stroke="#42D9FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  points,
  monthLabels,
  '<text x="572" y="371" text-anchor="middle" fill="#9BB0C7" font-family="Arial, sans-serif" font-size="10">MONTH · LAST 12 MONTHS</text>',
  '<text x="42" y="378" fill="#7187A0" font-family="Arial, sans-serif" font-size="10">Score = sum of GitHub daily contribution levels (0–4); not a raw commit count.</text>',
  '</svg>',
].join("");

await import("node:fs/promises").then(({ mkdir, writeFile }) => mkdir("dist", { recursive: true }).then(() => writeFile("dist/contribution-activity-java-v2.svg", svg)));

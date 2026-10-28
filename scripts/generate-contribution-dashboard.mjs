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

const colors = ["#152131", "#15384A", "#165A72", "#1983A2", "#42D9FF"];
const firstSunday = day(from);
firstSunday.setUTCDate(firstSunday.getUTCDate() - firstSunday.getUTCDay());
const cells = [];
const labels = [];
for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
  const date = day(cursor);
  const offset = Math.round((date.getTime() - firstSunday.getTime()) / 86400000);
  const column = Math.floor(offset / 7);
  const row = date.getUTCDay();
  const level = contributions.get(cursor) || 0;
  const x = 250 + column * 16;
  const y = 82 + row * 16;
  cells.push('<rect x="' + x + '" y="' + y + '" width="12" height="12" rx="3" fill="' + colors[level] + '"><title>' + cursor + ': contribution level ' + level + '</title></rect>');
  if (date.getUTCDate() === 1) {
    labels.push('<text x="' + x + '" y="69" fill="#8FA6BF" font-size="11">' + date.toLocaleString("en", { month: "short", timeZone: "UTC" }) + '</text>');
  }
}

const svg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="220" viewBox="0 0 1120 220" role="img" aria-labelledby="title desc">',
  '<title id="title">GitHub contribution calendar and streaks</title>',
  '<desc id="desc">A year of contribution activity with current and longest contribution streaks.</desc>',
  '<rect x="1" y="1" width="1118" height="218" rx="16" fill="#0B1220" stroke="#30445D"/>',
  '<text x="28" y="36" fill="#E8F3FF" font-family="Arial, sans-serif" font-size="16" font-weight="700">CONTRIBUTION SIGNAL</text>',
  '<text x="28" y="86" fill="#8FA6BF" font-family="Arial, sans-serif" font-size="12">CURRENT STREAK</text>',
  '<text x="28" y="120" fill="#42D9FF" font-family="Arial, sans-serif" font-size="28" font-weight="700">' + current + ' days</text>',
  '<text x="28" y="158" fill="#8FA6BF" font-family="Arial, sans-serif" font-size="12">LONGEST · LAST 12 MONTHS</text>',
  '<text x="28" y="190" fill="#B9A9FF" font-family="Arial, sans-serif" font-size="24" font-weight="700">' + longest + ' days</text>',
  '<text x="250" y="36" fill="#E8F3FF" font-family="Arial, sans-serif" font-size="14" font-weight="600">LAST 12 MONTHS</text>',
  labels.join(""),
  cells.join(""),
  '<text x="1088" y="205" text-anchor="end" fill="#7187A0" font-family="Arial, sans-serif" font-size="10">Updated daily from public GitHub contributions</text>',
  '</svg>',
].join("");

await import("node:fs/promises").then(({ mkdir, writeFile }) => mkdir("dist", { recursive: true }).then(() => writeFile("dist/contribution-dashboard.svg", svg)));

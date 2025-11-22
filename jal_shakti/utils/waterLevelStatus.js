// utils/waterLevelStatus.js

// Map current month (1–12) → which reading to show
function getTargetReadingKey() {
  const month = new Date().getMonth() + 1; // 1 = Jan, 12 = Dec

  if (month >= 1 && month <= 3) return "jan";        // Jan–Mar → use January
  if (month >= 4 && month <= 7) return "apr_may";    // Apr–Jul → use Apr–May
  if (month >= 8 && month <= 10) return "aug";       // Aug–Oct → use August
  return "nov";                                      // Nov–Dec → use November
}

// Get the most recent available reading for the current season
function getCurrentWaterLevel(station) {
  const targetKey = getTargetReadingKey();
  const levels = station.historical_water_levels || {};

  // Try latest year first, then go backwards
  const years = Object.keys(levels).map(Number).sort((a, b) => b - a);

  for (const year of years) {
    const yearData = levels[year];
    if (yearData && yearData[targetKey] != null) {
      return {
        depth: parseFloat(yearData[targetKey].toFixed(2)),
        monthKey: targetKey,
        year: year,
        label: formatMonthLabel(targetKey, year)
      };
    }
  }

  // Ultimate fallback: return null if nothing found
  return null;
}

function formatMonthLabel(key, year) {
  const labels = {
    jan: `January ${year}`,
    apr_may: `April–May ${year}`,
    aug: `August ${year}`,
    nov: `November ${year}`
  };
  return labels[key] || `${key} ${year}`;
}

// Your custom status: 0–30 Safe, 31–45 Alert, 46+ Critical
function getStatus(depth) {
  if (depth === null || depth === undefined) {
    return { status: "NO DATA", color: "bg-gray-400", short: "?" };
  }
  if (depth <= 30) return { status: "SAFE", color: "bg-green-500", short: "S" };
  if (depth <= 45) return { status: "ALERT", color: "bg-yellow-500", short: "A" };
  return { status: "CRITICAL", color: "bg-red-600", short: "C" };
}

// MAIN FUNCTION — Now works perfectly with your real data
export function analyzeWaterStatus(stationDoc) {
  const reading = getCurrentWaterLevel(stationDoc);
  const status = getStatus(reading?.depth);

  return {
    currentDepth: reading?.depth || null,
    referencePeriod: reading?.label || "No recent data",
    status: status.status,
    statusColor: status.color,
    statusShort: status.short
  };
}
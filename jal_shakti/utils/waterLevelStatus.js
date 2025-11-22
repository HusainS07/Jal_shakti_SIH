// utils/waterLevelStatus.js  ← REPLACE YOUR ENTIRE FILE WITH THIS

function getTargetReadingKey() {
  const month = new Date().getMonth() + 1;
  if (month >= 1 && month <= 3) return "jan";
  if (month >= 4 && month <= 7) return "apr_may";
  if (month >= 8 && month <= 10) return "aug";
  return "nov";
}

function getCurrentWaterLevel(station) {
  const targetKey = getTargetReadingKey();
  const levels = station.historical_water_levels || {};

  const years = Object.keys(levels)
    .map(Number)
    .sort((a, b) => b - a);

  for (const year of years) {
    const yearData = levels[year];
    if (yearData && yearData[targetKey] != null) {
      return {
        depth: parseFloat(Number(yearData[targetKey]).toFixed(2)),
        label: formatLabel(targetKey, year),
        year,
        monthKey: targetKey
      };
    }
  }
  return null;
}

function formatLabel(key, year) {
  const labels = {
    jan: `January ${year}`,
    apr_may: `April–May ${year}`,
    aug: `August ${year}`,
    nov: `November ${year}`
  };
  return labels[key] || `${key} ${year}`;
}

function getStatus(depth) {
  if (depth === null || depth === undefined || isNaN(depth)) {
    return { status: "NO DATA", color: "bg-gray-400", short: "?" };
  }
  if (depth <= 30) return { status: "SAFE", color: "bg-green-500", short: "S" };
  if (depth <= 45) return { status: "ALERT", color: "bg-yellow-500", short: "A" };
  return { status: "CRITICAL", color: "bg-red-600", short: "C" };
}

export function analyzeWaterStatus(station) {
  // If API already added waterStatus, use it
  if (station.waterStatus && station.waterStatus.currentDepth !== undefined) {
    return station.waterStatus;
  }

  const reading = getCurrentWaterLevel(station);

  if (!reading) {
    return {
      currentDepth: null,
      referencePeriod: "No recent data",
      status: "NO DATA",
      statusColor: "bg-gray-400",
      statusShort: "?"
    };
  }

  const status = getStatus(reading.depth);

  return {
    currentDepth: reading.depth,
    referencePeriod: reading.label,
    status: status.status,
    statusColor: status.color,
    statusShort: status.short
  };
}
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

/**
 * ------------------------------------------------------------------
 * MOCK SENSOR / WEATHER DATA
 * In production, this would be replaced by live feeds from:
 *   - IMD (India Meteorological Department) rainfall API
 *   - CWC (Central Water Commission) river-level API
 *   - Satellite soil-moisture data (Bhuvan / ISRO)
 * For the hackathon demo, we simulate realistic values so the
 * risk-scoring engine and dashboard can be fully demonstrated.
 * ------------------------------------------------------------------
 */

let zones = [
  {
    id: "z1",
    name: "Riverside Colony",
    lat: 16.312,
    lng: 80.427,
    rainfallMM: 182,
    riverLevelM: 8.9,
    riverDangerLevelM: 9.5,
    soilMoisture: 78,
    population: 4200,
  },
  {
    id: "z2",
    name: "Hillview Sector",
    lat: 16.325,
    lng: 80.441,
    rainfallMM: 95,
    riverLevelM: 3.1,
    riverDangerLevelM: 9.5,
    soilMoisture: 91,
    population: 2600,
  },
  {
    id: "z3",
    name: "Old Town Market",
    lat: 16.298,
    lng: 80.402,
    rainfallMM: 40,
    riverLevelM: 4.5,
    riverDangerLevelM: 9.5,
    soilMoisture: 35,
    population: 6100,
  },
  {
    id: "z4",
    name: "Lakeside Township",
    lat: 16.334,
    lng: 80.415,
    rainfallMM: 205,
    riverLevelM: 9.1,
    riverDangerLevelM: 9.5,
    soilMoisture: 88,
    population: 3300,
  },
];

let resources = [
  {
    id: "r1",
    type: "Rescue Boats",
    available: 6,
    location: "Central Depot",
  },
  {
    id: "r2",
    type: "Medical Teams",
    available: 4,
    location: "District Hospital",
  },
  {
    id: "r3",
    type: "Relief Shelters",
    available: 3,
    location: "Municipal Grounds",
  },
  {
    id: "r4",
    type: "Food & Water Kits",
    available: 500,
    location: "Central Warehouse",
  },
];

// Citizen-submitted ground reports
let citizenReports = [
  {
    id: "cr1",
    zoneId: "z1",
    message: "Water entering ground floor near the market lane.",
    reporterName: "Local resident",
    severity: "HIGH",
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
  },
  {
    id: "cr4",
    zoneId: "z4",
    message:
      "Road near the lake bridge is flooded, not passable by car.",
    reporterName: "Local resident",
    severity: "CRITICAL",
    timestamp: new Date(Date.now() - 4 * 60000).toISOString(),
  },
];

// Mock last-6-hour risk history per zone
function generateHistory(currentScore) {
  const points = [];

  let score = Math.max(
    currentScore - Math.floor(Math.random() * 25) - 10,
    5
  );

  for (let i = 6; i >= 0; i--) {
    score = Math.min(
      100,
      Math.max(
        0,
        score +
          (i === 0
            ? currentScore - score
            : Math.floor(Math.random() * 10) - 2)
      )
    );

    points.push({
      hoursAgo: i,
      score,
    });
  }

  points[points.length - 1].score = currentScore;

  return points;
}

/**
 * ------------------------------------------------------------------
 * RISK SCORING ENGINE
 * Weighted scoring model (0-100)
 *
 * Rainfall intensity        = 30%
 * River level vs danger     = 35%
 * Soil moisture / saturation = 20%
 * Population factor         = 15%
 * ------------------------------------------------------------------
 */

function calculateRiskScore(zone) {
  const rainfallScore =
    Math.min(zone.rainfallMM / 250, 1) * 30;

  const riverRatio =
    zone.riverLevelM / zone.riverDangerLevelM;

  const riverScore =
    Math.min(riverRatio, 1.2) * (35 / 1.2);

  const soilScore =
    (zone.soilMoisture / 100) * 20;

  const popFactor =
    Math.min(zone.population / 6000, 1) * 15;

  const total =
    rainfallScore +
    riverScore +
    soilScore +
    popFactor;

  return Math.round(Math.min(total, 100));
}

function riskLevel(score) {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MODERATE";

  return "LOW";
}

function getZonesWithRisk() {
  return zones.map((z) => {
    const score = calculateRiskScore(z);

    return {
      ...z,
      riskScore: score,
      riskLevel: riskLevel(score),
    };
  });
}

/**
 * ------------------------------------------------------------------
 * API ROUTES
 * ------------------------------------------------------------------
 */

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Disaster Alert API running",
  });
});

// Get all zones with computed risk scores
app.get("/api/zones", (req, res) => {
  res.json(getZonesWithRisk());
});

// Get a single zone by ID
app.get("/api/zones/:id", (req, res) => {
  const zone = getZonesWithRisk().find(
    (z) => z.id === req.params.id
  );

  if (!zone) {
    return res.status(404).json({
      error: "Zone not found",
    });
  }

  res.json(zone);
});

// Get active alerts
app.get("/api/alerts", (req, res) => {
  const alerts = getZonesWithRisk().filter(
    (z) =>
      z.riskLevel === "HIGH" ||
      z.riskLevel === "CRITICAL"
  );

  res.json({
    count: alerts.length,

    alerts: alerts.map((a) => ({
      zoneId: a.id,
      name: a.name,
      riskLevel: a.riskLevel,
      riskScore: a.riskScore,
      population: a.population,

      message: `${a.riskLevel} flood risk detected in ${a.name}. Estimated ${a.population} residents in affected area.`,
    })),
  });
});

// Get resource inventory
app.get("/api/resources", (req, res) => {
  res.json(resources);
});

// Resource allocation plan
app.get("/api/allocation-plan", (req, res) => {
  const critical = getZonesWithRisk()
    .filter(
      (z) =>
        z.riskLevel === "CRITICAL" ||
        z.riskLevel === "HIGH"
    )
    .sort((a, b) => b.riskScore - a.riskScore);

  const plan = critical.map((zone, idx) => ({
    priority: idx + 1,

    zone: zone.name,

    riskLevel: zone.riskLevel,

    suggestedAction:
      zone.riskLevel === "CRITICAL"
        ? "Immediate evacuation + deploy rescue boats & medical team"
        : "Pre-position relief shelter & food/water kits; monitor closely",

    population: zone.population,
  }));

  res.json({
    generatedAt: new Date().toISOString(),
    plan,
  });
});

// Get risk trend history for a zone
app.get("/api/zones/:id/history", (req, res) => {
  const zone = getZonesWithRisk().find(
    (z) => z.id === req.params.id
  );

  if (!zone) {
    return res.status(404).json({
      error: "Zone not found",
    });
  }

  res.json({
    zoneId: zone.id,
    history: generateHistory(zone.riskScore),
  });
});

// Get citizen ground reports
app.get("/api/reports", (req, res) => {
  const { zoneId } = req.query;

  const filtered = zoneId
    ? citizenReports.filter(
        (r) => r.zoneId === zoneId
      )
    : citizenReports;

  res.json(
    filtered.sort(
      (a, b) =>
        new Date(b.timestamp) -
        new Date(a.timestamp)
    )
  );
});

// Submit a new citizen ground report
app.post("/api/reports", (req, res) => {
  const {
    zoneId,
    message,
    reporterName,
    severity,
  } = req.body;

  if (!zoneId || !message) {
    return res.status(400).json({
      error: "zoneId and message are required",
    });
  }

  const report = {
    id: "cr" + Date.now(),
    zoneId,
    message,
    reporterName:
      reporterName || "Anonymous resident",
    severity: severity || "MODERATE",
    timestamp: new Date().toISOString(),
  };

  citizenReports.unshift(report);

  res.status(201).json(report);
});

// Simulate new sensor data
app.post("/api/zones/:id/update", (req, res) => {
  const zone = zones.find(
    (z) => z.id === req.params.id
  );

  if (!zone) {
    return res.status(404).json({
      error: "Zone not found",
    });
  }

  const {
    rainfallMM,
    riverLevelM,
    soilMoisture,
  } = req.body;

  if (rainfallMM !== undefined) {
    zone.rainfallMM = rainfallMM;
  }

  if (riverLevelM !== undefined) {
    zone.riverLevelM = riverLevelM;
  }

  if (soilMoisture !== undefined) {
    zone.soilMoisture = soilMoisture;
  }

  res.json({
    message: "Zone updated",
    zone,
  });
});

/**
 * ------------------------------------------------------------------
 * START SERVER
 * ------------------------------------------------------------------
 *
 * 0.0.0.0 allows Render to access the server.
 * process.env.PORT allows Render to provide its own port.
 * ------------------------------------------------------------------
 */

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Disaster Alert API running on port ${PORT}`
  );
});

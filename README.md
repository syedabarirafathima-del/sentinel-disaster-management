# Sentinel — AI-Based Disaster Early-Warning & Resource Coordination Platform

**Smart India Hackathon 2026 | Theme: Disaster Management**

## Problem Statement

Flood-prone regions in India often suffer avoidable loss of life and property
because early-warning signals — rising river levels, heavy rainfall, saturated
soil — are scattered across multiple agencies and rarely combined into a single,
actionable view. By the time a flood is officially declared, response teams
have already lost the most valuable hours for evacuation and resource
positioning.

## Our Solution

**Sentinel** is a real-time dashboard that combines rainfall, river-level, and
soil-moisture data into a single, explainable **risk score per zone**, and
automatically:

1. **Flags high-risk zones** on a live map before flooding occurs
2. **Generates alerts** with population-impact estimates for affected areas
3. **Recommends a resource-allocation plan**, prioritizing rescue boats,
   medical teams, and shelters toward the zones that need them most
4. Gives local authorities a **single console** to monitor, decide, and act

## Why This Approach

We deliberately built the risk-scoring engine as a **transparent, rule-based
weighted model** (rainfall 30%, river level vs. danger mark 35%, soil
saturation 20%, population density 15%) rather than a black-box ML model.
In disaster response, decision-makers need to *trust and explain* why a zone
is flagged — a transparent formula can be audited and adjusted by domain
experts (e.g. district disaster management authorities), and can be upgraded
to a trained ML model later without changing the system architecture.

## Architecture

```
┌─────────────────────┐         ┌──────────────────────────┐
│   Frontend (Web)     │  REST   │   Backend (Node/Express)  │
│  Leaflet map console │ <-----> │  Risk scoring engine      │
│  Alerts + allocation │  JSON   │  Zone / alert / resource  │
│  panels              │         │  APIs                     │
└─────────────────────┘         └──────────────────────────┘
                                          │
                                          ▼
                          (Future) Live data integration:
                          IMD rainfall API · CWC river-level API
                          ISRO Bhuvan soil-moisture data
```

- **Frontend**: HTML/CSS/JS, Leaflet.js for the live map — no build step, runs
  in any browser
- **Backend**: Node.js + Express REST API, currently powered by realistic
  simulated sensor data so the full pipeline can be demoed without needing
  live API keys during judging
- **Data model**: designed so real government data feeds can be swapped in
  without changing any frontend code

## Features

| Feature | Description |
|---|---|
| Live risk map | Color-coded zones by risk level (Low → Critical) |
| Auto-generated alerts | Human-readable alert messages with population estimates |
| Response priority list | Ranked action plan for authorities |
| Resource inventory | Live view of rescue boats, medical teams, shelters, supplies |
| Zone detail drawer | Full sensor breakdown + 6-hour risk trend chart per zone |
| **Citizen ground reporting** | Residents can submit real-time "SOS" reports from the ground — a crowdsourced verification layer that catches situations sensors alone might miss (e.g. a blocked road, a flooded lane) |
| **Risk trend chart** | Each zone shows how its risk score has moved over the last 6 hours, not just a single snapshot — helping responders see whether a zone is escalating or stabilizing |
| **Bilingual interface (English/Telugu)** | One-click language toggle, since the residents an alert system serves may not read English — a genuine accessibility feature, not just a demo add-on |
| **One-click authority report** | Generates a printable/exportable situation report for handoff to disaster response officials |

### Why these differentiate Sentinel

Most flood-alert prototypes stop at "sensor data → dashboard." Sentinel adds
the two things real disaster response actually depends on: **ground truth
from people on site**, and **trend awareness**, not just a single reading.
Local-language support also reflects a design choice that keeps the
end-user — the resident, not just the official — in mind.

## Tech Stack

- Node.js, Express
- HTML5, CSS3, Vanilla JS
- Leaflet.js (open-source mapping)
- CARTO dark basemap tiles

## Getting Started

### Backend
```bash
cd backend
npm install
npm start
```
Runs at `http://localhost:5000`

### Frontend
Open `frontend/index.html` directly in a browser, or serve it with any static
server, e.g.:
```bash
cd frontend
npx serve .
```

## Future Scope

- Integrate live IMD/CWC/ISRO data feeds in place of simulated sensor data
- SMS/WhatsApp alert delivery to residents in flagged zones (Twilio/MSG91)
- Historical data-trained ML model for predictive (not just reactive) scoring
- Multi-disaster support: cyclone, landslide, and heatwave modules
- Mobile app for field responders with offline-first sync

## Team

Add your team name and member names here before submission.

## License

Built for Smart India Hackathon 2026. For educational/hackathon use.

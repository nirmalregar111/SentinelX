WORK ON THE EXISTING SENTINELX WEBSITE/DESIGN.

I want this existing Figma-designed SentinelX website to become a **real working application with backend integration**.

Do NOT redesign the existing UI.
Do NOT replace the current SentinelX design.
Preserve the existing pages, components, colors, layout, navigation and visual hierarchy.

The goal is to make the current frontend **backend-ready** and implement the complete security-event data flow.

---

# MAIN REQUIREMENT

Implement the application architecture around this workflow:

CAMERA
↓
PERSON DETECTED
↓
PERSON ENTERS RESTRICTED ZONE
↓
INTRUSION CONFIRMED
↓
INCIDENT CREATED
↓
VIDEO EVIDENCE CREATED
↓
VIDEO + METADATA STORED
↓
EVIDENCE LINKED TO INCIDENT
↓
INCIDENT PAGE
↓
EVIDENCE LIBRARY

Everything shown in the UI should be designed to consume **real backend data**, not hardcoded fake data.

---

# BACKEND DATA MODELS

Create backend-ready data structures for:

## Environment

```text
id
name
type
location
status
createdAt
```

## Camera

```text
id
name
environmentId
status
source
createdAt
```

## Zone

```text
id
name
environmentId
cameraId
type
polygon
severity
enabled
createdAt
```

## Person

Use anonymous IDs:

```text
id
displayId
cameraId
firstDetectedAt
lastDetectedAt
status
```

Example:

```text
P-001
P-002
P-003
```

## Incident

```text
id
cameraId
zoneId
personId
eventType
severity
status
confidence
riskScore
detectedAt
createdAt
```

## Evidence

```text
id
incidentId
cameraId
zoneId
personId

videoUrl
thumbnailUrl

eventType
severity
confidence
riskScore

recordingStartedAt
detectedAt
recordingEndedAt

duration
status
createdAt
```

---

# DATABASE STRUCTURE

Prepare the application for a database such as:

**Supabase PostgreSQL**

Use relational references:

```text
Environment
    ↓
Camera
    ↓
Zone

Camera
    ↓
Person

Camera + Zone + Person
    ↓
Incident
    ↓
Evidence
```

Do not duplicate the same information unnecessarily.

---

# API STRUCTURE

Prepare the frontend to communicate with backend API endpoints.

Create a clean API/service layer.

Example:

```text
/api/environments
/api/cameras
/api/zones
/api/people
/api/incidents
/api/evidence
```

Support:

```text
GET
POST
PUT
DELETE
```

where appropriate.

For incidents:

```text
GET /api/incidents
GET /api/incidents/:id
POST /api/incidents
PUT /api/incidents/:id
```

For evidence:

```text
GET /api/evidence
GET /api/evidence/:id
GET /api/incidents/:id/evidence
```

---

# LIVE DASHBOARD

The existing dashboard must be designed to receive live backend data.

Connect these values to backend data:

```text
Active Cameras
People Detected
Active Incidents
High Risk Events
Evidence Captured
System Status
```

Do not hardcode these values permanently.

---

# LIVE MONITORING

The existing camera page should consume camera information from the backend.

Display:

```text
Camera Name
Camera ID
Status
AI Status
Detected People
Active Zone
Current Incident
```

Example:

```text
CAM-03
● LIVE

AI ACTIVE

P-104
96%

Restricted Equipment
```

---

# INCIDENT CREATION

When the backend confirms an intrusion:

Create an incident record.

Example:

```text
INC-1042

Unauthorized Zone Entry

Camera
CAM-03

Person
P-104

Zone
Restricted Equipment

Severity
HIGH

Confidence
96%

Risk Score
87

Detected
10:42:18
```

The incident should automatically appear in:

* Dashboard
* Live Monitoring
* Incident Feed
* Incident Details
* Analytics

---

# AUTOMATIC VIDEO EVIDENCE

This is the most important feature.

When an intrusion occurs:

```text
INTRUSION CONFIRMED
↓
CAPTURE EVENT VIDEO
↓
CREATE VIDEO CLIP
↓
STORE VIDEO
↓
CREATE EVIDENCE RECORD
↓
LINK TO INCIDENT
```

The preferred evidence window is:

```text
5 seconds before
+
intrusion event
+
5 seconds after
```

If pre-event recording is not technically available, clearly use the available event recording instead.

Never show a fake video.

---

# EVIDENCE RECORD

After the video is successfully stored, create:

```text
EVD-0001
```

with:

```text
Evidence ID
Incident ID
Camera
Person
Zone
Event
Timestamp
Duration
Confidence
Risk Score
Severity
Video URL
Status
```

Example:

```text
EVD-0001

Incident
INC-1042

Camera
CAM-03

Person
P-104

Zone
Restricted Equipment

Detected
10:42:18

Duration
00:10

Confidence
96%

Risk Score
87%

Severity
HIGH

Status
SAVED
```

---

# EVIDENCE LIBRARY

The existing Evidence section should load evidence from the backend.

Support:

```text
Search
Camera filter
Zone filter
Severity filter
Date filter
Incident filter
```

Each result should display:

```text
Video Thumbnail
Evidence ID
Incident ID
Camera
Person
Zone
Timestamp
Duration
Severity
Status
```

---

# INCIDENT DETAILS

The Incident Details page should retrieve the incident from the backend.

Display:

```text
INC-1042

HIGH RISK INTRUSION

Camera
CAM-03

Person
P-104

Zone
Restricted Equipment

Detected
10:42:18

Risk Score
87
```

Then display:

```text
VIDEO EVIDENCE
```

with the actual stored video.

---

# VIDEO PLAYER

The video player must use the real evidence video URL.

Support:

```text
Play
Pause
Seek
Duration
Fullscreen
```

Show:

```text
00:04 / 00:10
```

If the video cannot be loaded:

```text
VIDEO UNAVAILABLE
Unable to load evidence.
```

Do not show a fake player.

---

# REAL-TIME UPDATES

Prepare the application for WebSocket/Supabase Realtime.

When:

```text
new incident
new evidence
camera status changed
zone changed
```

the UI should update without requiring a full page refresh.

Example:

```text
Backend
   ↓
Realtime Event
   ↓
Frontend State
   ↓
Dashboard
Incident Feed
Evidence Library
Notifications
```

---

# FRONTEND STATE

Create a centralized application state/data layer.

Do not maintain separate fake copies of:

```text
incidents
cameras
zones
evidence
people
```

Use shared state so that when an incident is created, every relevant page reflects the change.

---

# LOADING STATES

Every backend-driven page needs:

```text
Loading
Empty
Error
Success
```

Examples:

```text
Loading incidents...
Loading evidence...
Loading cameras...
```

Empty state:

```text
No security incidents found.
```

Error state:

```text
Unable to load incidents.
Retry
```

---

# BACKEND ERROR HANDLING

Handle:

```text
Database unavailable
API unavailable
Video upload failed
Evidence unavailable
Camera unavailable
Invalid ID
Unauthorized request
Network error
```

Never silently fail.

---

# SECURITY

Never expose:

```text
Database passwords
Supabase service-role key
Private API keys
Storage secrets
Environment secrets
```

Use environment variables for secrets.

Frontend must never contain server-side credentials.

---

# PRIVACY

Use anonymous person identifiers:

```text
P-001
P-002
P-003
```

Do not add face recognition.

Do not attempt to identify real people.

---

# UI STATES TO ADD

Create variants for:

### Camera

```text
LIVE
OFFLINE
CONNECTING
ERROR
```

### Incident

```text
NEW
ACKNOWLEDGED
INVESTIGATING
RESOLVED
```

### Evidence

```text
RECORDING
PROCESSING
SAVED
FAILED
UNAVAILABLE
```

---

# IMPORTANT

Do not convert the application into a static prototype.

Do not hardcode security incidents as the final implementation.

Do not fake API responses.

Do not fake evidence.

Do not create fake video URLs.

The existing SentinelX UI should remain visually unchanged while the application architecture is prepared to use real backend data.

---

# FINAL ARCHITECTURE

The finished application should follow:

```text
                    SENTINELX

                       │
                    CAMERA
                       │
                       ▼
               PERSON DETECTION
                       │
                       ▼
                    TRACKING
                       │
                       ▼
                  ZONE ENGINE
                       │
                       ▼
                AUTHORIZATION
                       │
                       ▼
              INTRUSION ENGINE
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
         INCIDENT             EVIDENCE
             │                   │
             │              VIDEO STORAGE
             │                   │
             └─────────┬─────────┘
                       ▼
                    DATABASE
                       │
                       ▼
                SENTINELX UI
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      Dashboard    Incidents    Evidence
                                  Library
```

The final product should feel like a real **AI-powered Security Operations Platform**, not a static Figma prototype.

Preserve the existing SentinelX visual design while making the application structured, scalable and ready for real backend integration.

Design the complete **SentinelX** cybersecurity platform in Figma as a polished, production-quality SaaS product.

SentinelX is an **AI-powered security monitoring and restricted-area intrusion detection platform** for environments such as universities, factories, warehouses, offices, hospitals, campuses, transport hubs, stadiums, and custom environments.

This is NOT a stadium-only product.

The design should look like a **real enterprise Security Operations Center (SOC)**, not a generic admin dashboard.

---

# 1. DESIGN GOAL

Create a complete, connected Figma design system and application experience.

The final product should communicate:

> **Intelligent Security. Real-Time Protection.**

Design personality:

* Professional
* Premium
* Intelligent
* Secure
* Technical
* Modern
* Precise
* Trustworthy
* Dynamic
* Easy to understand

Avoid making it look:

* Cyberpunk
* Gaming-inspired
* Overly futuristic
* Like a generic AI dashboard
* Like a portfolio website

The design should feel like a product that could realistically be used by professional security operators.

---

# 2. BRAND

Product name:

**SentinelX**

Meaning:

**Sentinel** = guardian / watcher
**X** = advanced technology / intelligence

Primary tagline:

**Intelligent Security. Real-Time Protection.**

Secondary tagline:

**See. Understand. Protect.**

---

# 3. COLOR SYSTEM

Create Figma color styles/tokens.

### Background

```text
Background        #070A0F
Secondary BG      #0B1017
Surface           #111821
Elevated Surface  #17212C
Border            #24303D
Subtle Border     #1A242F
```

### Brand

```text
Sentinel Cyan     #22D3EE
Sentinel Blue     #3B82F6
```

### Status

```text
Success           #22C55E
Warning           #F59E0B
High Risk         #F97316
Critical          #EF4444
Information       #38BDF8
```

### Text

```text
Primary           #F8FAFC
Secondary         #CBD5E1
Muted             #64748B
Disabled          #475569
```

Keep approximately:

```text
80% Dark Neutrals
15% Brand / Information
5% Alert Colors
```

Do not introduce random colors.

---

# 4. TYPOGRAPHY

Use:

**Inter**

for the main interface.

Use:

**JetBrains Mono**

for technical information.

Use JetBrains Mono for:

* Camera IDs
* Incident IDs
* Person IDs
* Timestamps
* Confidence
* Risk scores
* Technical status
* System information

Create typography styles:

```text
Display
H1
H2
H3
Body Large
Body
Body Small
Caption
Technical
Metric
```

Maintain strong hierarchy and readability.

---

# 5. DESIGN SYSTEM

Create reusable Figma components and variants.

Build components for:

### Buttons

```text
Primary
Secondary
Ghost
Danger
Icon
```

States:

```text
Default
Hover
Pressed
Focused
Disabled
Loading
```

### Inputs

```text
Text
Search
Dropdown
Date
Number
```

States:

```text
Default
Focus
Error
Disabled
Filled
```

### Badges

```text
LIVE
ONLINE
OFFLINE
SAFE
WARNING
HIGH
CRITICAL
AUTHORIZED
UNAUTHORIZED
```

### Cards

```text
Metric Card
Camera Card
Incident Card
Zone Card
Person Card
System Status Card
```

### Navigation

```text
Sidebar Item
Active Item
Header
Tabs
Breadcrumb
```

### Feedback

```text
Toast
Alert
Modal
Drawer
Tooltip
Confirmation Dialog
Empty State
Loading State
Error State
```

Make everything consistent and reusable.

---

# 6. MAIN APPLICATION LAYOUT

Create the main SentinelX desktop application shell.

Structure:

```text
┌───────────────────────────────────────────────────────────┐
│ Sidebar │ Top Header                                     │
│         ├────────────────────────────────────────────────┤
│         │                                                │
│         │              Main Content                      │
│         │                                                │
│         │                                                │
└─────────┴────────────────────────────────────────────────┘
```

Sidebar:

Approximately 240–260px.

Navigation:

```text
Overview
Live Monitoring
Incidents
Zones
People
Analytics
Settings
```

Include SentinelX logo/wordmark.

Active navigation should use cyan.

---

# 7. OVERVIEW DASHBOARD

Design the primary Security Operations Center dashboard.

Top:

```text
SentinelX
Security Operations Center

● SYSTEM SECURE
● AI ENGINE READY
● 12 CAMERAS ONLINE
10:42:18
```

Main metrics:

```text
Active Incidents
People Detected
Active Cameras
Restricted Zones
```

Then:

```text
Live Camera Monitoring
```

Then:

```text
Live Security Activity
```

Then:

```text
Recent Incidents
```

Then:

```text
Security Analytics
```

The dashboard should have strong information hierarchy.

---

# 8. LIVE MONITORING PAGE

This should be one of the most impressive pages.

Create a professional multi-camera monitoring wall.

Example:

```text
CAM-01     ● LIVE
CAM-02     ● LIVE
CAM-03     ⚠ WARNING
CAM-04     ● LIVE
```

Each camera card should contain:

* Camera ID
* Camera name
* Status
* Video area
* Detection overlay
* Person IDs
* Confidence
* Zone overlay
* Detection count
* Controls

Design realistic CCTV/video placeholders.

---

# 9. CAMERA DETAIL VIEW

Create a full-screen/expanded camera experience.

Include:

```text
Large Camera Feed

Camera Information
Current Detection
Zone Status
AI Status
FPS
People Detected
```

Controls:

```text
Fullscreen
Pause
Mute
Camera Settings
Close
```

Create desktop and responsive versions.

---

# 10. AI DETECTION OVERLAY

Design realistic computer-vision overlays.

Example:

```text
┌──────────────────────────────┐
│                              │
│     ┌──────────────┐         │
│     │ P-104        │         │
│     │ 96%          │         │
│     └──────────────┘         │
│                              │
│     RESTRICTED ZONE          │
│   ┌──────────────────────┐   │
│   │                      │   │
│   │                      │   │
│   └──────────────────────┘   │
│                              │
└──────────────────────────────┘
```

Use:

* Bounding boxes
* Person labels
* Confidence
* Zone polygons
* Centroid markers
* Status indicators

Keep overlays clean.

---

# 11. SECURITY ZONE PAGE

Create a complete Zone Management interface.

Include:

```text
Zone List
Create Zone
Edit Zone
Delete Zone
Zone Details
Camera
Security Level
Allowed Roles
Schedule
Status
```

Zone levels:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

Create a large visual polygon editor area.

Show:

```text
Camera Feed
+
Polygon
+
Zone Label
+
Detected People
```

Create states:

```text
SAFE
APPROACHING
WARNING
INTRUSION
```

---

# 12. CREATE / EDIT ZONE MODAL

Design a complete form:

```text
Zone Name
Camera
Security Level
Allowed Roles
Start Time
End Time
Status
```

Buttons:

```text
Cancel
Save Zone
```

Also create validation/error states.

---

# 13. INCIDENT MANAGEMENT PAGE

Create a professional incident investigation interface.

Top:

```text
Security Incidents

Search
Severity Filter
Status Filter
Camera Filter
Zone Filter
Date Filter
```

Incident table/list:

```text
ID
Severity
Incident
Camera
Zone
Person
Time
Risk
Status
```

---

# 14. INCIDENT DETAIL

Create a large investigation drawer/page.

Show:

```text
INC-1042

HIGH RISK INTRUSION

Camera
CAM-03

Zone
Restricted Equipment

Person
P-104

Confidence
96%

Risk Score
87
```

Include:

### Evidence

Large snapshot/video area.

### Timeline

```text
10:42:12
Person detected

10:42:14
Approaching zone

10:42:16
Boundary crossed

10:42:17
Authorization failed

10:42:18
Intrusion confirmed
```

### Actions

```text
ACKNOWLEDGE
INVESTIGATE
RESOLVE
```

---

# 15. INCIDENT STATUS DESIGN

Create a visual workflow:

```text
NEW
 ↓
ACKNOWLEDGED
 ↓
INVESTIGATING
 ↓
RESOLVED
```

Use a professional stepper/timeline.

Create all states.

---

# 16. ALERT EXPERIENCE

Design critical security alerts.

Example:

```text
🚨 INTRUSION DETECTED

Restricted Equipment Zone

CAM-03
P-104

Risk Score
87

Confidence
96%

[ VIEW INCIDENT ]
```

Create:

* Toast version
* Notification panel version
* Full alert version
* Critical incident modal

Do not make the entire screen flash.

---

# 17. PEOPLE PAGE

Create an anonymous people monitoring interface.

Use:

```text
P-101
P-102
P-103
P-104
```

Do not use face recognition.

Display:

```text
Person ID
Camera
Zone
Authorization
Status
Last Seen
Risk
```

Create person detail panel.

---

# 18. ANALYTICS PAGE

Create a security intelligence dashboard.

Metrics:

```text
Total Incidents
High Risk Incidents
Average Response Time
Most Triggered Zone
Most Active Camera
```

Charts:

```text
Incidents Over Time
Incidents by Severity
Zone Activity
Camera Activity
Risk Distribution
Response Time
```

Use clean professional charts.

No rainbow colors.

---

# 19. SETTINGS PAGE

Create enterprise-style settings.

Sections:

```text
Environment
Monitoring
Cameras
Zones
Roles & Permissions
Notifications
Security
System
```

Design:

* Toggles
* Dropdowns
* Inputs
* Permission matrices
* Schedules
* Security settings

---

# 20. ENVIRONMENT SELECTOR

SentinelX must support multiple environments.

Create selector:

```text
University
Factory
Warehouse
Office
Hospital
Campus
Transport Hub
Stadium
Custom
```

Do not make stadium the default identity of the product.

Use:

**Security Operations**

instead of:

**Stadium Security**

---

# 21. NOTIFICATION CENTER

Design a notification dropdown/panel.

Examples:

```text
🚨 High-risk intrusion
CAM-03
2 minutes ago

⚠ Boundary warning
CAM-02
5 minutes ago

✓ Camera restored
CAM-04
8 minutes ago
```

Allow:

```text
Mark as read
View incident
Clear
```

---

# 22. SYSTEM HEALTH

Create a system health panel.

Show:

```text
AI Engine       ● Operational
Database        ● Operational
WebSocket       ● Connected
API             ● Operational
Cameras         12/12 Online
```

Create:

* Operational
* Warning
* Degraded
* Offline

states.

---

# 23. PREDICTIVE SECURITY UI

Design a visual representation of:

```text
SAFE
 ↓
APPROACHING
 ↓
WARNING
 ↓
INTRUSION
```

Create a predictive warning card:

```text
⚠ PERSON APPROACHING

P-104 is approaching
Restricted Equipment Zone

Estimated boundary crossing:
~4 seconds
```

Clearly distinguish prediction from confirmed intrusion.

---

# 24. DEMO MODE

Design a visible Demo Mode control.

Example:

```text
DEMO MODE
● ACTIVE
```

Create a demo scenario interface showing:

```text
Person detected
↓
Approaching
↓
Warning
↓
Intrusion
↓
Incident
```

Clearly label simulated data.

---

# 25. EMPTY STATES

Create polished empty states.

Example:

```text
✓

ALL CLEAR

No active security incidents.

All monitored environments are currently secure.
```

Create empty states for:

* Incidents
* Zones
* People
* Cameras
* Analytics

---

# 26. ERROR STATES

Create professional error states.

Examples:

```text
CAMERA OFFLINE

CAM-04 is unavailable.

Last connection:
10:38:12

[ RETRY ]
```

And:

```text
AI ENGINE DEGRADED

Detection service is currently unavailable.

[ VIEW SYSTEM STATUS ]
```

---

# 27. LOADING STATES

Design:

* Skeleton dashboard
* Camera loading
* AI loading
* Table loading
* Chart loading
* Page loading

Use subtle animations in prototype where possible.

---

# 28. RESPONSIVE DESIGNS

Create responsive layouts for:

### Desktop

Primary SOC experience.

### Tablet

Collapsible sidebar and adaptive grids.

### Mobile

Prioritize:

```text
Alerts
Incidents
Camera status
System status
```

Create actual mobile frames rather than simply shrinking desktop.

---

# 29. INTERACTIVE PROTOTYPE

Connect important Figma prototype interactions.

At minimum:

```text
Login
 ↓
Overview
 ↓
Live Monitoring
 ↓
Select Camera
 ↓
Camera Detail
 ↓
Incident Alert
 ↓
Incident Details
 ↓
Acknowledge
 ↓
Investigate
 ↓
Resolve
```

Also:

```text
Overview
 ↓
Zones
 ↓
Create Zone
 ↓
Save
 ↓
Zone Details
```

And:

```text
Incidents
 ↓
Search
 ↓
Filter
 ↓
Incident Detail
```

Use smart transitions where appropriate.

---

# 30. DYNAMIC INTERACTION FEEL

The prototype should feel alive.

Use:

* Hover states
* Press states
* Active states
* Selected states
* Smooth transitions
* Alert appearance
* Expand/collapse
* Tabs
* Drawers
* Modals
* Tooltips

Keep animation professional and fast.

---

# 31. FIGMA ORGANIZATION

Organize the Figma file professionally.

Pages:

```text
01 — Cover
02 — Design System
03 — Components
04 — Overview
05 — Live Monitoring
06 — Incidents
07 — Zones
08 — People
09 — Analytics
10 — Settings
11 — Responsive
12 — Prototype Flow
```

Use Auto Layout extensively.

Use components and variants.

Use reusable styles/tokens.

Maintain consistent spacing.

---

# 32. SPACING SYSTEM

Use:

```text
4
8
12
16
20
24
32
40
48
64
```

Keep spacing consistent.

---

# 33. CORNER RADIUS

Use:

```text
6px
10px
14px
16px
```

Avoid making everything extremely rounded.

---

# 34. ICONOGRAPHY

Use a consistent outline icon style similar to Lucide.

Icons should be:

* Simple
* Professional
* Consistent
* Easily recognizable

Do not mix unrelated icon styles.

---

# 35. VISUAL BALANCE

Aim for:

```text
80% Dark Neutral
15% Cyan / Blue / Information
5% Warning / Critical
```

Alert colors should have meaning.

Never use red simply because it looks attractive.

---

# 36. FINAL QUALITY BAR

Before considering the design complete, check:

* Consistent typography
* Consistent spacing
* Consistent colors
* Consistent buttons
* Consistent cards
* Consistent icons
* Strong hierarchy
* Clear information density
* Responsive behavior
* Accessibility
* Realistic security workflows
* Professional SOC appearance

Remove anything that looks like a generic template.

---

# 37. FINAL IMPRESSION

When a hackathon judge opens the Figma prototype, they should immediately understand:

```text
What is SentinelX?
        ↓
AI Security Monitoring
        ↓
Live Camera Monitoring
        ↓
Restricted Zones
        ↓
Unauthorized Entry Detection
        ↓
Risk Assessment
        ↓
Incident Response
```

The interface should tell this story visually without requiring a long explanation.

---

# FINAL DESIGN PRINCIPLE

The entire SentinelX product should feel:

**DARK → CLEAR → DYNAMIC → PRECISE → INTELLIGENT → TRUSTWORTHY**

Not flashy.

Not gimmicky.

Not a generic dashboard.

A **real cybersecurity product**.

### SentinelX

**Intelligent Security. Real-Time Protection.**

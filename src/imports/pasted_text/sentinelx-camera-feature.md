IMPORTANT: MODIFY THE EXISTING SENTINELX PROJECT ONLY.

I already have a completed SentinelX website/design with existing pages, components, interactions, features, layouts, and functionality.

**DO NOT CHANGE, DELETE, REPLACE, REBUILD, OR REDESIGN ANYTHING THAT ALREADY EXISTS.**

This is an ADDITIVE UPDATE ONLY.

---

# ABSOLUTE RULE

Preserve 100% of the existing:

* Pages
* Dashboard
* Live Monitoring
* Incidents
* Evidence
* Zones
* People
* Analytics
* Settings
* Navigation
* Sidebar
* Header
* Cards
* Colors
* Typography
* Components
* Existing interactions
* Existing prototype flows
* Existing data
* Existing AI detection UI
* Existing intrusion UI
* Existing evidence UI
* Existing video/evidence design
* Existing layouts

**DO NOT MODIFY THEIR CURRENT BEHAVIOR.**

If something already works, leave it exactly as it is.

Do not replace existing components when adding the new feature.

---

# ONLY ADD THIS NEW FEATURE

Add a new:

**REAL CAMERA CONNECTION / LIVE CAMERA FEATURE**

The purpose is to allow SentinelX to receive a real camera source such as:

1. USB/Wired Webcam
2. Laptop Webcam
3. Phone Camera
4. Future CCTV/IP Camera

---

# ADDITIVE UI ONLY

Add a new button to the existing Live Monitoring page:

```text
+ CONNECT CAMERA
```

Do not move existing buttons.

Do not remove existing buttons.

Do not change the existing camera layout.

Do not redesign the Live Monitoring page.

Simply integrate the new button into the existing interface.

---

# CAMERA CONNECTION MODAL

When:

```text
+ CONNECT CAMERA
```

is clicked, open a new modal.

Title:

```text
Connect Camera
```

Show three options:

```text
USB / Wired Webcam
Use a webcam connected to this device

PHONE CAMERA
Use your phone as a live camera

IP / CCTV CAMERA
Connect a network camera
```

This modal is a NEW component.

It must not replace any existing component.

---

# USB WEBCAM FLOW

When the user selects:

```text
USB / Wired Webcam
```

show:

```text
Available Cameras

Integrated Webcam
USB Webcam

[ CONNECT CAMERA ]
```

After connection:

```text
✓ CAMERA CONNECTED

Camera
Main Entrance Camera

Source
USB Webcam

● LIVE
```

Then provide the live feed area.

---

# PHONE CAMERA FLOW

When the user selects:

```text
PHONE CAMERA
```

show:

```text
USE PHONE AS CAMERA

Connect your phone to the same network.

1. Open SentinelX Camera Sender on your phone.
2. Allow camera permission.
3. Scan the QR code.
4. Start streaming.
```

Add:

```text
QR CODE
```

and:

```text
Pairing Code
SNTL-4821
```

Show:

```text
● WAITING FOR PHONE
```

After pairing:

```text
✓ PHONE CONNECTED

Rear Camera
1080p
30 FPS

● STREAMING
```

---

# MOBILE CAMERA SENDER

Create a NEW mobile-only camera sender screen.

Do not modify the existing desktop dashboard.

The phone screen should contain:

```text
SENTINELX

CAMERA SENDER

● CONNECTED

┌─────────────────────┐
│                     │
│   CAMERA PREVIEW    │
│                     │
└─────────────────────┘

● STREAMING

Rear Camera
1080p

[ STOP STREAM ]
```

---

# LIVE CAMERA

After connection, add the real camera feed into the existing Live Monitoring experience.

Show:

```text
CAM-01

Main Entrance Camera

● LIVE
SOURCE: PHONE CAMERA
```

Do not replace existing camera cards.

If the existing UI already has a camera feed component, extend it rather than rebuilding it.

---

# CAMERA STATUS

Create NEW reusable states:

```text
CONNECTING
CONNECTED
LIVE
RECONNECTING
OFFLINE
PERMISSION REQUIRED
ERROR
```

Do not modify existing status components unless necessary.

---

# AI INTEGRATION

IMPORTANT:

Do not change the existing AI/person detection implementation or UI.

The new camera feed should simply become another possible video source for the EXISTING AI pipeline.

Existing flow must remain:

```text
Camera
↓
Existing Person Detection
↓
Existing Tracking
↓
Existing Zone Detection
↓
Existing Intrusion Detection
↓
Existing Evidence System
```

Do not rebuild these systems.

---

# EVIDENCE INTEGRATION

Do not redesign or replace the existing Evidence feature.

When the new camera source produces an intrusion, use the EXISTING evidence workflow.

The new flow should be:

```text
NEW CAMERA
↓
EXISTING AI
↓
EXISTING INTRUSION ENGINE
↓
EXISTING VIDEO EVIDENCE
↓
EXISTING INCIDENT
```

Do not create a second evidence system.

Do not create duplicate incident systems.

---

# CAMERA DETAILS

Add a new camera details panel only if required.

Show:

```text
Camera ID
Camera Name
Source
Connection
Resolution
FPS
AI Status
```

Example:

```text
CAM-01
Main Entrance

Source
Phone Camera

● LIVE

1080p
30 FPS

AI
● ACTIVE
```

---

# BACKEND-READY STRUCTURE

Prepare the new camera feature so it can later connect to a real backend.

Conceptually:

```text
Camera
cameraId
cameraName
sourceType
status
streamUrl
resolution
fps
aiEnabled
createdAt
lastSeenAt
```

Supported source types:

```text
USB_WEBCAM
PHONE_CAMERA
IP_CAMERA
RTSP
WEBRTC
```

Do not expose unnecessary technical details to the normal security operator.

---

# REAL CAMERA STATES

Do not fake:

```text
● LIVE
```

unless a camera is actually connected in the final implementation.

Use:

```text
CONNECTING
```

while connecting.

Use:

```text
● LIVE
```

only after a successful connection.

Use:

```text
● OFFLINE
```

when disconnected.

---

# PERMISSION STATES

Add:

```text
CAMERA ACCESS REQUIRED

SentinelX needs permission to access this camera.

[ ALLOW CAMERA ACCESS ]
```

And:

```text
CAMERA ACCESS DENIED

Camera permission was denied.

[ TRY AGAIN ]
```

---

# IMPORTANT — DO NOT TOUCH EXISTING FEATURES

Before making changes, inspect the existing project.

Identify all existing:

* pages
* routes
* components
* interactions
* data
* prototype connections
* AI features
* zone features
* incident features
* evidence features

Then make the smallest possible additive change.

**Do not rewrite existing code/components simply to add this feature.**

If an existing component can be reused, reuse it.

If a new component is required, create a new component.

---

# FINAL CHECK

After adding the feature, verify:

✓ Existing dashboard unchanged
✓ Existing navigation unchanged
✓ Existing Live Monitoring unchanged except for the new camera connection option
✓ Existing AI unchanged
✓ Existing zones unchanged
✓ Existing incidents unchanged
✓ Existing evidence unchanged
✓ Existing analytics unchanged
✓ Existing settings unchanged
✓ Existing prototype flows preserved
✓ Existing components preserved
✓ New camera connection works as an additional feature

The final result should feel like:

**SentinelX + one new camera integration feature**

NOT:

**A redesigned SentinelX.**

The existing project is the source of truth. **Preserve everything and only add the requested camera functionality.**

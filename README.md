# Sutrana Mobile (prototype)

Field app for Godavari Pushkaralu management (digital projects, vendors, assets). Frontend-only: React 18 + TypeScript + Vite + Tailwind, HashRouter, Leaflet (OSM), html5-qrcode. All data is **sample data** in localStorage, accessed only through `src/data/store.ts`.

## Run / build

```bash
npm install
npm run dev        # http://localhost:5173 (use a phone-size window; wide screens show a 420px frame)
npm run build      # tsc --noEmit + vite build -> dist/
npx tsc --noEmit
```

Demo login: pick a role, mobile (tap a demo number chip), OTP `1234`.
Demo numbers: staff 9000000011/12/13, vendor 9000000021/22, officer 9000000002.
Profile -> "Reset demo data" restores the seed. Profile -> "Simulate offline mode" tests the offline queue (or use browser DevTools offline).
Demo helpers: "simulate being at the asset/ghat" buttons exist because desktop GPS is rarely near Rajahmundry.

## Folder structure

```
src/
  data/       types.ts, seed.ts (sample data), store.ts (repository API, auth, subscribe hook, reset)
  native/     camera.ts, geolocation.ts, scanner.ts, notifications.ts  (device wrappers, swap for Capacitor)
  lib/        utils.ts (distance, delay status, SLA), selectors.ts (role visibility, notifications), useGps.ts, toast.ts
  components/ ui.tsx (buttons, sheets, fields), Shell.tsx (frame, tab bar, offline banner), TicketActions.tsx
  pages/      Splash, Login, Home, Scan, Assets, AssetDetail, Works, WorkDetail, ReportIssue,
              Issues, IssueDetail, Maintenance, Inspections, InspectionForm, Checkin, MapPage, Notifications, Profile
```

Rules: work delay = planned% (from start/end dates) minus actual%; gap >= 10 Delayed, >= 25 or past end date Critical. Asset verify passes within 50 m. SLA hours by priority: Critical 4, High 12, Medium 48, Low 96.

## Capacitor setup (not installed here)

```bash
npm i @capacitor/core @capacitor/cli
npx cap init Sutrana org.example.sutrana --web-dir=dist
npm i @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios
npm run build
npx cap sync
npx cap open android   # or ios
```

Vite `base` is `./` and routing is HashRouter, so the build works from the Capacitor WebView. `viewport-fit=cover` and safe-area CSS are already in place.

### Native wrappers to swap (each file has the exact code in its header comment)

| File | Today | Capacitor plugin |
|---|---|---|
| `src/native/camera.ts` | `<input type=file capture>` + canvas resize | `@capacitor/camera` |
| `src/native/geolocation.ts` | `navigator.geolocation` | `@capacitor/geolocation` |
| `src/native/scanner.ts` | `html5-qrcode` (+ manual ID entry) | `@capacitor-mlkit/barcode-scanning` |
| `src/native/notifications.ts` | in-app inbox + Notification API | `@capacitor/push-notifications` |

Add permission strings: Android `CAMERA`, `ACCESS_FINE_LOCATION`; iOS `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`.

## Replacing the store with a real API

Screens call `repo.*`, `auth.*`, `useDb()`, `useUser()` only. Reimplement those on top of fetch + a cache; keep the signatures (make mutations async). Offline queue: `syncQueue` in the store becomes a real outbox flushed on reconnect.

### Backend endpoints needed

```
POST /auth/otp/request {mobile}            POST /auth/otp/verify {mobile, otp, role} -> {token, user}
GET  /me                                   GET  /ghats   GET /departments   GET /vendors
GET  /assets?ghat=&condition=&q=           GET  /assets/:id     POST /assets/:id/verify {lat,lng,distance,photo}
PATCH /assets/:id/condition {condition,note}
GET  /projects?mine=true                   GET /projects/:id
PATCH /projects/:id/progress {progress,remarks,photo}      PATCH /projects/:id/milestones/:mid {done}
GET  /tickets?scope=reported|assigned|open POST /tickets    GET /tickets/:id
POST /tickets/:id/accept | /start | /resolve {note,photo}
GET  /inspections   POST /inspections {draft|submitted}     PUT /inspections/:id
GET  /deployments?ghat=   PATCH /deployments/:id {actual}   POST /checkins {ghat,type,lat,lng}
GET  /notifications   POST /notifications/:id/read   POST /notifications/read-all
POST /devices {pushToken}                  POST /sync (batched offline outbox)
GET  /dashboard/summary                    (officer KPIs)
```
Photos: upload as multipart/object storage and store URLs instead of data URLs.

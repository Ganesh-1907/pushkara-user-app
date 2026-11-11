# Sutrana Mobile (prototype)

Field app for Godavari Pushkaralu management (digital projects, vendors, assets). React 18 + TypeScript + Vite + Tailwind, HashRouter, Leaflet (OSM), html5-qrcode. Talks to the Sutrana FastAPI backend.

## Environment

`.env` (git-ignored; copy `.env.example`):

```
VITE_API_BASE_URL=http://127.0.0.1:8000
```

On a **real device or emulator** `127.0.0.1` is the device itself. Use the dev machine's LAN IP (e.g. `http://192.168.1.20:8000`) or `http://10.0.2.2:8000` for the Android emulator. The backend `CORS_ORIGINS` must include the app origin (`http://localhost:5174`, `capacitor://localhost`, `http://localhost`, or `http://<LAN-IP>:5174` when opening the dev server from a phone).

## Run order

```bash
docker start sutrana-pg                                  # 1. postgres (127.0.0.1:5434)
cd ../sutrana-backend && .venv/bin/uvicorn app.main:app --port 8000   # 2. backend
cd ../sutrana-mobile && npm install && npm run dev       # 3. mobile -> http://localhost:5174 (strict port, LAN-exposed)
npm run build        # tsc --noEmit + vite build -> dist/
```

Login: pick a role, tap a demo user chip (from `GET /auth/demo-users`), OTP `1234`.
Demo helpers: "simulate being at the asset/ghat" (and "far away") buttons exist because desktop GPS is rarely near Rajahmundry. Reset demo data is admin-only on the backend.

## Architecture

```
src/
  api/        client.ts (fetch wrapper, token, errors, 401 -> logout), types.ts, auth.ts, queries.ts (TanStack Query reads), uploads.ts, queryClient.ts
  offline/    outbox.ts (localStorage outbox + Sync now replay), useAction.ts (run mutation or queue it, toast, refresh)
  native/     camera.ts, geolocation.ts, scanner.ts, notifications.ts  (device wrappers, swap for Capacitor)
  lib/        utils.ts, constants.ts (form option lists), useGps.ts, toast.ts
  components/ ui.tsx, Shell.tsx (frame, tab bar, offline banner), TicketActions.tsx
  pages/      Splash, Login, Home, Scan, Assets, AssetDetail, Works, WorkDetail, ReportIssue, Issues, IssueDetail,
              Maintenance, Inspections, InspectionForm, Checkin, MapPage, Notifications, Profile
```

Ticket lifecycle: Open > Assigned > In progress > Resolved > Closed (+ Reopened). The reporter sees Confirm fixed / Reopen (reason) on a Resolved ticket; assignees/vendors Start (also from Reopened) and Resolve. Close/Reopen go through the offline outbox like other actions.

All business data comes from the API. localStorage holds only the auth session and the offline outbox.
Photos are taken via `native/camera.ts`, uploaded with `POST /uploads`, and only the returned URL is sent.
Offline (real, or Profile -> "Simulate offline"): mutations are queued as `{type, method, path, body}` and replayed in order by "Sync now" (marked synced/failed). Lists have a refresh button.

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

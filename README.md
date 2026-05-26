# Kurukkan Undo?

Kurukkan Undo? is a mobile-first campus awareness app for fast, trusted reports of “Kurukkan” activity. It uses a live map, real-time Firestore listeners, and Reddit-style voting so stale or unreliable reports disappear quickly.

## Architecture

- React + Vite + Tailwind for a lightweight mobile web app.
- Mapbox GL JS for the primary campus map with clustered report pins.
- Firebase Authentication for Google and email/password login.
- Firestore for live report and vote reads.
- Callable Firebase Functions for report creation and voting integrity.
- Firestore TTL plus a scheduled cleanup function remove expired reports.
- PWA manifest and service worker shell are included.
- Optional zone notifications alert users when they enter an active report area.

## Data Model

`reports/{reportId}`

```ts
{
  id: string;
  latitude: number;
  longitude: number;
  timestamp: Timestamp;
  expiryTimestamp: Timestamp;
  createdBy: string;
  note?: string;
  areaKey: string;
  upvotes: number;
  downvotes: number;
}
```

`votes/{reportId_userId}`

```ts
{
  id: string;
  reportId: string;
  userId: string;
  voteType: "upvote" | "downvote";
  timestamp: Timestamp;
}
```

`users/{userId}` stores anti-spam metadata such as `lastReportAt`.

## Local Setup

1. Install dependencies.

```bash
npm install
cd functions && npm install
```

2. Copy environment variables.

```bash
cp .env.example .env.local
```

3. Create a Firebase project and enable:

- Authentication: Google provider and Email/Password provider
- Firestore database
- Cloud Functions
- Hosting, if deploying with Firebase Hosting

4. Add your Firebase web app config and Mapbox token to `.env.local`.

5. Optionally copy backend environment defaults.

```bash
cp functions/.env.example functions/.env
```

6. Run the web app.

```bash
npm run dev
```

Without Firebase variables, the app opens in local demo mode so the UI can be reviewed immediately.

## Firebase Backend

Deploy Firestore rules and indexes:

```bash
firebase deploy --only firestore
```

Deploy callable functions:

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

The backend functions enforce:

- signed-in users only
- report cooldown per user
- duplicate active reports in the same area
- one vote per user per report
- vote toggling and vote switching
- no voting on expired reports

Functions can be configured with environment variables:

```bash
REPORT_TTL_MINUTES=25
REPORT_COOLDOWN_SECONDS=90
FUNCTIONS_REGION=us-central1
```

For automatic expiry, enable Firestore TTL on the `reports.expiryTimestamp` field. The included `purgeExpiredReports` function also deletes expired report docs and their vote docs every five minutes.

## Deployment

### Vercel

Set the same `VITE_*` environment variables in Vercel, then deploy the app as a Vite project. Deploy Firebase Functions, rules, and indexes separately with the Firebase CLI.

### Firebase Hosting

```bash
npm run build
firebase deploy --only hosting,firestore,functions
```

## Product Notes

- Reports expire after 20-30 minutes. The default is 25 minutes.
- The feed and map both vote in real time.
- The map uses one pin type only: 🦊.
- Mapbox is optional for local review, but required for the production map.

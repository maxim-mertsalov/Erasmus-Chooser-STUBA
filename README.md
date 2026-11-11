# Erasmus Chooser

Web app for filtering Erasmus+ / BIP / NŠP / CEEPUS partner university agreements, taking categorized notes, tracking priorities & application statuses, and exploring partner universities on an interactive world map.

Built with **Next.js (App Router)**, **Tailwind CSS**, **Leaflet + OpenStreetMap**, **SheetJS (`xlsx`)**, and **Google Drive / Sheets / Picker APIs** — with zero paid APIs.

---

## Features

- **Two data modes:**
  - **Google Sheets (recommended for sharing):** Pick a spreadsheet from Google Drive (or paste a link / open an invite link `?sheet=...`). Your notes, priorities, statuses, links, tags, and map pins are stored asynchronously in a separate `_erasmus_app` sheet inside the same spreadsheet.
  - **Local `.xlsx` / `.xls` / `.csv`:** Upload a file directly (works without any Google API keys). Custom data is saved in the browser's `localStorage` and can be exported/imported as JSON.
- **Collaboration & permissions:**
  - Multiple people can open the same shared Google Sheet simultaneously (polling every 15s + field-level merging before writes).
  - If you only have **View** access to a spreadsheet (or if it is an `.xlsx` file on Google Drive), the app lets you view it or create an editable Google Sheet copy in one click.
- **Wizard setup:** Sheet selection (if multiple sheets) → automatic column matching (with manual override & preview) → initial Faculty & Program selection.
- **Split-screen workspace:**
  - **Sortable & filterable table** on the left (search with 160ms debounce, faculty, program, country, status, min priority, language, tag, note category, location state, expired/hidden toggles).
  - **Customizable column visibility** (toggle table columns to fit laptop or tablet screens, saved in localStorage).
  - **Side-by-side University Comparison:** Select multiple universities to compare their grants, agreements, ratings, notes, and view their locations on a dedicated comparison map.
  - **Erasmus+ Grant Calculator / Group hints:** Automatic grant rate tags (`~670 €/mo`, `~600 €/mo`, `~540 €/mo`) based on destination country group guidelines (`lib/config/erasmusGrants.ts`).
  - **Pagination controls:** Switch between All (default), 25, 50, or 100 rows per page.
  - **Interactive OpenStreetMap** on the right (`Table` / `Map` toggles to hide either pane, with auto-dark mode support).
  - **Toast notifications:** Replaced native browser alerts with non-intrusive floating toasts.
  - **Pre-seeded static geocache & one-click sample:** Built-in instant coordinates cache for European technical universities and one-click demo data loading.
  - Clicking a table row flies to and highlights the university on the map; clicking a map marker highlights and scrolls to the row and shows agreement info in a popup.
- **Free auto-geocoding + manual mapping:**
  - Automatically locates universities in the background using free OpenStreetMap **Nominatim** and **Komoot Photon** (with Erasmus code city fallback, e.g. `E MADRID05` → Madrid).
  - Manual override for any university: search by name/address, click directly on the map ("Pick on map"), or paste `lat, lon` coordinates.

---

## Quick Start (Local Development)

```bash
npm install
cp .env.example .env.local
# Fill in Google credentials in .env.local if you want Google Drive / Sheets mode
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> Note: Local `.xlsx` upload mode works out of the box even without configuring `.env.local`.

---

## Google API Setup (100% Free)

To enable **Sign in with Google**, **Google Picker**, and **Google Sheets sync**:

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/) and create a new project (e.g. `erasmus-chooser`).
   - Note your **Project Number** on the Dashboard — this is your `NEXT_PUBLIC_GOOGLE_APP_ID`.

2. **Enable the required APIs**
   In **APIs & Services → Library**, enable all three:
   - **Google Drive API**
   - **Google Sheets API**
   - **Google Picker API**

3. **Configure OAuth Consent Screen**
   In **Google Auth platform → Branding / Audience** (or **OAuth consent screen**):
   - User Type: **External**.
   - Fill in App name, User support email, and Developer contact email.
   - Scope: this app only requests `https://www.googleapis.com/auth/drive.file` (a **non-sensitive** scope — it only grants access to files the user explicitly picks in Google Picker or copies created by the app).
   - While the app is in **Testing** mode, add your email and your friends' Gmail addresses under **Test users** (up to 100 test users, no Google review required).

4. **Create OAuth 2.0 Client ID**
   In **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for local dev)
     - Your production URL (e.g. `https://your-app.vercel.app`) if deployed.
   - Copy the **Client ID** into `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. (No Client Secret is needed; auth uses Google Identity Services in the browser.)

5. **Create an API Key (for Google Picker)**
   In **APIs & Services → Credentials → Create Credentials → API key**:
   - Copy the key into `NEXT_PUBLIC_GOOGLE_API_KEY`.
   - Recommended: restrict the key under **Application restrictions → Websites** (`http://localhost:3000/*`, etc.) and **API restrictions → Google Picker API**.

6. **Fill `.env.local`**
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
   NEXT_PUBLIC_GOOGLE_API_KEY=AIzaSy...
   NEXT_PUBLIC_GOOGLE_APP_ID=123456789
   ```
   Restart `npm run dev` after editing `.env.local`.

---

## Free Geocoding & Rate Limits

- Geocoding runs through `/api/geocode` (`app/api/geocode/route.ts`), which proxies requests to:
  - **OpenStreetMap Nominatim** (throttled to ~1 req/sec as required by Nominatim usage policy).
  - **Komoot Photon** (fuzzy/prefix search + city fallback).
- Results are cached across three layers: Vercel Edge CDN (`Cache-Control: s-maxage` on `/api/geocode` only, never caching Google Sheets requests), in-memory server cache, and browser `localStorage` (`erasmus-geocache-v1`). Resolved coordinates are also saved into the `_erasmus_app` sheet so friends opening the same file don't need to re-geocode.
- Optionally set `GEOCODER_CONTACT=your-email@example.com` in `.env.local` so Nominatim receives a contact identifier in the `User-Agent` header.

---

## Sharing With Friends

1. Share the Google Sheet in Google Drive (**Share → Anyone with the link → Editor** or **Viewer**, or invite specific emails).
2. Click **Share** in the top bar of the app to copy the link (`?sheet=<SPREADSHEET_ID>`).
3. Your friend opens the link, signs in with Google, and confirms access to that file once in the Google Picker dialog.
   - **Editors** read and write notes/priorities/locations directly to `_erasmus_app`.
   - **Viewers** see all existing notes and can click **Make an editable copy** to copy the spreadsheet (along with `_erasmus_app`) into their own Drive.

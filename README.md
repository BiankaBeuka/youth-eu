# Youth EU — Events Calendar

A static GitHub Pages website that lists Youth EU events and lets visitors add them to their iPhone, Android, or any calendar app. Users can also subscribe to the full calendar feed so new events appear automatically.

---

## Live site

`https://YOUR_GITHUB_USERNAME.github.io/youth-eu/`

---

## Features

- **Event cards** — title, date/time, location, description, category badge
- **Add to Calendar** dropdown on every event:
  - 🍎 Apple Calendar (downloads `.ics`)
  - 📅 Google Calendar (opens Google Calendar pre-filled)
  - 📧 Outlook (downloads `.ics`)
  - ⬇ Raw `.ics` download
- **Subscribe to Calendar** — one-click subscription for iPhone/Mac, Android/Google Calendar, and Outlook
- **Filter tabs** — Upcoming / Past / All events
- **Auto-generated `calendar.ics`** via GitHub Actions whenever `events.json` changes

---

## Setup

### 1 — Fork / clone and push to GitHub

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/youth-eu.git
cd youth-eu
git remote set-url origin https://github.com/YOUR_GITHUB_USERNAME/youth-eu.git
git push -u origin main
```

### 2 — Enable GitHub Pages

1. Go to your repository → **Settings** → **Pages**
2. Under *Source*, choose **Deploy from a branch**
3. Select branch **`main`** and folder **`/ (root)`**
4. Click **Save**

Your site will be live at `https://YOUR_GITHUB_USERNAME.github.io/youth-eu/` within a minute.

### 3 — Set the calendar URL

Edit `events.json` and replace the placeholder with your real URL:

```json
"calendarUrl": "https://YOUR_GITHUB_USERNAME.github.io/youth-eu/calendar.ics"
```

Commit and push — the GitHub Action will automatically regenerate `calendar.ics`.

---

## Adding or editing events

All events live in **`events.json`**. Add a new object to the `events` array:

```json
{
  "id": "unique-event-id",
  "title": "My Event Title",
  "description": "A short description of the event.",
  "start": "2026-12-01T10:00:00",
  "end":   "2026-12-01T17:00:00",
  "location": "City, Country",
  "timezone": "Europe/Brussels",
  "category": "Conference",
  "url": "https://example.com/event"
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | ✅ | Unique slug, e.g. `my-event-2026` |
| `title` | ✅ | Event name |
| `start` / `end` | ✅ | ISO 8601, e.g. `2026-12-01T10:00:00` |
| `location` | ✅ | Free text |
| `timezone` | ✅ | IANA tz name, e.g. `Europe/Paris` |
| `category` | — | Summit, Conference, Workshop, Forum, Festival |
| `description` | — | Multi-sentence description |
| `url` | — | Link to event page |

After editing, **commit and push** — GitHub Actions regenerates `calendar.ics` automatically.

### Regenerate locally

```bash
python scripts/generate_ics.py
```

---

## Project structure

```
youth-eu/
├── index.html                          # Main events page
├── events.json                         # ← Edit this to manage events
├── calendar.ics                        # Auto-generated iCal feed
├── .nojekyll                           # Disables Jekyll processing
├── css/
│   └── style.css
├── js/
│   └── app.js
├── scripts/
│   └── generate_ics.py                 # Generates calendar.ics from events.json
└── .github/
    └── workflows/
        └── generate-calendar.yml       # Runs generate_ics.py on push
```

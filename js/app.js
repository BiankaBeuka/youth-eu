/**
 * Youth EU Events Calendar — app.js
 * Loads events.json, renders event cards, handles calendar integration.
 */

'use strict';

// ─── State ──────────────────────────────────────────────────────────────────

let eventsData    = null;
let currentFilter = 'upcoming';   // time tab
let filterScope   = '';
let filterCountry = '';
let filterMonth   = '';           // "YYYY-MM"

// ─── Boot ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadEvents();
  setupFilterTabs();
  setupAdvancedFilters();
  setupSubscribeModal();
  document.getElementById('year').textContent = new Date().getFullYear();

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.cal-dropdown.open').forEach(d => d.classList.remove('open'));
  });
});

// ─── Data loading ────────────────────────────────────────────────────────────

async function loadEvents() {
  try {
    // Prefer inline data (injected by generate_ics.py) — works on file:// and HTTP
    if (window.__EVENTS__) {
      eventsData = window.__EVENTS__;
      buildDynamicFilterOptions();
      renderEvents();
      updateSubscribeUrls();
      return;
    }
    // Fallback: fetch from events.json (works when served over HTTP)
    const res = await fetch('events.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    eventsData = await res.json();
    buildDynamicFilterOptions();
    renderEvents();
    updateSubscribeUrls();
  } catch (err) {
    document.getElementById('events-grid').innerHTML =
      '<p class="error-msg">Could not load events. Please try again later.</p>';
    console.error('Failed to load events:', err);
  }
}

// ─── Subscribe URL helpers ───────────────────────────────────────────────────

function updateSubscribeUrls() {
  const httpsUrl = (eventsData && eventsData.calendarUrl) ? eventsData.calendarUrl : '';
  const webcalUrl = httpsUrl.replace(/^https?:\/\//, 'webcal://');

  const webcalLink = document.getElementById('webcalLink');
  const urlInput   = document.getElementById('calendarUrl');

  if (webcalLink) webcalLink.href = webcalUrl || '#';
  if (urlInput)   urlInput.value  = httpsUrl;
}

// ─── Build dynamic filter options ────────────────────────────────────────────

function buildDynamicFilterOptions() {
  if (!eventsData || !eventsData.events) return;

  const events = eventsData.events;

  // Country options — sorted alphabetically
  const countries = [...new Set(
    events.map(e => e.country).filter(Boolean)
  )].sort((a, b) => {
    if (a === 'Online') return 1;
    if (b === 'Online') return -1;
    return a.localeCompare(b);
  });

  const countrySelect = document.getElementById('filterCountry');
  if (countrySelect) {
    countries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      countrySelect.appendChild(opt);
    });
  }

  // Month options — only months that have at least one event
  const months = [...new Set(
    events.map(e => {
      const d = new Date(e.start);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })
  )].sort();

  const monthSelect = document.getElementById('filterMonth');
  if (monthSelect) {
    months.forEach(ym => {
      const [year, month] = ym.split('-');
      const label = new Date(Number(year), Number(month) - 1, 1)
        .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      const opt = document.createElement('option');
      opt.value = ym;
      opt.textContent = label;
      monthSelect.appendChild(opt);
    });
  }
}

// ─── Advanced filter setup ────────────────────────────────────────────────────

function setupAdvancedFilters() {
  const scopeSelect   = document.getElementById('filterScope');
  const countrySelect = document.getElementById('filterCountry');
  const monthSelect   = document.getElementById('filterMonth');
  const resetBtn      = document.getElementById('resetFilters');

  if (scopeSelect) {
    scopeSelect.addEventListener('change', () => {
      filterScope = scopeSelect.value;
      updateResetButton();
      renderEvents();
    });
  }

  if (countrySelect) {
    countrySelect.addEventListener('change', () => {
      filterCountry = countrySelect.value;
      updateResetButton();
      renderEvents();
    });
  }

  if (monthSelect) {
    monthSelect.addEventListener('change', () => {
      filterMonth = monthSelect.value;
      updateResetButton();
      renderEvents();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      filterScope = '';
      filterCountry = '';
      filterMonth = '';
      if (scopeSelect)   scopeSelect.value   = '';
      if (countrySelect) countrySelect.value = '';
      if (monthSelect)   monthSelect.value   = '';
      updateResetButton();
      renderEvents();
    });
  }
}

function updateResetButton() {
  const resetBtn = document.getElementById('resetFilters');
  if (!resetBtn) return;
  const active = filterScope || filterCountry || filterMonth;
  resetBtn.hidden = !active;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderEvents(timePref) {
  if (timePref !== undefined) currentFilter = timePref;

  const grid = document.getElementById('events-grid');
  const resultsBar   = document.getElementById('resultsBar');
  const resultsCount = document.getElementById('resultsCount');
  const now  = new Date();

  let events = (eventsData && eventsData.events) ? [...eventsData.events] : [];

  // ── Visibility filter
  events = events.filter(e => e.visible !== false);

  // ── Time filter ──────────────────────────────────────────────────────────
  if (currentFilter === 'upcoming') {
    events = events.filter(e => new Date(e.end || e.start) >= now);
  } else if (currentFilter === 'past') {
    events = events.filter(e => new Date(e.end || e.start) < now);
  }

  // ── Scope filter ─────────────────────────────────────────────────────────
  if (filterScope) {
    events = events.filter(e => (e.scope || '') === filterScope);
  }

  // ── Country filter ───────────────────────────────────────────────────────
  if (filterCountry) {
    events = events.filter(e => (e.country || '') === filterCountry);
  }

  // ── Month filter ─────────────────────────────────────────────────────────
  if (filterMonth) {
    const [fy, fm] = filterMonth.split('-').map(Number);
    events = events.filter(e => {
      const d = new Date(e.start);
      return d.getFullYear() === fy && (d.getMonth() + 1) === fm;
    });
  }

  // Sort ascending; past events most-recent first
  events.sort((a, b) => new Date(a.start) - new Date(b.start));
  if (currentFilter === 'past') events.reverse();

  // Results bar
  const anyFilterActive = filterScope || filterCountry || filterMonth;
  if (resultsBar && resultsCount) {
    if (anyFilterActive) {
      resultsBar.hidden = false;
      resultsCount.textContent = `${events.length} event${events.length !== 1 ? 's' : ''} found`;
    } else {
      resultsBar.hidden = true;
    }
  }

  if (events.length === 0) {
    const label = currentFilter === 'upcoming' ? 'upcoming' : currentFilter === 'past' ? 'past' : '';
    const hint  = anyFilterActive ? ' matching your filters' : '';
    grid.innerHTML = `<p class="no-events">No ${label} events${hint} found.</p>`;
    return;
  }

  grid.innerHTML = events.map(createEventCard).join('');

  // Attach listeners
  grid.querySelectorAll('.btn-add-cal').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.eventId;
      const dropdown = document.getElementById(`cal-dropdown-${id}`);
      document.querySelectorAll('.cal-dropdown.open').forEach(d => {
        if (d !== dropdown) d.classList.remove('open');
      });
      dropdown.classList.toggle('open');
    });
  });

  grid.querySelectorAll('.cal-option').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      handleCalendarOption(btn.dataset.action, btn.dataset.eventId);
      document.getElementById(`cal-dropdown-${btn.dataset.eventId}`).classList.remove('open');
    });
  });
}

// ─── Event card HTML ─────────────────────────────────────────────────────────

function createEventCard(event) {
  const catClass = (event.category || 'event').toLowerCase().replace(/\s+/g, '-');

  const dateStr = formatEventDates(event);
  const timeStr = formatEventTimes(event);

  const id = escapeAttr(event.id);
  const detailsHref = `event.html?id=${encodeURIComponent(event.id)}`;

  const scopeBadge   = event.scope   ? `<span class="badge badge-scope">${escapeHtml(event.scope)}</span>`   : '';
  const countryBadge = event.country ? `<span class="badge badge-country">${escapeHtml(event.country)}</span>` : '';

  return `
<article class="event-card">
  <a href="${detailsHref}" class="card-click-area" aria-label="View details for ${escapeAttr(event.title)}"></a>
  <div class="event-header">
    <span class="event-category ${escapeAttr(catClass)}">${escapeHtml(event.category || 'Event')}</span>
    <div class="event-badges">${scopeBadge}${countryBadge}</div>
  </div>
  <div class="event-body">
    <h2 class="event-title">
      <a href="${detailsHref}" class="event-title-link">${escapeHtml(event.title)}</a>
    </h2>
    <div class="event-meta">
      <div class="meta-item">
        <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>${escapeHtml(dateStr)}</span>
      </div>
      <div class="meta-item">
        <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>${escapeHtml(timeStr)}</span>
      </div>
      <div class="meta-item">
        <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        ${event.locationUrl
          ? `<a href="${escapeAttr(event.locationUrl)}" target="_blank" rel="noopener noreferrer" class="meta-location-link">${escapeHtml(event.location || '')}</a>`
          : escapeHtml(event.location || '')}
      </div>
    </div>
    <p class="event-description">${escapeHtml(event.description || '')}</p>
    <a href="${detailsHref}" class="event-link">
      View details
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
    </a>
  </div>
  <div class="event-footer">
    <div class="card-footer-row">
      <a href="${detailsHref}" class="btn-details">Details</a>
      <div class="cal-dropdown-wrapper">
        <button class="btn-add-cal" data-event-id="${id}" aria-haspopup="listbox" aria-expanded="false">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Add to Calendar
        </button>
        <div class="cal-dropdown" id="cal-dropdown-${id}" role="listbox">
          <button class="cal-option" data-action="apple"   data-event-id="${id}">🍎 Apple Calendar</button>
          <button class="cal-option" data-action="google"  data-event-id="${id}">📅 Google Calendar</button>
          <button class="cal-option" data-action="outlook" data-event-id="${id}">📧 Outlook</button>
          <button class="cal-option" data-action="ics"     data-event-id="${id}">⬇ Download .ics file</button>
        </div>
      </div>
    </div>
  </div>
</article>`;
}

// ─── Calendar option handler ─────────────────────────────────────────────────

function handleCalendarOption(action, eventId) {
  const event = eventsData.events.find(e => e.id === eventId);
  if (!event) return;

  switch (action) {
    case 'apple':
    case 'outlook':
    case 'ics':
      downloadICS(event);
      break;
    case 'google':
      openGoogleCalendar(event);
      break;
  }
}

// ─── ICS generation ──────────────────────────────────────────────────────────

/** Format ISO datetime for ICS: "2026-05-15T09:00:00" → "20260515T090000" */
function toICSDate(dateStr) {
  return dateStr.replace(/[-:]/g, '').replace(/\.\d+/, '').replace('Z', 'Z');
}

/** Escape ICS text values per RFC 5545 */
function escapeICS(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Fold long ICS lines at 75 octets per RFC 5545 §3.1 */
function foldICSLine(line) {
  if (line.length <= 75) return line;
  const chunks = [];
  let remaining = line;
  let first = true;
  while (remaining.length > 0) {
    const limit = first ? 75 : 74;
    if (remaining.length <= limit) { chunks.push(remaining); break; }
    chunks.push(remaining.slice(0, limit));
    remaining = ' ' + remaining.slice(limit);
    first = false;
  }
  return chunks.join('\r\n');
}

function buildVEVENT(event) {
  const tz  = event.timezone || 'Europe/Brussels';
  const uid = `${event.id}@youth-eu`;
  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=${tz}:${toICSDate(event.start)}`,
    `DTEND;TZID=${tz}:${toICSDate(event.end)}`,
    foldICSLine(`SUMMARY:${escapeICS(event.title)}`),
    foldICSLine(`DESCRIPTION:${escapeICS(event.description || '')}`),
    foldICSLine(`LOCATION:${escapeICS(event.location || '')}`),
    `CATEGORIES:${escapeICS(event.category || 'Event')}`,
  ];

  if (event.url) lines.push(`URL:${event.url}`);
  lines.push('END:VEVENT');
  return lines;
}

function generateICS(event) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Youth EU//Events Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...buildVEVENT(event),
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

function downloadICS(event) {
  const content = generateICS(event);
  const blob    = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = `${event.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Google Calendar URL ─────────────────────────────────────────────────────

function openGoogleCalendar(event) {
  const fmt = dateStr => dateStr.replace(/[-:]/g, '').replace(/\.\d+/, '');
  const params = new URLSearchParams({
    action:   'TEMPLATE',
    text:     event.title,
    dates:    `${fmt(event.start)}/${fmt(event.end)}`,
    details:  event.description || '',
    location: event.location    || '',
    sf:       'true',
    output:   'xml',
  });
  window.open(`https://www.google.com/calendar/render?${params}`, '_blank', 'noopener,noreferrer');
}

// ─── Filter tabs ─────────────────────────────────────────────────────────────

function setupFilterTabs() {
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      renderEvents(tab.dataset.filter);  // updates currentFilter then re-renders
    });
  });
}

// ─── Subscribe modal ─────────────────────────────────────────────────────────

function setupSubscribeModal() {
  const modal    = document.getElementById('subscribeModal');
  const openBtn  = document.getElementById('subscribeBtn');
  const closeBtn = document.getElementById('modalClose');
  const backdrop = document.getElementById('modalBackdrop');
  const copyBtn  = document.getElementById('copyUrlBtn');

  const openModal = () => {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  };

  const closeModal = () => {
    modal.hidden = true;
    document.body.style.overflow = '';
    openBtn.focus();
  };

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // Trap focus inside modal
  modal.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(modal.querySelectorAll(
      'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
    ));
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // Copy URL
  copyBtn.addEventListener('click', async () => {
    const val = document.getElementById('calendarUrl').value;
    try {
      await navigator.clipboard.writeText(val);
    } catch {
      // Fallback for older browsers
      const input = document.getElementById('calendarUrl');
      input.select();
      document.execCommand('copy');
    }
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy URL'; }, 2000);
  });
}

// ─── Date/time formatting ────────────────────────────────────────────────────

function formatEventDates(event) {
  const s = new Date(event.start);
  const e = new Date(event.end);
  const opts = { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' };
  const sStr = s.toLocaleDateString('en-GB', opts);
  if (!event.end) return sStr;
  const eStr = e.toLocaleDateString('en-GB', opts);
  return s.toDateString() === e.toDateString() ? sStr : `${sStr} – ${eStr}`;
}

function formatEventTimes(event) {
  const opts = { hour: '2-digit', minute: '2-digit' };
  const s = new Date(event.start).toLocaleTimeString('en-GB', opts);
  const e = new Date(event.end  ).toLocaleTimeString('en-GB', opts);
  return `${s} – ${e}`;
}

// ─── HTML/Attribute escaping ─────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Youth EU — event.js
 * Renders the event details page from ?id= URL parameter.
 * Requires window.__EVENTS__ to be set (injected inline).
 * Also requires app.js helper functions to be loaded first.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();
  renderEventDetail();
});

function renderEventDetail() {
  const root = document.getElementById('event-detail-root');

  // Read event id from query string
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const data = window.__EVENTS__;
  if (!data || !data.events) {
    root.innerHTML = '<p class="error-msg container" style="padding:3rem 1.5rem;">Event data not available.</p>';
    return;
  }

  const event = data.events.find(e => e.id === id);
  if (!event) {
    root.innerHTML = `
      <div class="container" style="padding:3rem 1.5rem;text-align:center;">
        <p class="error-msg">Event not found.</p>
        <a href="index.html" class="btn-back" style="margin-top:1.5rem;display:inline-flex;">← Back to all events</a>
      </div>`;
    return;
  }

  // Update page title & meta description
  document.title = `${event.title} — Youth EU`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', event.description || '');

  const catClass = (event.category || 'event').toLowerCase().replace(/\s+/g, '-');
  const dateStr  = formatEventDates(event);
  const timeStr  = formatEventTimes(event);

  // ── Details section ──────────────────────────────────────────────────────
  const detailsHtml = (event.details || event.description || '')
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p>${escapeHtml(p.trim())}</p>`)
    .join('');

  // ── Agenda ───────────────────────────────────────────────────────────────
  let agendaHtml = '';
  if (event.agenda && event.agenda.length > 0) {
    const rows = event.agenda.map(item => `
      <div class="agenda-row">
        <span class="agenda-time">${escapeHtml(item.time)}</span>
        <span class="agenda-title">${escapeHtml(item.title)}</span>
      </div>`).join('');
    agendaHtml = `
      <section class="detail-section">
        <h2 class="section-heading">Programme</h2>
        <div class="agenda-list">${rows}</div>
      </section>`;
  }

  // ── CTA buttons ──────────────────────────────────────────────────────────
  let ctaHtml = '';
  if (event.registrationUrl) {
    ctaHtml += `<a href="${escapeAttr(event.registrationUrl)}" class="btn-register" target="_blank" rel="noopener noreferrer">Register Now</a>`;
  }
  if (event.url) {
    ctaHtml += `<a href="${escapeAttr(event.url)}" class="btn-website" target="_blank" rel="noopener noreferrer">Visit Event Website</a>`;
  }

  // ── Add to calendar dropdown ─────────────────────────────────────────────
  const eid = escapeAttr(event.id);
  const calDropdown = `
    <div class="cal-dropdown-wrapper">
      <button class="btn-add-cal" data-event-id="${eid}" aria-haspopup="listbox" aria-expanded="false" style="width:auto;padding-left:1.4rem;padding-right:1.4rem;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Add to Calendar
      </button>
      <div class="cal-dropdown" id="cal-dropdown-${eid}" role="listbox">
        <button class="cal-option" data-action="apple"   data-event-id="${eid}">🍎 Apple Calendar</button>
        <button class="cal-option" data-action="google"  data-event-id="${eid}">📅 Google Calendar</button>
        <button class="cal-option" data-action="outlook" data-event-id="${eid}">📧 Outlook</button>
        <button class="cal-option" data-action="ics"     data-event-id="${eid}">⬇ Download .ics file</button>
      </div>
    </div>`;

  // ── Full render ───────────────────────────────────────────────────────────
  root.innerHTML = `
    <!-- Hero banner -->
    <div class="detail-hero">
      <div class="container detail-hero-inner">
        <a href="index.html" class="btn-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
          All Events
        </a>
        <span class="event-category ${escapeAttr(catClass)}" style="margin-top:.75rem;">${escapeHtml(event.category || 'Event')}</span>
        <h1 class="detail-title">${escapeHtml(event.title)}</h1>
        <div class="detail-meta-row">
          <div class="meta-item">
            <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>${escapeHtml(dateStr)}</span>
          </div>
          <div class="meta-item">
            <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>${escapeHtml(timeStr)}</span>
          </div>
          <div class="meta-item">
            <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${event.locationUrl
              ? `<a href="${escapeAttr(event.locationUrl)}" target="_blank" rel="noopener noreferrer" class="meta-location-link">${escapeHtml(event.location || '')}</a>`
              : `<span>${escapeHtml(event.location || '')}</span>`}
          </div>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div class="detail-body container">
      <div class="detail-content">

        <!-- Description / Details -->
        <section class="detail-section">
          <h2 class="section-heading">About this event</h2>
          <div class="detail-description">${detailsHtml}</div>
        </section>

        ${agendaHtml}

      </div><!-- /detail-content -->

      <!-- Sidebar -->
      <aside class="detail-sidebar">
        <div class="sidebar-card">
          <h3>Date &amp; Time</h3>
          <p>${escapeHtml(dateStr)}</p>
          <p style="color:var(--text-muted);font-size:.85rem;">${escapeHtml(timeStr)}</p>
        </div>
        <div class="sidebar-card">
          <h3>Location</h3>
          <p>${event.locationUrl
            ? `<a href="${escapeAttr(event.locationUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(event.location || '')}</a>`
            : escapeHtml(event.location || '')}</p>
        </div>
        <div class="sidebar-actions">
          ${ctaHtml}
          ${calDropdown}
        </div>
      </aside>

    </div><!-- /detail-body -->
  `;

  // ── Bind calendar dropdown events ────────────────────────────────────────
  root.querySelectorAll('.btn-add-cal').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const dropdown = document.getElementById(`cal-dropdown-${btn.dataset.eventId}`);
      dropdown.classList.toggle('open');
    });
  });

  root.querySelectorAll('.cal-option').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      handleCalendarOption(btn.dataset.action, btn.dataset.eventId);
      document.getElementById(`cal-dropdown-${btn.dataset.eventId}`).classList.remove('open');
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.cal-dropdown.open').forEach(d => d.classList.remove('open'));
  });
}

// Re-use helper functions from app.js
function handleCalendarOption(action, eventId) {
  const event = window.__EVENTS__.events.find(e => e.id === eventId);
  if (!event) return;
  if (action === 'google') {
    openGoogleCalendar(event);
  } else {
    downloadICS(event);
  }
}

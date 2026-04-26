#!/usr/bin/env python3
"""
Generate calendar.ics from events.json
Run: python scripts/generate_ics.py
"""

import json
import re
import sys
from pathlib import Path


def escape_ics(text: str) -> str:
    """Escape special characters per RFC 5545."""
    text = str(text)
    text = text.replace('\\', '\\\\')
    text = text.replace(';', '\\;')
    text = text.replace(',', '\\,')
    text = text.replace('\r\n', '\\n').replace('\n', '\\n').replace('\r', '\\n')
    return text


def fold_line(line: str) -> str:
    """
    Fold ICS content lines to max 75 octets per RFC 5545 §3.1.
    Continuation lines are prefixed with a single space.
    """
    encoded = line.encode('utf-8')
    if len(encoded) <= 75:
        return line

    chunks = []
    current_bytes = b''
    current_str = ''
    first = True

    for char in line:
        char_bytes = char.encode('utf-8')
        limit = 75 if first else 74  # continuation lines have a leading space (1 byte)
        if len(current_bytes) + len(char_bytes) > limit:
            chunks.append(current_str)
            current_bytes = b' ' + char_bytes
            current_str = ' ' + char
            first = False
        else:
            current_bytes += char_bytes
            current_str += char

    if current_str:
        chunks.append(current_str)

    return '\r\n'.join(chunks)


def format_dt(dt_str: str) -> str:
    """Convert ISO 8601 datetime string to ICS DATETIME format."""
    # "2026-05-15T09:00:00" → "20260515T090000"
    cleaned = re.sub(r'[-:]', '', dt_str)
    # Remove milliseconds if present
    cleaned = re.sub(r'\.\d+', '', cleaned)
    return cleaned


def build_vevent(event: dict) -> list[str]:
    """Build VEVENT lines for a single event."""
    tz  = event.get('timezone', 'Europe/Brussels')
    uid = f'{event["id"]}@youth-eu'

    from datetime import datetime, timezone as tz_utc
    now = datetime.now(tz_utc.utc).strftime('%Y%m%dT%H%M%SZ')

    lines = [
        'BEGIN:VEVENT',
        f'UID:{uid}',
        f'DTSTAMP:{now}',
        f'DTSTART;TZID={tz}:{format_dt(event["start"])}',
        f'DTEND;TZID={tz}:{format_dt(event["end"])}',
        fold_line(f'SUMMARY:{escape_ics(event["title"])}'),
        fold_line(f'DESCRIPTION:{escape_ics(event.get("description", ""))}'),
        fold_line(f'LOCATION:{escape_ics(event.get("location", ""))}'),
        f'CATEGORIES:{escape_ics(event.get("category", "Event"))}',
    ]

    if event.get('url'):
        lines.append(f'URL:{event["url"]}')

    lines.append('END:VEVENT')
    return lines


def generate_calendar(data: dict) -> str:
    """Generate full VCALENDAR ICS content from the events data dict."""
    cal_name = escape_ics(data.get('name', 'Calendar'))
    cal_desc = escape_ics(data.get('description', ''))

    lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Youth EU//Events Calendar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        fold_line(f'X-WR-CALNAME:{cal_name}'),
        fold_line(f'X-WR-CALDESC:{cal_desc}'),
        'X-WR-TIMEZONE:Europe/Brussels',
        'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
        'X-PUBLISHED-TTL:PT12H',
        'X-APPLE-CALENDAR-COLOR:#003399',
    ]

    for event in data.get('events', []):
        lines.extend(build_vevent(event))

    lines.append('END:VCALENDAR')
    return '\r\n'.join(lines)


def inject_inline_events(data: dict, html_file: Path) -> None:
    """
    Replace the inline window.__EVENTS__ block in index.html with fresh data.
    The block is delimited by <!-- EVENTS_DATA_START --> and <!-- EVENTS_DATA_END -->.
    """
    if not html_file.exists():
        print(f'WARNING: {html_file.name} not found, skipping inline injection.', file=sys.stderr)
        return

    content = html_file.read_text(encoding='utf-8')
    start_marker = '<!-- EVENTS_DATA_START -->'
    end_marker   = '<!-- EVENTS_DATA_END -->'

    start_idx = content.find(start_marker)
    end_idx   = content.find(end_marker)

    if start_idx == -1 or end_idx == -1:
        print('WARNING: EVENTS_DATA markers not found in index.html, skipping.', file=sys.stderr)
        return

    inline_json = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    new_block = (
        f'{start_marker}\n'
        f'  <script>\n'
        f'  window.__EVENTS__ = {inline_json};\n'
        f'  </script>\n'
        f'  {end_marker}'
    )

    new_content = content[:start_idx] + new_block + content[end_idx + len(end_marker):]
    html_file.write_text(new_content, encoding='utf-8')


def main():
    project_root = Path(__file__).resolve().parent.parent
    events_file  = project_root / 'events.json'
    output_file  = project_root / 'calendar.ics'

    if not events_file.exists():
        print(f'ERROR: {events_file} not found.', file=sys.stderr)
        sys.exit(1)

    with events_file.open('r', encoding='utf-8') as f:
        data = json.load(f)

    ics_content = generate_calendar(data)

    # Write with CRLF line endings (required by RFC 5545)
    with output_file.open('w', encoding='utf-8', newline='') as f:
        f.write(ics_content)

    # Inject inline JSON into index.html and event.html so they work on file:// too
    for html_name in ('index.html', 'event.html'):
        inject_inline_events(data, project_root / html_name)

    total = len(data.get('events', []))
    print(f'✓ Generated {output_file.name} with {total} event(s).')
    print(f'✓ Injected inline events data into index.html and event.html.')


if __name__ == '__main__':
    main()

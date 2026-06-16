import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import scheduleXml from './data/schedule.xml?raw';
import opensouthcodeLogo from './assets/opensouthcode-logo.png';
import './styles.css';

const translations = {
  en: {
    eyebrow: 'Schedule',
    title: 'OpenSouthCode 2026',
    search: 'Search title or speaker',
    language: 'Language',
    all: 'All sessions',
    noResults: 'No sessions match this search.',
    speakers: 'Speakers',
    room: 'Room',
    type: 'Type',
    sessionLanguage: 'Session language',
    duration: 'Duration',
    close: 'Close',
    clearSearch: 'Clear search',
    openSource: 'Source schedule',
    events: 'sessions',
    today: 'today',
    filtered: 'filtered',
    details: 'Details',
    star: 'Save session',
    unstar: 'Remove saved session',
    starredOnly: 'Show saved sessions',
  },
  es: {
    eyebrow: 'Programa',
    title: 'OpenSouthCode 2026',
    search: 'Buscar por título o ponente',
    language: 'Idioma',
    all: 'Todas las sesiones',
    noResults: 'No hay sesiones que coincidan con la búsqueda.',
    speakers: 'Ponentes',
    room: 'Sala',
    type: 'Tipo',
    sessionLanguage: 'Idioma de la sesión',
    duration: 'Duración',
    close: 'Cerrar',
    clearSearch: 'Limpiar búsqueda',
    openSource: 'Programa original',
    events: 'sesiones',
    today: 'hoy',
    filtered: 'filtradas',
    details: 'Detalles',
    star: 'Guardar sesión',
    unstar: 'Quitar sesión guardada',
    starredOnly: 'Mostrar sesiones guardadas',
  },
};

const starredStorageKey = 'opensouthcode-2026-starred-sessions';

const dayLabels = {
  en: {
    '2026-06-26': { full: 'Friday 26', short: 'F26' },
    '2026-06-27': { full: 'Saturday 27', short: 'S27' },
  },
  es: {
    '2026-06-26': { full: 'Viernes 26', short: 'V26' },
    '2026-06-27': { full: 'Sábado 27', short: 'S27' },
  },
};

const minuteHeight = 1.35;

function text(node, selector) {
  return node.querySelector(selector)?.textContent?.trim() ?? '';
}

function minutesFromTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function durationToMinutes(duration) {
  const [hours, minutes] = duration.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatDuration(minutes, locale) {
  if (minutes < 60) {
    return locale === 'es' ? `${minutes} min` : `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  const hourLabel = locale === 'es' ? 'h' : 'h';
  return remaining ? `${hours}${hourLabel} ${remaining} min` : `${hours}${hourLabel}`;
}

function normalize(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function parseSchedule(xml) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const dayNodes = [...document.querySelectorAll('schedule > day')];

  return dayNodes.map((dayNode) => {
    const rooms = [...dayNode.children].filter((child) => child.tagName === 'room').map((roomNode) => {
      const events = [...roomNode.children].filter((child) => child.tagName === 'event').map((eventNode) => {
        const speakers = [...eventNode.querySelectorAll('persons > person')]
          .map((person) => person.textContent.trim())
          .filter(Boolean);
        const start = text(eventNode, 'start');
        const duration = durationToMinutes(text(eventNode, 'duration'));

        return {
          id: eventNode.getAttribute('id'),
          guid: eventNode.getAttribute('guid'),
          date: text(eventNode, 'date'),
          start,
          startMinutes: minutesFromTime(start),
          duration,
          room: text(eventNode, 'room'),
          type: text(eventNode, 'type'),
          language: text(eventNode, 'language'),
          slug: text(eventNode, 'slug'),
          title: text(eventNode, 'title'),
          subtitle: text(eventNode, 'subtitle'),
          abstract: text(eventNode, 'abstract'),
          speakers,
        };
      });

      return {
        name: roomNode.getAttribute('name'),
        events,
      };
    });

    const events = rooms.flatMap((room) => room.events);
    const min = Math.min(...events.map((event) => event.startMinutes));
    const max = Math.max(...events.map((event) => event.startMinutes + event.duration));

    return {
      date: dayNode.getAttribute('date'),
      index: dayNode.getAttribute('index'),
      rooms,
      startMinutes: Math.floor(min / 30) * 30,
      endMinutes: Math.ceil(max / 30) * 30 + 60,
    };
  });
}

function timeLabel(minutes) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mins = String(minutes % 60).padStart(2, '0');
  return `${hours}:${mins}`;
}

function App() {
  const schedule = useMemo(() => parseSchedule(scheduleXml), []);
  const [locale, setLocale] = useState('es');
  const [activeDay, setActiveDay] = useState(schedule[0]?.date);
  const [query, setQuery] = useState('');
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [starredIds, setStarredIds] = useState(() => {
    const stored = window.localStorage.getItem(starredStorageKey);
    return new Set(stored ? JSON.parse(stored) : []);
  });
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const labels = translations[locale];
  const activeSchedule = schedule.find((day) => day.date === activeDay) ?? schedule[0];
  const normalizedQuery = normalize(query.trim());

  useEffect(() => {
    window.localStorage.setItem(starredStorageKey, JSON.stringify([...starredIds]));
  }, [starredIds]);

  function toggleStar(eventId) {
    setStarredIds((current) => {
      const next = new Set(current);

      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }

      return next;
    });
  }

  function handleCardClick(event) {
    if (expandedEventId === event.id) {
      setSelectedEvent(event);
      return;
    }

    setExpandedEventId(event.id);
  }

  function handleCardKeyDown(keyEvent, event) {
    if (keyEvent.key !== 'Enter' && keyEvent.key !== ' ') {
      return;
    }

    keyEvent.preventDefault();
    handleCardClick(event);
  }

  const displayRooms = useMemo(() => {
    return activeSchedule.rooms.map((room) => ({
      ...room,
      events: room.events.map((event) => {
        const haystack = normalize(`${event.title} ${event.subtitle} ${event.speakers.join(' ')}`);
        const isStarred = starredIds.has(event.id);
        return {
          ...event,
          isStarred,
          matchesSearch:
            (!normalizedQuery || haystack.includes(normalizedQuery)) &&
            (!showStarredOnly || isStarred),
        };
      }),
    }));
  }, [activeSchedule, normalizedQuery, showStarredOnly, starredIds]);

  const visibleCount = displayRooms.reduce(
    (count, room) => count + room.events.filter((event) => event.matchesSearch).length,
    0,
  );
  const hasFilter = Boolean(normalizedQuery) || showStarredOnly;
  const timelineHeight = (activeSchedule.endMinutes - activeSchedule.startMinutes) * minuteHeight;
  const ticks = [];

  for (let minute = activeSchedule.startMinutes; minute <= activeSchedule.endMinutes; minute += 30) {
    ticks.push(minute);
  }

  return (
    <>
      <main className="app-shell">
        <section className="hero">
          <div className="hero-title">
            <img src={opensouthcodeLogo} alt="OpenSouthCode" className="hero-logo" />
            <div>
              <p className="eyebrow">{labels.eyebrow}</p>
              <h1>{labels.title}</h1>
            </div>
          </div>
          <div className="hero-actions">
            <a
              className="hero-link"
              href="https://www.opensouthcode.org/conferences/opensouthcode2026/schedule"
            >
              {labels.openSource}
            </a>
            <div className="locale-switcher" aria-label={labels.language}>
              <div className="locale-toggle" role="group">
                <button
                  className={locale === 'es' ? 'active' : ''}
                  type="button"
                  onClick={() => setLocale('es')}
                  aria-pressed={locale === 'es'}
                >
                  ES
                </button>
                <button
                  className={locale === 'en' ? 'active' : ''}
                  type="button"
                  onClick={() => setLocale('en')}
                  aria-pressed={locale === 'en'}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="toolbar" aria-label="Schedule filters">
          <div className="day-tabs" role="tablist" aria-label="Conference days">
            {schedule.map((day) => (
              <button
                className={day.date === activeDay ? 'active' : ''}
                key={day.date}
                onClick={() => setActiveDay(day.date)}
                role="tab"
                aria-selected={day.date === activeDay}
                aria-label={dayLabels[locale][day.date]?.full ?? day.date}
              >
                <span className="day-label-full">
                  {dayLabels[locale][day.date]?.full ?? day.date}
                </span>
                <span className="day-label-short">
                  {dayLabels[locale][day.date]?.short ?? day.date}
                </span>
              </button>
            ))}
          </div>

          <div className="search-cluster">
            <label className="search-box">
              <input
                type="search"
                aria-label={labels.search}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.search}
              />
            </label>
            <button
              className={`star-button star-filter ${showStarredOnly ? 'active' : ''}`}
              type="button"
              onClick={() => setShowStarredOnly((active) => !active)}
              aria-pressed={showStarredOnly}
              aria-label={labels.starredOnly}
              title={labels.starredOnly}
            >
              {showStarredOnly ? '★' : '☆'}
            </button>
            <span className={`result-count ${hasFilter ? 'active' : ''}`} title={`${visibleCount} ${labels.events}`}>
              {visibleCount}
            </span>
          </div>
        </section>

        <section className="schedule-wrap" aria-label={labels.title}>
          <div
            className="schedule-grid"
            style={{
              '--room-count': displayRooms.length,
              '--timeline-height': `${timelineHeight}px`,
            }}
          >
            <div className="time-header" />
            {displayRooms.map((room) => (
              <div className="room-header" key={room.name}>
                {room.name}
              </div>
            ))}

            <div className="time-rail" style={{ height: timelineHeight }}>
              {ticks.map((tick) => (
                <span
                  key={tick}
                  style={{ top: (tick - activeSchedule.startMinutes) * minuteHeight }}
                >
                  {timeLabel(tick)}
                </span>
              ))}
            </div>

            {displayRooms.map((room) => (
              <div className="room-column" key={room.name} style={{ height: timelineHeight }}>
                {ticks.map((tick) => (
                  <span
                    className="time-line"
                    key={tick}
                    style={{ top: (tick - activeSchedule.startMinutes) * minuteHeight }}
                  />
                ))}
                {room.events.map((event) => {
                  const eventHeight = event.duration * minuteHeight;
                  const expandedHeight = (eventHeight < 78 ? 78 : eventHeight) * 1.2;
                  const isExpanded = expandedEventId === event.id;

                  return (
                    <article
                      className={`session-card session-${event.language || 'any'} ${
                        event.matchesSearch ? '' : 'session-dimmed'
                      } ${isExpanded ? 'expanded' : ''}`}
                      key={event.guid}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleCardClick(event)}
                      onKeyDown={(keyEvent) => handleCardKeyDown(keyEvent, event)}
                      onFocus={() => setExpandedEventId(event.id)}
                      onMouseEnter={() => setExpandedEventId(event.id)}
                      onMouseLeave={() =>
                        setExpandedEventId((current) => (current === event.id ? null : current))
                      }
                      style={{
                        top: (event.startMinutes - activeSchedule.startMinutes) * minuteHeight,
                        height: eventHeight,
                        '--expanded-height': `${expandedHeight}px`,
                      }}
                    >
                      <button
                        className={`star-button session-star ${event.isStarred ? 'active' : ''}`}
                        type="button"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          toggleStar(event.id);
                        }}
                        onKeyDown={(keyEvent) => keyEvent.stopPropagation()}
                        aria-pressed={event.isStarred}
                        aria-label={event.isStarred ? labels.unstar : labels.star}
                        title={event.isStarred ? labels.unstar : labels.star}
                      >
                        {event.isStarred ? '★' : '☆'}
                      </button>
                      <strong>{event.title}</strong>
                      {event.speakers.length > 0 && <span>{event.speakers.join(', ')}</span>}
                    </article>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      </main>

      {selectedEvent && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setSelectedEvent(null)}
        >
          <article className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <button className="close-button" onClick={() => setSelectedEvent(null)} aria-label={labels.close}>
                ×
              </button>
              <p className="eyebrow">
                {dayLabels[locale][selectedEvent.date.slice(0, 10)]?.full} · {selectedEvent.start} ·{' '}
                {formatDuration(selectedEvent.duration, locale)}
              </p>
              <h2>{selectedEvent.title}</h2>
              {selectedEvent.subtitle && <h3>{selectedEvent.subtitle}</h3>}
            </header>
            <div className="modal-body">
              <dl className="event-details">
                <div>
                  <dt>{labels.speakers}</dt>
                  <dd>{selectedEvent.speakers.join(', ')}</dd>
                </div>
                <div>
                  <dt>{labels.room}</dt>
                  <dd>{selectedEvent.room}</dd>
                </div>
                <div>
                  <dt>{labels.type}</dt>
                  <dd>{selectedEvent.type || labels.all}</dd>
                </div>
                <div>
                  <dt>{labels.sessionLanguage}</dt>
                  <dd>{selectedEvent.language?.toUpperCase() || '-'}</dd>
                </div>
              </dl>
              {selectedEvent.abstract && <p className="abstract">{selectedEvent.abstract}</p>}
            </div>
          </article>
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);

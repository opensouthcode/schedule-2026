import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import scheduleXml from './data/schedule.xml?raw';
import opensouthcodeLogo from './assets/opensouthcode-logo.png';
import donationsBg from './assets/donations-bg.jpg';
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
    openSource: 'Website',
    events: 'sessions',
    today: 'today',
    filtered: 'filtered',
    details: 'Details',
    star: 'Save session',
    unstar: 'Remove saved session',
    starredOnly: 'Show saved sessions',
    donations: 'Donors',
    donationsTitle: 'Donations',
    donationsRegisterPrefix: 'The conference is free to attend; you only need to register on the',
    donationsRegisterLink: 'website',
    donationsCausePrefix:
      'If you want a T-shirt, or want to join the Fiesta Malaguita on Friday night, you need to donate to the charity cause. This year all proceeds go entirely to',
    donationsTickets: 'Tickets here:',
    donationsBoth: 'T-shirt or dinner? Why not both!',
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
    openSource: 'Website',
    events: 'sesiones',
    today: 'hoy',
    filtered: 'filtradas',
    details: 'Detalles',
    star: 'Guardar sesión',
    unstar: 'Quitar sesión guardada',
    starredOnly: 'Mostrar sesiones guardadas',
    donations: 'Donors',
    donationsTitle: 'Donaciones',
    donationsRegisterPrefix: 'La conferencia es de libre acceso, solo tienes que registrarte en la',
    donationsRegisterLink: 'web',
    donationsCausePrefix:
      'Si quieres una Camiseta, o quieres participar en la Fiesta Malaguita del viernes por la noche, se requiere donar a la causa solidaria. Este año todo lo recaudado va íntegramente a',
    donationsTickets: 'Tickets aquí:',
    donationsBoth: '¿Camiseta o Cena? Why not both!',
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
  const [clickedExpandedEventId, setClickedExpandedEventId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDonations, setShowDonations] = useState(false);
  const cardRefs = useRef(new Map());
  const labels = translations[locale];
  const activeSchedule = schedule.find((day) => day.date === activeDay) ?? schedule[0];
  const normalizedQuery = normalize(query.trim());

  useEffect(() => {
    window.localStorage.setItem(starredStorageKey, JSON.stringify([...starredIds]));
  }, [starredIds]);

  useEffect(() => {
    if (!selectedEvent && !showDonations) {
      return undefined;
    }

    const root = document.documentElement;
    const viewport = window.visualViewport;

    function updateModalViewport() {
      root.style.setProperty('--modal-vv-left', `${viewport?.offsetLeft ?? 0}px`);
      root.style.setProperty('--modal-vv-top', `${viewport?.offsetTop ?? 0}px`);
      root.style.setProperty('--modal-vv-width', `${viewport?.width ?? window.innerWidth}px`);
      root.style.setProperty('--modal-vv-height', `${viewport?.height ?? window.innerHeight}px`);
    }

    updateModalViewport();
    document.body.classList.add('modal-open');
    viewport?.addEventListener('resize', updateModalViewport);
    viewport?.addEventListener('scroll', updateModalViewport);

    return () => {
      document.body.classList.remove('modal-open');
      viewport?.removeEventListener('resize', updateModalViewport);
      viewport?.removeEventListener('scroll', updateModalViewport);
      root.style.removeProperty('--modal-vv-left');
      root.style.removeProperty('--modal-vv-top');
      root.style.removeProperty('--modal-vv-width');
      root.style.removeProperty('--modal-vv-height');
    };
  }, [selectedEvent, showDonations]);

  useEffect(() => {
    if (!clickedExpandedEventId) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      cardRefs.current.get(clickedExpandedEventId)?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'smooth',
      });
      setClickedExpandedEventId(null);
    }, 440);

    return () => window.clearTimeout(timeoutId);
  }, [clickedExpandedEventId]);

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
    setClickedExpandedEventId(event.id);
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
            <button className="hero-link donor-link" type="button" onClick={() => setShowDonations(true)}>
              {labels.donations}
            </button>
            <a
              className="hero-link github-link"
              href="https://github.com/opensouthcode/schedule-2026"
              aria-label="GitHub repository"
              title="GitHub repository"
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.65 7.65 0 0 1 8 3.87c.68 0 1.36.09 2 .26 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
                />
              </svg>
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
                      ref={(node) => {
                        if (node) {
                          cardRefs.current.set(event.id, node);
                        } else {
                          cardRefs.current.delete(event.id);
                        }
                      }}
                      className={`session-card session-${event.language || 'any'} ${
                        event.matchesSearch ? '' : 'session-dimmed'
                      } ${isExpanded ? 'expanded' : ''}`}
                      key={event.guid}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleCardClick(event)}
                      onKeyDown={(keyEvent) => handleCardKeyDown(keyEvent, event)}
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

      {showDonations && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setShowDonations(false)}
        >
          <article className="modal-card donation-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="donation-modal-bg" style={{ backgroundImage: `url(${donationsBg})` }} />
            <header className="modal-header">
              <button className="close-button" onClick={() => setShowDonations(false)} aria-label={labels.close}>
                ×
              </button>
              <p className="eyebrow">OpenSouthCode 2026</p>
              <h2>{labels.donationsTitle}</h2>
            </header>
            <div className="modal-body donation-copy">
              <p>
                {labels.donationsRegisterPrefix}{' '}
                <a href="https://www.opensouthcode.org/conferences/opensouthcode2026/register/new">
                  {labels.donationsRegisterLink}
                </a>
                .
              </p>
              <p>
                {labels.donationsCausePrefix}{' '}
                <a href="http://civio.es/">Fundación Civio</a>.
              </p>
              <p>
                {labels.donationsTickets}{' '}
                <a href="https://www.eventbrite.es/e/opensouthcode-2026-tickets-1991388009142">
                  Eventbrite
                </a>
              </p>
              <p className="donation-punchline">{labels.donationsBoth}</p>
            </div>
          </article>
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);

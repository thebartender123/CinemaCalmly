"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ShowtimeListing } from "@/types/cinema";

type Props = {
  listings: ShowtimeListing[];
};

type ViewMode = "movies" | "times" | "theaters";

const taglineOptions = [
  "HTX showtimes without fuss.",
  "HTX showtimes, without the noise.",
  "Séances HTX, sans détour.",
  "Horaires ciné HTX, sans complications.",
  "Orari cinema HTX, senza fronzoli.",
  "Programmazione HTX, senza rumore.",
  "Horarios de cine HTX, sin rodeos.",
  "Cartelera HTX, sin distracciones.",
  "HTX-Showtimes, ohne Umwege.",
  "HTX-Kinozeiten, ohne Schnickschnack.",
  "HTX-visningar utan krångel.",
  "HTX-biotider, utan brus.",
  "HTXの上映時間を、すっきりと。",
  "HTXの映画時間を、静かに。"
];

const modes: { id: ViewMode; title: string; description: string }[] = [
  { id: "movies", title: "Movies", description: "Browse by title" },
  { id: "times", title: "Showtimes", description: "Browse by showtime" },
  { id: "theaters", title: "Theaters", description: "Browse by venue" }
];

const showtimeWindows = [
  { id: "prior-to-noon", title: "Morning", description: "Before 12 p.m.", min: 0, max: 719 },
  { id: "early-afternoon", title: "Early afternoon", description: "12-3:59 p.m.", min: 720, max: 959 },
  { id: "late-afternoon", title: "Late afternoon", description: "4-6:59 p.m.", min: 960, max: 1139 },
  { id: "evening", title: "Evening", description: "7 p.m. and later", min: 1140, max: 1439 }
];

const posterPalettes = [
  { background: "#ebe5dc", accent: "#a63f2f", ink: "#071426" },
  { background: "#dde6e1", accent: "#2f6c66", ink: "#071426" },
  { background: "#ece8d6", accent: "#9b6a22", ink: "#071426" },
  { background: "#e4e4e7", accent: "#3b4f6b", ink: "#071426" },
  { background: "#eadfde", accent: "#8f3b4a", ink: "#071426" }
];

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatWeekdayLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC"
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatMonthDayLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatTimeLabel(time: string) {
  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  const clock = `${displayHour}:${minute}`;

  return { clock, period, label: `${clock} ${period}` };
}

function formatPreviewTime(time: string) {
  const { clock, period } = formatTimeLabel(time);
  return `${clock} ${period === "AM" ? "a.m." : "p.m."}`;
}

function minutesFromTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function listingIsInWindow(listing: ShowtimeListing, window: (typeof showtimeWindows)[number]) {
  const minutes = minutesFromTime(listing.startTime);
  return minutes >= window.min && minutes <= window.max;
}

function compactMeta(parts: Array<string | number | null | undefined>) {
  return parts
    .map((part) => (typeof part === "number" ? String(part) : part?.trim()))
    .filter((part): part is string => Boolean(part))
    .join(" / ");
}

function hashString(value: string) {
  return Array.from(value).reduce((total, char) => (total * 31 + char.charCodeAt(0)) % 9973, 7);
}

function posterPalette(id: string) {
  return posterPalettes[hashString(id) % posterPalettes.length];
}

function titleInitials(title: string) {
  const words = title
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const meaningfulWords = words.filter(
    (word) => !["a", "an", "and", "at", "in", "of", "the"].includes(word.toLowerCase())
  );
  const sourceWords = meaningfulWords.length > 0 ? meaningfulWords : words;
  const initials = sourceWords.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join("");

  return initials || "CC";
}

function showtimeCountLabel(count: number) {
  return `${count} showtime${count === 1 ? "" : "s"}`;
}

function movieMeta(movie: ShowtimeListing["movie"]) {
  return compactMeta([
    movie.director,
    movie.releaseYear,
    movie.runtimeMinutes ? `${movie.runtimeMinutes} min` : ""
  ]);
}

function uniqueBy<T>(items: T[], getId: (item: T) => string) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const id = getId(item);
    if (seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
}

function sortByShowtime(items: ShowtimeListing[]) {
  return [...items].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
}

function shortTheaterName(name: string) {
  if (name.includes("Regal")) return "Regal";
  if (name.includes("River Oaks")) return "River Oaks";
  if (name.includes("MFAH")) return "MFAH";
  if (name.includes("IPIC")) return "IPIC";
  return name;
}

function PosterPlate({ movie, size = "small" }: { movie: ShowtimeListing["movie"]; size?: "small" | "large" }) {
  const palette = posterPalette(movie.id);
  const style: CSSProperties = { backgroundColor: palette.background, color: palette.ink };
  const accentStyle: CSSProperties = { backgroundColor: palette.accent };
  const sizeClass = size === "large" ? "aspect-[2/3] w-full max-w-64" : "h-28 w-20 sm:h-32 sm:w-24";

  return (
    <span
      className={`relative isolate grid shrink-0 place-items-center overflow-hidden rounded-md border border-line ${sizeClass}`}
      style={style}
      aria-hidden="true"
    >
      <span className="absolute left-3 top-3 h-1 w-9" style={accentStyle} />
      <span className="absolute bottom-3 right-3 h-10 w-1" style={accentStyle} />
      <span className="relative px-3 text-center text-lg font-semibold leading-none sm:text-xl">
        {titleInitials(movie.title)}
      </span>
    </span>
  );
}

export default function ShowtimeBrowser({ listings }: Props) {
  const dates = useMemo(() => Array.from(new Set(listings.map((listing) => listing.date))).sort(), [listings]);
  const [selectedDate, setSelectedDate] = useState(dates[0] ?? "");
  const [view, setView] = useState<ViewMode>("times");
  const [selectedMovieId, setSelectedMovieId] = useState("");
  const [selectedTheaterId, setSelectedTheaterId] = useState("");
  const [selectedShowtimeWindowId, setSelectedShowtimeWindowId] = useState("");
  const [selectedListingId, setSelectedListingId] = useState("");
  const [tagline, setTagline] = useState(taglineOptions[0]);
  const detailsRef = useRef<HTMLElement | null>(null);

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const dateMatches = selectedDate ? listing.date === selectedDate : true;

      return dateMatches;
    });
  }, [listings, selectedDate]);

  const movieCards = useMemo(() => {
    return uniqueBy(filteredListings, (listing) => listing.movie.id)
      .map((listing) => listing.movie)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [filteredListings]);

  const theaterCards = useMemo(() => {
    return uniqueBy(filteredListings, (listing) => listing.theater.id)
      .map((listing) => listing.theater)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredListings]);

  const selectedListing = useMemo(
    () => listings.find((listing) => listing.id === selectedListingId),
    [listings, selectedListingId]
  );

  useEffect(() => {
    if (!selectedListingId || !window.matchMedia("(max-width: 860px)").matches) {
      return;
    }

    detailsRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [selectedListingId]);

  useEffect(() => {
    setTagline(taglineOptions[Math.floor(Math.random() * taglineOptions.length)]);
  }, []);

  function resetSelection() {
    setSelectedListingId("");
  }

  function changeView(nextView: ViewMode) {
    setView(nextView);
    setSelectedMovieId("");
    setSelectedTheaterId("");
    setSelectedShowtimeWindowId("");
    resetSelection();
  }

  function renderBadges(tagsToRender: string[]) {
    if (tagsToRender.length === 0) {
      return null;
    }

    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {tagsToRender.map((tag) => (
          <span
            key={tag}
            className="inline-flex min-h-6 items-center whitespace-nowrap rounded-full border border-line bg-paper px-3 py-1 text-xs leading-none text-muted"
          >
            {tag}
          </span>
        ))}
      </div>
    );
  }

  function renderEmptyState(message: string) {
    return (
      <div className="rounded-md border border-line bg-card px-5 py-12 text-base leading-7 text-muted">
        {message}
      </div>
    );
  }

  function renderScreeningRows(rows: ShowtimeListing[], context: ViewMode) {
    if (rows.length === 0) {
      return renderEmptyState("No showtimes match those filters.");
    }

    return (
      <div className="grid gap-3">
        {rows.map((listing) => {
          const time = formatTimeLabel(listing.startTime);
          const active = listing.id === selectedListingId;
          const title = context === "movies" ? listing.theater.name : listing.movie.title;
          const meta =
            context === "movies"
              ? ""
              : context === "theaters"
                ? movieMeta(listing.movie)
                : compactMeta([
                    listing.movie.runtimeMinutes ? `${listing.movie.runtimeMinutes} min` : "",
                    listing.theater.name
                  ]);
          const showTags = context !== "movies";

          return (
            <button
              key={listing.id}
              className={`focus-ring group grid w-full gap-4 rounded-md border bg-card p-4 text-left transition duration-150 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-5 sm:p-5 ${
                active ? "border-accent bg-accentSoft" : "border-line hover:-translate-y-0.5 hover:border-accent/70"
              }`}
              type="button"
              onClick={() => setSelectedListingId(listing.id)}
            >
              <span className="flex flex-wrap items-baseline gap-x-2 sm:block">
                <span className="text-4xl font-semibold leading-none text-ink sm:block sm:text-5xl">{time.clock}</span>
                <span className="mt-1 text-sm uppercase tracking-[0.14em] text-muted sm:block">{time.period}</span>
              </span>
              <span className="min-w-0">
                <span className="block text-2xl font-semibold leading-tight text-ink">{title}</span>
                {meta ? <span className="mt-1 block text-sm leading-6 text-muted">{meta}</span> : null}
                {showTags ? renderBadges(listing.tags) : null}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  function renderMovieList() {
    if (movieCards.length === 0) {
      return renderEmptyState("No movies match those filters.");
    }

    return (
      <div className="tile-grid">
        {movieCards.map((movie) => {
          const movieListings = filteredListings.filter((listing) => listing.movie.id === movie.id);
          const preview = sortByShowtime(movieListings)
            .slice(0, 3)
            .map((listing) => ({
              id: listing.id,
              line: `${formatPreviewTime(listing.startTime)} ${shortTheaterName(listing.theater.name)}`
            }));

          return (
            <button
              key={movie.id}
              className="focus-ring group flex h-full w-full flex-col rounded-md border border-line bg-card p-5 text-left transition duration-150 hover:-translate-y-0.5 hover:border-accent/70"
              type="button"
              onClick={() => {
                setSelectedMovieId(movie.id);
                setSelectedTheaterId("");
                setSelectedShowtimeWindowId("");
                resetSelection();
              }}
            >
              <span className="min-w-0">
                <span className="block text-2xl font-semibold leading-tight text-ink">
                  {movie.title}
                </span>
                <span className="mt-2 block text-sm leading-6 text-muted">
                  {compactMeta([
                    movie.director || "Director unavailable",
                    movie.releaseYear,
                    movie.runtimeMinutes ? `${movie.runtimeMinutes} min` : ""
                  ])}
                </span>
              </span>
              <span className="mt-5 grid gap-2 border-t border-line pt-4 text-left text-xs leading-5 text-muted">
                <span className="font-medium uppercase tracking-[0.14em] text-accent">
                  {showtimeCountLabel(movieListings.length)}
                </span>
                {preview.map((item) => (
                  <span key={item.id}>{item.line}</span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  function renderTheaterList() {
    if (theaterCards.length === 0) {
      return renderEmptyState("No theaters match those filters.");
    }

    return (
      <div className="tile-grid">
        {theaterCards.map((theater) => {
          const theaterListings = filteredListings.filter((listing) => listing.theater.id === theater.id);
          const preview = sortByShowtime(theaterListings)
            .slice(0, 3)
            .map((listing) => ({
              id: listing.id,
              line: `${formatPreviewTime(listing.startTime)} ${listing.movie.title}`
            }));

          return (
            <button
              key={theater.id}
              className="focus-ring group flex h-full w-full flex-col rounded-md border border-line bg-card p-5 text-left transition duration-150 hover:-translate-y-0.5 hover:border-accent/70"
              type="button"
              onClick={() => {
                setSelectedTheaterId(theater.id);
                setSelectedMovieId("");
                setSelectedShowtimeWindowId("");
                resetSelection();
              }}
            >
              <span className="min-w-0">
                <span className="block text-2xl font-semibold leading-tight text-ink">
                  {theater.name}
                </span>
                <span className="mt-2 block text-sm leading-6 text-muted">
                  {compactMeta([theater.neighborhood, theater.area, theater.venueType])}
                </span>
              </span>
              <span className="mt-5 grid gap-2 border-t border-line pt-4 text-left text-xs leading-5 text-muted">
                <span className="font-medium uppercase tracking-[0.14em] text-accent">
                  {showtimeCountLabel(theaterListings.length)}
                </span>
                {preview.map((item) => (
                  <span key={item.id}>{item.line}</span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  function renderScopeHeader(title: string) {
    return (
      <section className="mb-4 rounded-md border border-line bg-card px-5 py-4">
        <h2 className="text-2xl font-semibold leading-tight text-ink">{title}</h2>
      </section>
    );
  }

  function renderShowtimeWindowList() {
    return (
      <div className="tile-grid">
        {showtimeWindows.map((window) => {
          const windowListings = filteredListings.filter((listing) => listingIsInWindow(listing, window));
          const preview = sortByShowtime(windowListings)
            .slice(0, 3)
            .map((listing) => ({
              id: listing.id,
              line: `${formatPreviewTime(listing.startTime)} ${listing.movie.title}`
            }));

          return (
            <button
              key={window.id}
              className="focus-ring group flex h-full w-full flex-col rounded-md border border-line bg-card p-5 text-left transition duration-150 hover:-translate-y-0.5 hover:border-accent/70"
              type="button"
              onClick={() => {
                setSelectedShowtimeWindowId(window.id);
                setSelectedMovieId("");
                setSelectedTheaterId("");
                resetSelection();
              }}
            >
              <span className="min-w-0">
                <span className="block text-2xl font-semibold leading-tight text-ink">
                  {window.title}
                </span>
                <span className="mt-2 block text-sm leading-6 text-muted">
                  {window.description}
                </span>
              </span>
              <span className="mt-5 grid gap-2 border-t border-line pt-4 text-left text-xs leading-5 text-muted">
                <span className="font-medium uppercase tracking-[0.14em] text-accent">
                  {showtimeCountLabel(windowListings.length)}
                </span>
                {preview.length > 0
                  ? preview.map((item) => <span key={item.id}>{item.line}</span>)
                  : <span>No matching showtimes</span>}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  function renderContent() {
    if (view === "movies") {
      if (selectedMovieId) {
        const movieListings = filteredListings.filter((listing) => listing.movie.id === selectedMovieId);
        const movie = listings.find((listing) => listing.movie.id === selectedMovieId)?.movie;

        return (
          <>
            {renderScopeHeader(movie?.title ?? "Movie")}
            {renderScreeningRows(movieListings, "movies")}
          </>
        );
      }

      return renderMovieList();
    }

    if (view === "theaters") {
      if (selectedTheaterId) {
        const theaterListings = filteredListings.filter((listing) => listing.theater.id === selectedTheaterId);
        const theater = listings.find((listing) => listing.theater.id === selectedTheaterId)?.theater;

        return (
          <>
            {renderScopeHeader(theater?.name ?? "Theater")}
            {renderScreeningRows(theaterListings, "theaters")}
          </>
        );
      }

      return renderTheaterList();
    }

    if (selectedShowtimeWindowId) {
      const showtimeWindow = showtimeWindows.find((window) => window.id === selectedShowtimeWindowId);
      const windowListings = showtimeWindow
        ? filteredListings.filter((listing) => listingIsInWindow(listing, showtimeWindow))
        : filteredListings;

      return (
        <>
          {renderScopeHeader(showtimeWindow?.title ?? "Showtimes")}
          {renderScreeningRows(windowListings, "times")}
        </>
      );
    }

    return renderShowtimeWindowList();
  }

  function renderDetails() {
    if (!selectedListing) {
      return null;
    }

    const movie = selectedListing.movie;
    const theater = selectedListing.theater;
    const time = formatTimeLabel(selectedListing.startTime);

    return (
      <article className="rounded-md border border-line bg-card p-5">
        <div className="mb-5">
          <PosterPlate movie={movie} size="large" />
        </div>

        <p className="text-xs uppercase tracking-[0.2em] text-accent">Selected showtime</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight text-ink">{movie.title}</h2>
        <p className="mt-3 text-base leading-7 text-muted">{movieMeta(movie)}</p>

        <dl className="mt-5 grid gap-3">
          <div className="border-t border-line pt-3">
            <dt className="text-[0.68rem] uppercase tracking-[0.18em] text-muted">Showtime</dt>
            <dd className="mt-1 text-sm leading-6 text-ink">
              {time.label} / {formatDateLabel(selectedListing.date)}
            </dd>
          </div>
          <div className="border-t border-line pt-3">
            <dt className="text-[0.68rem] uppercase tracking-[0.18em] text-muted">Theater</dt>
            <dd className="mt-1 text-sm leading-6 text-ink">
              {theater.name}
            </dd>
          </div>
          <div className="border-t border-line pt-3">
            <dt className="text-[0.68rem] uppercase tracking-[0.18em] text-muted">Driving distance</dt>
            <dd className="mt-1 text-sm leading-6 text-ink">ZIP distance placeholder</dd>
          </div>
        </dl>

        <p className="mt-4 text-base leading-7 text-muted">{movie.synopsis}</p>
        {renderBadges(selectedListing.tags)}
      </article>
    );
  }

  const layoutBase =
    "mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-[98rem] gap-6 px-5 py-5 sm:px-7 md:grid-cols-[18rem_minmax(0,1fr)] md:gap-8 md:py-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:px-8 lg:py-10";
  const layoutClass = selectedListing
    ? `${layoutBase} xl:grid-cols-[20rem_minmax(26rem,1fr)_minmax(18rem,23rem)]`
    : `${layoutBase} xl:grid-cols-[20rem_minmax(0,1fr)]`;

  return (
    <main className={layoutClass}>
      <aside className="order-1 md:order-none md:sticky md:top-8 md:h-[calc(100vh-4rem)] md:overflow-y-auto md:overscroll-contain md:pb-8 md:pr-2 md:[scrollbar-gutter:stable]">
        <div className="max-w-xl md:max-w-none">
          <h1 className="text-[3.45rem] font-semibold leading-[0.92] tracking-normal text-ink sm:text-[3.85rem] md:text-[3.7rem] lg:text-[4.2rem]">
            <span className="block">Cinema,</span>
            <span className="block">calmly found.</span>
          </h1>
          <p className="mt-4 max-w-sm text-base leading-7 text-muted md:mt-5">
            {tagline}
          </p>

          <div className="mt-6 md:mt-8">
            <h2 className="mb-2 text-sm font-medium text-ink">Pick an approach</h2>
            <nav className="overflow-hidden rounded-md border border-line bg-card" aria-label="Browse by">
            {modes.map((mode) => {
              const active = mode.id === view;

              return (
                <button
                  key={mode.id}
                  className={`focus-ring flex min-h-16 w-full items-center border-b border-line px-4 text-left last:border-b-0 ${
                    active ? "bg-ink text-paper" : "bg-card text-ink hover:bg-paper"
                  }`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => changeView(mode.id)}
                >
                  <span>
                    <span className="block text-sm font-semibold">{mode.title}</span>
                    <span className={`mt-1 block text-xs ${active ? "text-paper/70" : "text-muted"}`}>
                      {mode.description}
                    </span>
                  </span>
                </button>
              );
            })}
            </nav>
          </div>

          <div className="mt-5 md:mt-6">
            <section aria-labelledby="date-heading">
              <div className="mb-2 flex items-center justify-between gap-4">
                <h2 id="date-heading" className="text-sm font-medium text-ink">
                  Set the date
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {dates.map((date) => {
                  const active = date === selectedDate;

                  return (
                    <button
                      key={date}
                      className={`focus-ring flex min-h-14 flex-col items-start justify-center rounded-md border px-3 py-2 text-left text-sm transition ${
                        active
                          ? "border-ink bg-ink text-paper"
                          : "border-line bg-card text-ink hover:border-accent/70"
                      }`}
                      type="button"
                      onClick={() => {
                        setSelectedDate(date);
                        resetSelection();
                      }}
                    >
                      <span className="text-base font-medium leading-5">
                        {date === dates[0] ? "Today" : formatWeekdayLabel(date)}
                      </span>
                      <span className={`mt-1 text-xs leading-4 ${active ? "text-paper/75" : "text-muted"}`}>
                        {formatMonthDayLabel(date)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </aside>

      <section className="order-3 min-w-0 md:order-none" aria-live="polite">
        {renderContent()}
      </section>

      <aside
        ref={detailsRef}
        className={`order-2 min-w-0 border-t border-line pt-6 md:order-none md:col-start-2 md:border-l md:border-t-0 md:pl-6 md:pt-0 xl:sticky xl:top-8 xl:col-start-auto xl:h-[calc(100vh-4rem)] xl:overflow-y-auto xl:overscroll-contain xl:pb-8 xl:[scrollbar-gutter:stable] ${
          selectedListing ? "" : "hidden"
        }`}
      >
        {renderDetails()}
      </aside>
    </main>
  );
}

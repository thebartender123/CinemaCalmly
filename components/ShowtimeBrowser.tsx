"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ShowtimeListing } from "@/types/cinema";

type Props = {
  listings: ShowtimeListing[];
};

type ViewMode = "movies" | "times" | "theaters";

const modes: { id: ViewMode; title: string; description: string }[] = [
  { id: "movies", title: "Movies", description: "Browse by title" },
  { id: "times", title: "Showtimes", description: "Browse by showtime" },
  { id: "theaters", title: "Theaters", description: "Browse by venue" }
];

const showtimeWindows = [
  { id: "prior-to-noon", title: "Prior to noon", description: "Before 12 p.m.", min: 0, max: 719 },
  { id: "early-afternoon", title: "Early afternoon", description: "12-3:59 p.m.", min: 720, max: 959 },
  { id: "late-afternoon", title: "Late afternoon", description: "4-6:59 p.m.", min: 960, max: 1139 },
  { id: "evening", title: "Evening", description: "7 p.m. and later", min: 1140, max: 1439 }
];

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
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

function theaterLineForListings(items: ShowtimeListing[]) {
  return uniqueBy(items, (listing) => listing.theater.id)
    .map((listing) => listing.theater.name)
    .sort((a, b) => a.localeCompare(b))
    .join(" / ");
}

function matchesQuery(listing: ShowtimeListing, query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  const searchText = [
    listing.movie.title,
    listing.movie.director,
    listing.theater.name,
    ...listing.movie.movieTags,
    ...listing.theater.theaterTags,
    ...listing.tags
  ]
    .join(" ")
    .toLowerCase();

  return searchText.includes(normalized);
}

export default function ShowtimeBrowser({ listings }: Props) {
  const dates = useMemo(() => Array.from(new Set(listings.map((listing) => listing.date))).sort(), [listings]);
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(dates[0] ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>("times");
  const [selectedMovieId, setSelectedMovieId] = useState("");
  const [selectedTheaterId, setSelectedTheaterId] = useState("");
  const [selectedShowtimeWindowId, setSelectedShowtimeWindowId] = useState("");
  const [selectedListingId, setSelectedListingId] = useState("");
  const detailsRef = useRef<HTMLElement | null>(null);

  const tags = useMemo(
    () => Array.from(new Set(listings.flatMap((listing) => listing.tags))).sort((a, b) => a.localeCompare(b)),
    [listings]
  );

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const dateMatches = selectedDate ? listing.date === selectedDate : true;
      const tagMatches = selectedTags.every((tag) => listing.tags.includes(tag));

      return dateMatches && tagMatches && matchesQuery(listing, query);
    });
  }, [listings, query, selectedDate, selectedTags]);

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

  function resetSelection() {
    setSelectedListingId("");
  }

  function clearFilters() {
    setQuery("");
    setSelectedDate(dates[0] ?? "");
    setSelectedTags([]);
    setSelectedMovieId("");
    setSelectedTheaterId("");
    setSelectedShowtimeWindowId("");
    resetSelection();
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
    resetSelection();
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
            className="inline-flex min-h-6 items-center whitespace-nowrap rounded-full border border-line bg-wash px-3 py-1 text-xs leading-none text-ink"
          >
            {tag}
          </span>
        ))}
      </div>
    );
  }

  function renderScreeningRows(rows: ShowtimeListing[], context: ViewMode) {
    if (rows.length === 0) {
      return <div className="border-t border-line py-14 text-base text-muted">No showtimes match those filters.</div>;
    }

    return (
      <div className="divide-y divide-line border-t border-line">
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
              className={`focus-ring grid w-full gap-4 py-5 text-left transition sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-6 ${
                active ? "bg-ink/5" : "hover:bg-ink/5"
              }`}
              type="button"
              onClick={() => setSelectedListingId(listing.id)}
            >
              <span className="flex flex-wrap items-baseline gap-x-2 sm:block">
                <span className="font-serif text-4xl leading-none text-ink sm:block sm:text-5xl">{time.clock}</span>
                <span className="mt-1 text-sm uppercase tracking-[0.16em] text-muted sm:block">{time.period}</span>
              </span>
              <span className="min-w-0">
                <span className="block font-serif text-3xl leading-tight text-ink">{title}</span>
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
      return <div className="border-t border-line py-14 text-base text-muted">No movies match those filters.</div>;
    }

    return (
      <div className="divide-y divide-line border-t border-line">
        {movieCards.map((movie) => {
          const movieListings = filteredListings.filter((listing) => listing.movie.id === movie.id);
          const preview = sortByShowtime(movieListings)
            .slice(0, 3)
            .map((listing) => `${shortTheaterName(listing.theater.name)}, ${formatPreviewTime(listing.startTime)}`);

          return (
            <button
              key={movie.id}
              className="focus-ring grid w-full gap-4 py-5 text-left sm:grid-cols-[minmax(0,1fr)_minmax(10rem,16rem)] sm:gap-6"
              type="button"
              onClick={() => {
                setSelectedMovieId(movie.id);
                setSelectedTheaterId("");
                setSelectedShowtimeWindowId("");
                resetSelection();
              }}
            >
              <span className="min-w-0">
                <span className="block font-serif text-3xl leading-tight text-ink underline-offset-4 hover:underline">
                  {movie.title}
                </span>
                <span className="mt-1 block overflow-hidden text-sm leading-6 text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                  {theaterLineForListings(movieListings)}
                </span>
                <span className="mt-1 block text-sm leading-6 text-muted">
                  {movie.director || "Director unavailable"}
                </span>
                <span className="mt-1 block text-sm leading-6 text-muted">
                  {compactMeta([
                    movie.releaseYear,
                    movie.runtimeMinutes ? `${movie.runtimeMinutes} min` : "",
                    movie.languageDisplay
                  ])}
                </span>
              </span>
              <span className="grid gap-1 text-left text-xs leading-5 text-muted sm:text-right">
                {preview.map((line) => (
                  <span key={line}>{line}</span>
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
      return <div className="border-t border-line py-14 text-base text-muted">No theaters match those filters.</div>;
    }

    return (
      <div className="divide-y divide-line border-t border-line">
        {theaterCards.map((theater) => {
          const theaterListings = filteredListings.filter((listing) => listing.theater.id === theater.id);
          const preview = sortByShowtime(theaterListings)
            .slice(0, 3)
            .map((listing) => `${formatPreviewTime(listing.startTime)} ${listing.movie.title}`);

          return (
            <button
              key={theater.id}
              className="focus-ring grid w-full gap-4 py-5 text-left sm:grid-cols-[minmax(0,1fr)_minmax(10rem,16rem)] sm:gap-6"
              type="button"
              onClick={() => {
                setSelectedTheaterId(theater.id);
                setSelectedMovieId("");
                setSelectedShowtimeWindowId("");
                resetSelection();
              }}
            >
              <span className="min-w-0">
                <span className="block font-serif text-3xl leading-tight text-ink underline-offset-4 hover:underline">
                  {theater.name}
                </span>
                <span className="mt-1 block text-sm leading-6 text-muted">
                  {compactMeta([theater.neighborhood, theater.area])}
                </span>
                <span className="mt-1 block text-sm leading-6 text-muted">
                  {theater.venueType}
                </span>
              </span>
              <span className="grid gap-1 text-left text-xs leading-5 text-muted sm:text-right">
                {preview.map((line) => (
                  <span key={line}>{line}</span>
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
      <section className="mb-4 border-b border-line pb-5">
        <h2 className="mt-2 font-serif text-3xl leading-tight text-ink">{title}</h2>
      </section>
    );
  }

  function renderShowtimeWindowList() {
    return (
      <div className="divide-y divide-line border-t border-line">
        {showtimeWindows.map((window) => {
          const windowListings = filteredListings.filter((listing) => listingIsInWindow(listing, window));
          const preview = sortByShowtime(windowListings)
            .slice(0, 3)
            .map((listing) => `${formatPreviewTime(listing.startTime)} ${listing.movie.title}`);

          return (
            <button
              key={window.id}
              className="focus-ring grid w-full gap-4 py-5 text-left sm:grid-cols-[minmax(0,1fr)_minmax(10rem,16rem)] sm:gap-6"
              type="button"
              onClick={() => {
                setSelectedShowtimeWindowId(window.id);
                setSelectedMovieId("");
                setSelectedTheaterId("");
                resetSelection();
              }}
            >
              <span className="min-w-0">
                <span className="block font-serif text-3xl leading-tight text-ink underline-offset-4 hover:underline">
                  {window.title}
                </span>
                <span className="mt-1 block text-sm leading-6 text-muted">
                  {window.description}
                </span>
              </span>
              <span className="grid gap-1 text-left text-xs leading-5 text-muted sm:text-right">
                {preview.length > 0 ? preview.map((line) => <span key={line}>{line}</span>) : <span>No matching showtimes</span>}
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
      <article>
        <div className="mb-5 grid aspect-[2/3] w-full max-w-64 place-items-center border border-line bg-wash text-xs uppercase tracking-[0.22em] text-muted">
          Poster
        </div>

        <p className="text-xs uppercase tracking-[0.24em] text-muted">Selected showtime</p>
        <h2 className="mt-3 font-serif text-4xl leading-none text-ink">{movie.title}</h2>
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

  return (
    <main className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-[98rem] gap-7 px-5 py-5 sm:px-7 md:grid-cols-[18rem_minmax(0,1fr)] md:gap-8 md:py-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-10 lg:px-8 lg:py-10 xl:grid-cols-[20rem_minmax(26rem,1fr)_minmax(18rem,23rem)]">
      <aside className="order-1 md:order-none md:sticky md:top-8 md:h-[calc(100vh-4rem)] md:overflow-y-auto md:overscroll-contain md:pb-8 md:pr-2 md:[scrollbar-gutter:stable]">
        <div className="max-w-xl md:max-w-none">
          <h1 className="font-serif text-[4.25rem] leading-[0.9] tracking-normal text-ink sm:text-[5rem] md:text-[4.2rem] lg:text-[4.8rem]">
            <span className="block">Cinema,</span>
            <span className="block">calmly found.</span>
          </h1>
          <p className="mt-4 max-w-sm text-base leading-7 text-muted md:mt-5">
            A quieter way to browse Houston showtimes.
          </p>

          <nav className="mt-6 overflow-hidden rounded-md border border-line md:mt-8" aria-label="Browse by">
            {modes.map((mode) => {
              const active = mode.id === view;

              return (
                <button
                  key={mode.id}
                  className={`focus-ring flex min-h-16 w-full items-center border-b border-line px-4 text-left last:border-b-0 ${
                    active ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-ink hover:text-paper"
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

          <div className="mt-5 space-y-5 md:mt-6 md:space-y-6">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Search</span>
              <input
                className="focus-ring h-12 w-full rounded-md border border-line bg-paper px-4 text-base text-ink placeholder:text-muted"
                placeholder="Movies, theaters, tags..."
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  resetSelection();
                }}
              />
            </label>

            <section aria-labelledby="date-heading">
              <div className="mb-2 flex items-center justify-between gap-4">
                <h2 id="date-heading" className="text-sm font-medium text-ink">
                  Pick a date
                </h2>
              </div>
              <div className="grid gap-2">
                {dates.map((date) => {
                  const active = date === selectedDate;

                  return (
                    <button
                      key={date}
                      className={`focus-ring flex min-h-11 items-center justify-between rounded-md border px-4 text-left text-sm transition ${
                        active
                          ? "border-ink bg-ink text-paper"
                          : "border-line bg-paper text-ink hover:border-ink"
                      }`}
                      type="button"
                      onClick={() => {
                        setSelectedDate(date);
                        resetSelection();
                      }}
                    >
                      <span>{date === dates[0] ? "Today" : formatDateLabel(date).split(",")[0]}</span>
                      <span className={active ? "text-paper/75" : "text-muted"}>{formatDateLabel(date)}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="tag-heading">
              <h2 id="tag-heading" className="mb-2 text-sm font-medium text-ink">
                Tags
              </h2>
              <div className="grid grid-cols-2 gap-2 max-[430px]:grid-cols-1">
                {tags.map((tag) => {
                  const active = selectedTags.includes(tag);

                  return (
                    <button
                      key={tag}
                      className={`focus-ring flex min-h-11 min-w-0 items-center justify-between gap-2 overflow-hidden whitespace-nowrap rounded-full border px-4 text-left text-sm transition ${
                        active
                          ? "border-ink bg-ink text-paper"
                          : "border-line bg-paper text-ink hover:border-ink"
                      }`}
                      type="button"
                      onClick={() => toggleTag(tag)}
                    >
                      <span className="truncate">{tag}</span>
                      <span
                        className={`size-2 shrink-0 rounded-full border border-current ${active ? "bg-current" : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            </section>

            <button
              className="focus-ring min-h-11 rounded-md border border-line bg-paper px-4 text-sm text-ink transition hover:border-ink"
              type="button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        </div>
      </aside>

      <section className="order-3 min-w-0 md:order-none" aria-live="polite">
        {renderContent()}
      </section>

      <aside
        ref={detailsRef}
        className={`order-2 min-w-0 border-t border-line pt-6 md:order-none md:col-start-2 md:border-l md:border-t-0 md:pl-6 md:pt-0 xl:sticky xl:top-8 xl:col-start-auto xl:h-[calc(100vh-4rem)] xl:overflow-y-auto xl:overscroll-contain xl:pb-8 xl:[scrollbar-gutter:stable] ${
          selectedListing ? "" : "hidden md:block md:border-l-transparent"
        }`}
      >
        {renderDetails()}
      </aside>
    </main>
  );
}

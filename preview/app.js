const state = {
  query: "",
  selectedDate: "",
  selectedTags: new Set(),
  view: "times",
  selectedMovieId: "",
  selectedTheaterId: "",
  selectedShowtimeWindowId: "",
  selectedListingId: "",
  listings: []
};

const elements = {
  search: document.querySelector("#search"),
  dates: document.querySelector("#dates"),
  tags: document.querySelector("#tags"),
  clear: document.querySelector("#clear"),
  count: document.querySelector("#count"),
  content: document.querySelector("#content"),
  details: document.querySelector("#details"),
  modeButtons: document.querySelectorAll("[data-view]")
};

const showtimeWindows = [
  { id: "prior-to-noon", title: "Prior to noon", description: "Before 12 p.m.", min: 0, max: 719 },
  { id: "early-afternoon", title: "Early afternoon", description: "12-3:59 p.m.", min: 720, max: 959 },
  { id: "late-afternoon", title: "Late afternoon", description: "4-6:59 p.m.", min: 960, max: 1139 },
  { id: "evening", title: "Evening", description: "7 p.m. and later", min: 1140, max: 1439 }
];

function byId(records) {
  return new Map(records.map((record) => [record.id, record]));
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatTime(time) {
  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);
  const period = hour >= 12 ? "PM" : "AM";
  const clock = `${hour % 12 || 12}:${minute}`;
  return { clock, period, label: `${clock} ${period}` };
}

function formatPreviewTime(time) {
  const { clock, period } = formatTime(time);
  return `${clock} ${period === "AM" ? "a.m." : "p.m."}`;
}

function minutesFromTime(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function listingIsInWindow(listing, window) {
  const minutes = minutesFromTime(listing.startTime);
  return minutes >= window.min && minutes <= window.max;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function compactMeta(parts) {
  return parts
    .filter((part) => part !== undefined && part !== null && String(part).trim() !== "")
    .map((part) => escapeHtml(part))
    .join(" &middot; ");
}

function movieMeta(movie) {
  return compactMeta([
    movie.director,
    movie.releaseYear,
    movie.runtimeMinutes ? `${movie.runtimeMinutes} min` : ""
  ]);
}

function allDates() {
  return [...new Set(state.listings.map((listing) => listing.date))].sort();
}

function allTags() {
  return [...new Set(state.listings.flatMap((listing) => listing.tags))].sort((a, b) => a.localeCompare(b));
}

function uniqueBy(records, getId) {
  const seen = new Set();
  return records.filter((record) => {
    const id = getId(record);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function sortByShowtime(listings) {
  return [...listings].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
}

function shortTheaterName(name) {
  if (name.includes("Regal")) return "Regal";
  if (name.includes("River Oaks")) return "River Oaks";
  if (name.includes("MFAH")) return "MFAH";
  if (name.includes("IPIC")) return "IPIC";
  return name;
}

function previewLines(listings, getLine) {
  const lines = sortByShowtime(listings).slice(0, 3).map(getLine);
  if (!lines.length) return "";
  return `<span class="entity-preview">${lines.map((line) => `<span>${escapeHtml(line)}</span>`).join("")}</span>`;
}

function theaterLineForListings(listings) {
  return uniqueBy(listings, (listing) => listing.theater.id)
    .map((listing) => listing.theater.name)
    .sort((a, b) => a.localeCompare(b))
    .join(" / ");
}

function listingMatchesQuery(listing, query) {
  if (!query) return true;

  const searchText = [
    listing.movie.title,
    listing.movie.director,
    listing.theater.name,
    ...listing.movie.movieTags,
    ...listing.theater.theaterTags,
    ...listing.tags
  ].join(" ").toLowerCase();

  return searchText.includes(query);
}

function filteredListings() {
  const query = state.query.trim().toLowerCase();

  return state.listings.filter((listing) => {
    const dateMatches = state.selectedDate ? listing.date === state.selectedDate : true;
    const tagMatches = [...state.selectedTags].every((tag) => listing.tags.includes(tag));
    return dateMatches && tagMatches && listingMatchesQuery(listing, query);
  });
}

function selectedListing() {
  return state.listings.find((listing) => listing.id === state.selectedListingId);
}

function renderDates() {
  const dates = allDates();

  elements.dates.innerHTML = dates.map((date, index) => {
    const active = date === state.selectedDate ? " active" : "";
    const primary = index === 0 ? "Today" : formatDate(date).split(",")[0];

    return `
      <button class="date-button${active}" type="button" data-date="${escapeHtml(date)}">
        <span>${escapeHtml(primary)}</span>
        <span>${escapeHtml(formatDate(date))}</span>
      </button>
    `;
  }).join("");
}

function renderTags() {
  elements.tags.innerHTML = allTags().map((tag) => {
    const active = state.selectedTags.has(tag) ? " active" : "";
    return `<button class="tag-button${active}" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`;
  }).join("");
}

function renderModes() {
  elements.modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
    button.setAttribute("aria-pressed", String(button.dataset.view === state.view));
  });
}

function tagBadges(tags) {
  if (!tags.length) return "";
  return `<div class="badges">${tags.map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function renderScreeningRows(listings, context) {
  if (listings.length === 0) {
    return `<p class="no-results">No showtimes match those filters.</p>`;
  }

  return `
    <div class="showtime-list">
      ${listings.map((listing) => {
        const time = formatTime(listing.startTime);
        const active = listing.id === state.selectedListingId ? " active" : "";
        const title = context === "movies" ? listing.theater.name : listing.movie.title;
        const meta = context === "movies"
          ? ""
          : context === "theaters"
            ? compactMeta([
                listing.movie.director,
                listing.movie.releaseYear,
                listing.movie.runtimeMinutes ? `${listing.movie.runtimeMinutes} min` : ""
              ])
            : compactMeta([
                listing.movie.runtimeMinutes ? `${listing.movie.runtimeMinutes} min` : "",
                listing.theater.name
              ]);
        const showTags = context !== "movies";

        return `
          <button class="showtime${active}" type="button" data-listing="${escapeHtml(listing.id)}">
            <span class="time">
              <span class="clock">${escapeHtml(time.clock)}</span>
              <span class="period">${escapeHtml(time.period)}</span>
            </span>
            <span class="showtime-copy">
              <strong>${escapeHtml(title)}</strong>
              ${meta ? `<span class="meta">${meta}</span>` : ""}
              ${showTags ? tagBadges(listing.tags) : ""}
            </span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderMovieCards(listings) {
  const movies = uniqueBy(listings, (listing) => listing.movie.id)
    .map((listing) => listing.movie)
    .sort((a, b) => a.title.localeCompare(b.title));

  if (movies.length === 0) {
    return `<p class="no-results">No movies match those filters.</p>`;
  }

  return `
    <div class="entity-list">
      ${movies.map((movie) => {
        const movieListings = listings.filter((listing) => listing.movie.id === movie.id);
        const preview = previewLines(
          movieListings,
          (listing) => `${shortTheaterName(listing.theater.name)}, ${formatPreviewTime(listing.startTime)}`
        );

        return `
          <button class="entity-card" type="button" data-movie="${escapeHtml(movie.id)}">
            <span class="entity-main">
              <strong>${escapeHtml(movie.title)}</strong>
              <span class="entity-theaters">${escapeHtml(theaterLineForListings(movieListings))}</span>
              <span>${escapeHtml(movie.director || "Director unavailable")}</span>
              <span>${compactMeta([
                movie.releaseYear,
                movie.runtimeMinutes ? `${movie.runtimeMinutes} min` : "",
                movie.languageDisplay
              ])}</span>
            </span>
            ${preview}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderTheaterCards(listings) {
  const theaters = uniqueBy(listings, (listing) => listing.theater.id)
    .map((listing) => listing.theater)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (theaters.length === 0) {
    return `<p class="no-results">No theaters match those filters.</p>`;
  }

  return `
    <div class="entity-list">
      ${theaters.map((theater) => {
        const theaterListings = listings.filter((listing) => listing.theater.id === theater.id);
        const preview = previewLines(
          theaterListings,
          (listing) => `${formatPreviewTime(listing.startTime)} ${listing.movie.title}`
        );

        return `
          <button class="entity-card" type="button" data-theater="${escapeHtml(theater.id)}">
            <span class="entity-main">
              <strong>${escapeHtml(theater.name)}</strong>
              <span>${compactMeta([theater.neighborhood, theater.area])}</span>
              <span>${escapeHtml(theater.venueType)}</span>
            </span>
            ${preview}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderShowtimeWindowCards(listings) {
  return `
    <div class="entity-list">
      ${showtimeWindows.map((window) => {
        const windowListings = listings.filter((listing) => listingIsInWindow(listing, window));
        const preview = previewLines(
          windowListings,
          (listing) => `${formatPreviewTime(listing.startTime)} ${listing.movie.title}`
        );

        return `
          <button class="entity-card" type="button" data-window="${escapeHtml(window.id)}">
            <span class="entity-main">
              <strong>${escapeHtml(window.title)}</strong>
              <span>${escapeHtml(window.description)}</span>
            </span>
            ${preview || `<span class="entity-preview"><span>No matching showtimes</span></span>`}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderScopeHeader(title) {
  return `
    <section class="scope-heading">
      <h2>${escapeHtml(title)}</h2>
    </section>
  `;
}

function renderContent() {
  const listings = filteredListings();

  if (state.view === "movies") {
    if (state.selectedMovieId) {
      const movieListings = listings.filter((listing) => listing.movie.id === state.selectedMovieId);
      const movie = state.listings.find((listing) => listing.movie.id === state.selectedMovieId)?.movie;
      elements.count.textContent = `Showing ${plural(movieListings.length, "screening")}`;
      elements.content.innerHTML = `${renderScopeHeader(movie?.title || "Movie")}${renderScreeningRows(movieListings, "movies")}`;
      return;
    }

    const movieCount = uniqueBy(listings, (listing) => listing.movie.id).length;
    elements.count.textContent = `Showing ${plural(movieCount, "movie")}`;
    elements.content.innerHTML = renderMovieCards(listings);
    return;
  }

  if (state.view === "theaters") {
    if (state.selectedTheaterId) {
      const theaterListings = listings.filter((listing) => listing.theater.id === state.selectedTheaterId);
      const theater = state.listings.find((listing) => listing.theater.id === state.selectedTheaterId)?.theater;
      elements.count.textContent = `Showing ${plural(theaterListings.length, "screening")}`;
      elements.content.innerHTML = `${renderScopeHeader(theater?.name || "Theater")}${renderScreeningRows(theaterListings, "theaters")}`;
      return;
    }

    const theaterCount = uniqueBy(listings, (listing) => listing.theater.id).length;
    elements.count.textContent = `Showing ${plural(theaterCount, "theater")}`;
    elements.content.innerHTML = renderTheaterCards(listings);
    return;
  }

  if (state.view === "times" && state.selectedShowtimeWindowId) {
    const window = showtimeWindows.find((item) => item.id === state.selectedShowtimeWindowId);
    const windowListings = window ? listings.filter((listing) => listingIsInWindow(listing, window)) : listings;
    elements.count.textContent = `Showing ${plural(windowListings.length, "screening")}`;
    elements.content.innerHTML = `${renderScopeHeader(window?.title || "Showtimes")}${renderScreeningRows(windowListings, "times")}`;
    return;
  }

  elements.count.textContent = `Showing ${plural(listings.length, "screening")}`;
  elements.content.innerHTML = renderShowtimeWindowCards(listings);
}

function renderDetails() {
  const listing = selectedListing();
  const inspector = elements.details.closest(".inspector");

  if (!listing) {
    inspector?.classList.add("empty");
    elements.details.innerHTML = "";
    return;
  }

  inspector?.classList.remove("empty");

  const movie = listing.movie;
  const theater = listing.theater;
  const time = formatTime(listing.startTime);

  elements.details.innerHTML = `
    <article class="detail-panel">
      <div class="poster-placeholder" aria-label="Poster placeholder">
        <span>Poster</span>
      </div>

      <p class="eyebrow">Selected showtime</p>
      <h2>${escapeHtml(movie.title)}</h2>
      <p class="detail-meta">${movieMeta(movie)}</p>

      <dl class="detail-facts">
        <div>
          <dt>Showtime</dt>
          <dd>${escapeHtml(time.label)} · ${escapeHtml(formatDate(listing.date))}</dd>
        </div>
        <div>
          <dt>Theater</dt>
          <dd>${escapeHtml(theater.name)}</dd>
        </div>
        <div>
          <dt>Driving distance</dt>
          <dd>ZIP distance placeholder</dd>
        </div>
      </dl>

      <p class="detail-copy">${escapeHtml(movie.synopsis)}</p>
      ${tagBadges(listing.tags)}
    </article>
  `;
}

function render() {
  renderModes();
  renderDates();
  renderTags();
  renderContent();
  renderDetails();
}

function resetSelection() {
  state.selectedListingId = "";
}

function scrollDetailsIntoViewOnMobile() {
  if (!window.matchMedia("(max-width: 860px)").matches) return;
  requestAnimationFrame(() => {
    elements.details.scrollIntoView({ block: "start", behavior: "auto" });
  });
}

async function loadData() {
  const [moviesData, theatersData, showtimesData] = await Promise.all([
    fetch("/data/movies.json").then((response) => response.json()),
    fetch("/data/theaters.json").then((response) => response.json()),
    fetch("/data/showtimes.json").then((response) => response.json())
  ]);

  const movies = byId(moviesData.movies);
  const theaters = byId(theatersData.theaters);

  state.listings = showtimesData.showtimes
    .map((showtime) => ({
      ...showtime,
      movie: movies.get(showtime.movieId),
      theater: theaters.get(showtime.theaterId)
    }))
    .filter((listing) => listing.movie && listing.theater)
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));

  state.selectedDate = allDates()[0] || "";
  render();
}

elements.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  resetSelection();
  renderContent();
  renderDetails();
});

elements.dates.addEventListener("click", (event) => {
  const button = event.target.closest("[data-date]");
  if (!button) return;
  state.selectedDate = button.dataset.date;
  resetSelection();
  render();
});

elements.tags.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tag]");
  if (!button) return;

  if (state.selectedTags.has(button.dataset.tag)) {
    state.selectedTags.delete(button.dataset.tag);
  } else {
    state.selectedTags.add(button.dataset.tag);
  }

  resetSelection();
  render();
});

elements.clear.addEventListener("click", () => {
  state.query = "";
  state.selectedDate = allDates()[0] || "";
  state.selectedTags.clear();
  state.selectedMovieId = "";
  state.selectedTheaterId = "";
  state.selectedShowtimeWindowId = "";
  resetSelection();
  elements.search.value = "";
  render();
});

document.body.addEventListener("click", (event) => {
  const modeButton = event.target.closest("[data-view]");
  const movieButton = event.target.closest("[data-movie]");
  const theaterButton = event.target.closest("[data-theater]");
  const windowButton = event.target.closest("[data-window]");
  const listingButton = event.target.closest("[data-listing]");

  if (modeButton) {
    state.view = modeButton.dataset.view;
    state.selectedMovieId = "";
    state.selectedTheaterId = "";
    state.selectedShowtimeWindowId = "";
    resetSelection();
    render();
    return;
  }

  if (movieButton) {
    state.selectedMovieId = movieButton.dataset.movie;
    state.selectedTheaterId = "";
    state.selectedShowtimeWindowId = "";
    resetSelection();
    render();
    return;
  }

  if (theaterButton) {
    state.selectedTheaterId = theaterButton.dataset.theater;
    state.selectedMovieId = "";
    state.selectedShowtimeWindowId = "";
    resetSelection();
    render();
    return;
  }

  if (windowButton) {
    state.selectedShowtimeWindowId = windowButton.dataset.window;
    state.selectedMovieId = "";
    state.selectedTheaterId = "";
    resetSelection();
    render();
    return;
  }

  if (listingButton) {
    state.selectedListingId = listingButton.dataset.listing;
    renderContent();
    renderDetails();
    scrollDetailsIntoViewOnMobile();
    return;
  }

});

loadData().catch(() => {
  elements.count.textContent = "Could not load showtimes";
  elements.content.innerHTML = `<p class="no-results">The local data files could not be read.</p>`;
  elements.details.innerHTML = "";
});

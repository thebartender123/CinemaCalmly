import ShowtimeBrowser from "@/components/ShowtimeBrowser";
import moviesData from "@/data/movies.json";
import showtimesData from "@/data/showtimes.json";
import theatersData from "@/data/theaters.json";
import type { Movie, Showtime, ShowtimeListing, Theater } from "@/types/cinema";

function joinShowtimes(): ShowtimeListing[] {
  const movies = (moviesData.movies as Movie[]).reduce<Record<string, Movie>>((acc, movie) => {
    acc[movie.id] = movie;
    return acc;
  }, {});

  const theaters = (theatersData.theaters as Theater[]).reduce<Record<string, Theater>>((acc, theater) => {
    acc[theater.id] = theater;
    return acc;
  }, {});

  return (showtimesData.showtimes as Showtime[])
    .map((showtime) => {
      const movie = movies[showtime.movieId];
      const theater = theaters[showtime.theaterId];

      if (!movie || !theater) {
        return null;
      }

      return { ...showtime, movie, theater };
    })
    .filter((listing): listing is ShowtimeListing => listing !== null)
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
}

export default function Home() {
  const listings = joinShowtimes();

  return <ShowtimeBrowser listings={listings} />;
}

export type Movie = {
  id: string;
  slug: string;
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  country: string[];
  languages: string[];
  languageDisplay: string;
  director: string;
  synopsis: string;
  movieTags: string[];
  sourceUrl?: string;
  contentNote: string;
};

export type Theater = {
  id: string;
  slug: string;
  name: string;
  neighborhood: string;
  area: string;
  venueType: string;
  shortDescription: string;
  theaterTags: string[];
  amenities: string[];
  accessibility: string[];
  sourceUrl?: string;
  sampleNote: string;
};

export type Showtime = {
  id: string;
  movieId: string;
  theaterId: string;
  date: string;
  startTime: string;
  tags: string[];
  sourceUrl?: string;
};

export type ShowtimeListing = Showtime & {
  movie: Movie;
  theater: Theater;
};

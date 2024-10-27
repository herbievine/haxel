import { z } from "zod";
import { fetcher } from "../utils/fetcher";

const songSchema = z.object({
  wrapperType: z.literal("track"),
  artistId: z.number(),
  collectionId: z.number(),
  trackId: z.number(),
  artistName: z.string(),
  collectionName: z.string(),
  trackName: z.string(),
  // previewUrl: z.string(),
  artworkUrl30: z.string(),
  artworkUrl60: z.string(),
  artworkUrl100: z.string(),
  releaseDate: z.string(),
  // collectionExplicitness: z.union([z.literal("explicit"), z.literal("notExplicit"), z.literal("cleaned")]),
  // trackExplicitness: z.union([z.literal("explicit"), z.literal("notExplicit"), z.literal("cleaned")]),
  discCount: z.number(),
  discNumber: z.number(),
  trackCount: z.number(),
  trackNumber: z.number(),
  trackTimeMillis: z.number(),
  primaryGenreName: z.string(),
  // isStreamable: z.boolean(),
});

export type Song = z.infer<typeof songSchema>;

const albumSchema = z.object({
  wrapperType: z.literal("collection"),
  // collectionType: z.string(),
  artistId: z.number(),
  collectionId: z.number(),
  // artistName: z.string(),
  collectionName: z.string(),
  // collectionCensoredName: z.string(),
  // artistViewUrl: z.string().optional(),
  // collectionViewUrl: z.string(),
  artworkUrl60: z.string(),
  artworkUrl100: z.string(),
  // collectionPrice: z.number(),
  // collectionExplicitness: z.union([z.literal("explicit"), z.literal("notExplicit"), z.literal("cleaned")]),
  trackCount: z.number(),
  // country: z.string(),
  // currency: z.string(),
  releaseDate: z.string(),
  primaryGenreName: z.string(),
});

const apiSchema = z.object({
  resultCount: z.number(),
  results: z.array(z.discriminatedUnion("wrapperType", [songSchema, albumSchema])),
});

export function itunes(query: string) {
  const searchParams = new URLSearchParams();

  searchParams.append("term", query);
  searchParams.append("entity", "song,album");

  return fetcher(`https://itunes.apple.com/search?${searchParams}`, apiSchema);
}

export function itunesFindAlbums(query: string) {
  const searchParams = new URLSearchParams();

  searchParams.append("id", query);
  searchParams.append("entity", "album");

  return fetcher(`https://itunes.apple.com/lookup?${searchParams}`, apiSchema);
}

export function itunesFindSongs(query: string) {
  const searchParams = new URLSearchParams();

  searchParams.append("id", query);
  searchParams.append("entity", "song");

  return fetcher(`https://itunes.apple.com/lookup?${searchParams}`, apiSchema);
}

import { Hono } from "hono";
import { itunes } from "./api/itunes";
import { youtube } from "./api/youtube";
import { converter } from "./api/converter";
import { drizzle } from "drizzle-orm/d1";
import { songs } from "./db";
import { eq } from "drizzle-orm";
import { id } from "./utils/id";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/search", async (c) => {
  const q = c.req.query("q") || "";

  if (q.length === 0) {
    return c.json([]);
  }

  const { results } = await itunes(q);

  return c.json(results);
});

app.get("/play/:id", async (c) => {
  const itunesId = c.req.param("id");

  const db = drizzle(c.env.DB);
  const existingSong = await db.select().from(songs).where(eq(songs.itunesId, itunesId)).get();

  console.log({ existingSong });

  if (existingSong) {
    return c.json({
      url: `https://audio.herbievine.com/${existingSong.id}`,
    });
  }

  const { results } = await itunes(itunesId);

  const song = results[0];

  if (song.wrapperType === "collection") {
    return c.json({ error: "Can't play an album" }, 400);
  }

  const {
    items: [video],
  } = await youtube(`${song.artistName} ${song.trackName} audio`, c.env.YOUTUBE_API_KEY);

  const { link } = await converter(video.id.videoId, c.env.CONVERTER_API_KEY);

  const response = await fetch(link, {
    headers: {
      "content-type": "audio/mpeg",
    },
  });

  const buffer = await response.arrayBuffer();

  const { key } = await c.env.AUDIO.put(id(), buffer, {
    httpMetadata: { contentType: "audio/mpeg" },
  });

  console.log(
    await db
      .insert(songs)
      .values({
        id: id(),
        bucketId: key,
        itunesId: song.trackId.toString(),
        itunesAlbumId: song.collectionId.toString(),
        itunesArtistId: song.artistId.toString(),
        name: song.trackName,
        releaseDate: song.releaseDate,
        discCount: song.discCount,
        discNumber: song.discNumber,
        trackCount: song.trackCount,
        trackNumber: song.trackNumber,
        trackTimeMillis: song.trackTimeMillis,
        primaryGenreName: song.primaryGenreName,
        artworkUrl30: song.artworkUrl30,
        artworkUrl60: song.artworkUrl60,
        artworkUrl100: song.artworkUrl100,
      })
      .returning(),
  );

  return c.json({
    url: `https://audio.herbievine.com/${key}`,
  });
});

export default app;

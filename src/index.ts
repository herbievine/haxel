import { Hono } from "hono";
import { itunes, itunesFindAlbums, itunesFindSongs } from "./api/itunes";
import { youtube } from "./api/youtube";
import { converter } from "./api/converter";
import { drizzle } from "drizzle-orm/d1";
import { albums, songs } from "./db";
import { eq } from "drizzle-orm";
import { id } from "./utils/id";
import { getArrayBuffer } from "./utils/get-array-buffer";
import { write } from "./lib/id3";
import JSZip from "jszip";

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

  const arrayBuffer = await getArrayBuffer(link, {
    headers: {
      "content-type": "audio/mpeg",
    },
  });

  const songWithTags = await write(song, arrayBuffer);

  const { key } = await c.env.AUDIO.put(id(), songWithTags, {
    httpMetadata: { contentType: "audio/mpeg" },
  });

  await db
    .insert(songs)
    .values({
      id: id(),
      bucketId: key,
      itunesId: song.trackId.toString(),
      itunesAlbumId: song.collectionId.toString(),
      itunesArtistId: song.artistId.toString(),
      name: song.trackName,
      ...song,
    })
    .returning();

  return c.json({
    url: `https://audio.herbievine.com/${key}`,
  });
});

app.get("/album/:id", async (c) => {
  const albumId = c.req.param("id");

  const db = drizzle(c.env.DB);
  const existingAlbum = await db.select().from(albums).where(eq(albums.itunesId, albumId)).get();

  if (existingAlbum) {
    // return c.json({
    //   url: `https://audio.herbievine.com/${existingAlbum.id}`,
    // });
  } else {
    const {
      results: [album],
    } = await itunesFindAlbums(albumId);

    if (album.wrapperType === "track") {
      return;
    }

    const arrayBuffer = await getArrayBuffer(album.artworkUrl100.replace("100x100", "1000x1000"));

    const { key } = await c.env.ALBUM_COVERS.put(id(), arrayBuffer, {
      httpMetadata: { contentType: "audio/jpeg" },
    });

    await db
      .insert(albums)
      .values({
        id: id(),
        bucketCoverId: key,
        itunesId: album.collectionId.toString(),
        itunesArtistId: album.artistId.toString(),
        name: album.collectionName,
        ...album,
      })
      .returning();
  }

  const { results } = await itunesFindSongs(albumId);
  const zip = new JSZip();

  for (const song of results) {
    if (song.wrapperType === "collection") {
      continue;
    }

    const existingSong = await db.select().from(songs).where(eq(songs.itunesId, song.trackId.toString())).get();

    if (existingSong) {
      const arrayBuffer = await getArrayBuffer(`https://audio.herbievine.com/${existingSong.bucketId}`, {
        headers: {
          "content-type": "audio/mpeg",
        },
      });

      zip.file(`${song.artistName} - ${song.trackName}.mp3`, arrayBuffer);

      continue;
    }

    const {
      items: [video],
    } = await youtube(`${song.artistName} ${song.trackName} audio`, c.env.YOUTUBE_API_KEY);

    const { link } = await converter(video.id.videoId, c.env.CONVERTER_API_KEY);

    const arrayBuffer = await getArrayBuffer(link, {
      headers: {
        "content-type": "audio/mpeg",
      },
    });

    const songWithTags = await write(song, arrayBuffer);

    const { key } = await c.env.AUDIO.put(id(), songWithTags, {
      httpMetadata: { contentType: "audio/mpeg" },
    });

    zip.file(`${song.artistName} - ${song.trackName}.mp3`, songWithTags);

    await db
      .insert(songs)
      .values({
        id: id(),
        bucketId: key,
        itunesId: song.trackId.toString(),
        itunesAlbumId: song.collectionId.toString(),
        itunesArtistId: song.artistId.toString(),
        name: song.trackName,
        ...song,
      })
      .returning();
  }

  const zipBlob = await zip.generateAsync({ type: "uint8array" });

  return new Response(zipBlob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${albumId}.zip"`,
    },
  });
});

export default app;

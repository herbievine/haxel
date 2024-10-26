import { Hono } from "hono";
import { itunes } from "./api/itunes";
import { youtube } from "./api/youtube";
import { converter } from "./api/converter";

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
  const id = c.req.param("id");

  const { results } = await itunes(id);

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

  const put = await c.env.AUDIO.put(`${song.trackName} - ${song.artistName}`, buffer, {
    customMetadata: {
      itunesId: id,
    },
    httpMetadata: { contentType: "audio/mpeg" },
  });

  return c.json({
    url: `https://audio.herbievine.com/${encodeURI(put.key)}`,
  });
});

export default app;

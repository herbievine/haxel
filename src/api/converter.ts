import { z } from "zod";
import { fetcher } from "../utils/fetcher";

const apiSchema = z.object({
  link: z.string(),
  title: z.string(),
  progess: z.number().nullish(),
  duration: z.number(),
  status: z.string(),
  msg: z.string(),
});

export function converter(videoId: string, key: string) {
  const searchParams = new URLSearchParams();

  searchParams.append("id", videoId);

  return fetcher(`https://youtube-mp36.p.rapidapi.com/dl?${searchParams}`, apiSchema, {
    headers: {
      "X-RapidAPI-Host": "youtube-mp36.p.rapidapi.com",
      "X-RapidAPI-Key": key,
    },
  });
}

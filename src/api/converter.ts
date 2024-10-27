import { z } from "zod";
import { fetcher } from "../utils/fetcher";

const apiSchema = z.object({
  link: z.string(),
  // title: z.string(),
  // progess: z.number().nullish(),
  // duration: z.number(),
  // status: z.string(),
  // msg: z.string(),
});

export function converter(videoId: string, key: string) {
  const searchParams = new URLSearchParams();

  searchParams.append("id", videoId);

  // return {
  //   link: "https://mbeta.123tokyo.xyz/get.php/3/e5/6gluNoLVKiQ.mp3?cid=MmEwMTo0Zjg6YzAxMDo5ZmE2OjoxfE5BfERF&h=Bb0OCkrpfcArVlNmltMAsg&s=1729965459&n=Eleanor%20Rigby%20%28Remastered%202015%29&uT=R&uN=aGVyYmlldmluZQ%3D%3D",
  //   title: "Eleanor Rigby (Remastered 2015)",
  //   duration: 125.85796203637,
  //   status: "ok",
  //   msg: "success",
  // };

  return fetcher(`https://youtube-mp36.p.rapidapi.com/dl?${searchParams}`, apiSchema, {
    headers: {
      "X-RapidAPI-Host": "youtube-mp36.p.rapidapi.com",
      "X-RapidAPI-Key": key,
    },
  });
}

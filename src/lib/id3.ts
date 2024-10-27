import { Song } from "../api/itunes";
import { getArrayBuffer } from "../utils/get-array-buffer";
import id3, { TagConstants } from "node-id3";

export async function write(song: Song, data: ArrayBuffer) {
  const imageArrayBuffer = await getArrayBuffer(song.artworkUrl100.replace("100x100", "800x800"));

  return id3.write(
    {
      title: song.trackName ?? undefined,
      artist: song.artistName ?? undefined,
      album: song.collectionName ?? undefined,
      year: song.releaseDate?.split("-")[0],
      genre: song.primaryGenreName ?? undefined,
      trackNumber: song.trackNumber?.toString(),
      image: {
        mime: "image/jpeg",
        type: {
          id: TagConstants.AttachedPicture.PictureType.FRONT_COVER,
        },
        description: "Cover",
        imageBuffer: Buffer.from(imageArrayBuffer),
      },
    },
    Buffer.from(data),
  );
}

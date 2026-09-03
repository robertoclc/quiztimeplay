const PLAYLIST_API =
  "https://www.googleapis.com/youtube/v3/playlistItems";

const VIDEOS_API =
  "https://www.googleapis.com/youtube/v3/videos";

const VIDEOS_PLAYLIST =
  "PLAINmQvx1i_mZVjmSe9elIvtfcPGx1tdz";

const SHORTS_PLAYLIST =
  "PLAINmQvx1i_kK7jUUbUU9ESTXQSlGxHzC";

function formatDuration(duration) {
  const match = duration.match(
    /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
  );

  if (!match) return "00:00";

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

async function getVideoDetails(videoIds, apiKey) {
  const details = {};

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);

    const url =
      `${VIDEOS_API}?part=snippet,contentDetails` +
      `&id=${batch.join(",")}` +
      `&key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();

    for (const item of data.items || []) {
      details[item.id] = {
        duration: formatDuration(item.contentDetails.duration),
        publishedAt: item.snippet.publishedAt
      };
    }
  }

  return details;
}

async function getPlaylistVideos(playlistId, category, apiKey) {
  const items = [];
  let pageToken = "";

  do {
    const url =
      `${PLAYLIST_API}?part=snippet` +
      `&playlistId=${playlistId}` +
      `&maxResults=50` +
      `${pageToken ? `&pageToken=${pageToken}` : ""}` +
      `&key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();

    items.push(...(data.items || []));

    pageToken = data.nextPageToken || "";

  } while (pageToken);

  const validItems = items.filter(
    (item) =>
      item.snippet?.resourceId?.videoId &&
      item.snippet?.title &&
      item.snippet.title !== "Private video" &&
      item.snippet.title !== "Private Video"
  );

  const ids = validItems.map(
    (item) => item.snippet.resourceId.videoId
  );

  const videoDetails = await getVideoDetails(ids, apiKey);

  return validItems
    .map((item) => {
      const id = item.snippet.resourceId.videoId;
      const details = videoDetails[id];

      return {
        videoId: id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail:
          item.snippet.thumbnails.high?.url ||
          item.snippet.thumbnails.medium?.url ||
          item.snippet.thumbnails.default?.url,
        publishedAt:
          details?.publishedAt ||
          item.snippet.publishedAt,
        category,
        duration:
          details?.duration ||
          "00:00",
        url: `https://www.youtube.com/watch?v=${id}`
      };
    })
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() -
        new Date(a.publishedAt).getTime()
    );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/youtube") {
      const cacheKey = new Request(
        "https://cache.youtube/all-content",
        request
      );

      const cache = caches.default;

      let response = await cache.match(cacheKey);

      if (response) {
        return response;
      }

      const apiKey = env.YOUTUBE_API_KEY;

      if (!apiKey) {
        return new Response(
          JSON.stringify({
            error: "YOUTUBE_API_KEY não configurada"
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }

      try {
        const [quizzes, shorts] = await Promise.all([
          getPlaylistVideos(
            VIDEOS_PLAYLIST,
            "Quiz",
            apiKey
          ),
          getPlaylistVideos(
            SHORTS_PLAYLIST,
            "Short",
            apiKey
          )
        ]);

        const data = {
          quizzes,
          shorts,
          updatedAt: new Date().toISOString()
        };

        response = new Response(
          JSON.stringify(data),
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=43200"
            }
          }
        );

        ctx.waitUntil(
          cache.put(cacheKey, response.clone())
        );

        return response;

      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Erro ao buscar dados do YouTube",
            details:
              error instanceof Error
                ? error.message
                : String(error)
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(controller, env, ctx) {
    const cache = caches.default;

    await cache.delete(
      "https://cache.youtube/all-content"
    );

    console.log(
      "Cache do YouTube limpo:",
      new Date().toISOString()
    );
  }
};
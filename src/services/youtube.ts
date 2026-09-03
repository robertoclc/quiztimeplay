import { YOUTUBE_CONFIG } from "../config/youtube";
import type { YouTubeVideo } from "../types/youtube";

const PLAYLIST_API =
    "https://www.googleapis.com/youtube/v3/playlistItems";

const CHANNEL_API =
    "https://www.googleapis.com/youtube/v3/channels";

const VIDEOS_API =
    "https://www.googleapis.com/youtube/v3/videos";

/* ==========================================
   CONVERTE PT12M48S -> 12:48
========================================== */

function formatDuration(duration: string): string {

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

/* ==========================================
   BUSCA DURAÇÕES E DATAS DE PUBLICAÇÃO
   EM LOTES DE ATÉ 50 VÍDEOS
========================================== */

async function getVideoDetails(videoIds: string[]) {

    if (!videoIds.length) return {};

    const details: Record<
        string,
        {
            duration: string;
            publishedAt: string;
        }
    > = {};

    const batches: string[][] = [];

    for (let i = 0; i < videoIds.length; i += 50) {

        batches.push(videoIds.slice(i, i + 50));

    }

    for (const batch of batches) {

        const url =
            `${VIDEOS_API}?part=snippet,contentDetails&id=${batch.join(",")}&key=${YOUTUBE_CONFIG.API_KEY}`;

        const response = await fetch(url);

        if (!response.ok) {

            throw new Error(await response.text());

        }

        const data = await response.json();

        data.items.forEach((item: any) => {

            details[item.id] = {

                duration: formatDuration(
                    item.contentDetails.duration
                ),

                publishedAt: item.snippet.publishedAt

            };

        });

    }

    return details;

}

/* ==========================================
   BUSCA PLAYLIST
========================================== */

async function getPlaylistVideos(

    playlistId: string,

    maxResults: number | null,

    category: string

): Promise<YouTubeVideo[]> {

    const items: any[] = [];

    let pageToken = "";

    do {

        const url =
            `${PLAYLIST_API}?part=snippet` +
            `&playlistId=${playlistId}` +
            `&maxResults=50` +
            `${pageToken ? `&pageToken=${pageToken}` : ""}` +
            `&key=${YOUTUBE_CONFIG.API_KEY}`;

        const response = await fetch(url);

        if (!response.ok) {

            throw new Error(await response.text());

        }

        const data = await response.json();

        items.push(...data.items);

        pageToken = data.nextPageToken ?? "";

        if (maxResults !== null && items.length >= maxResults) {

            break;

        }

    } while (pageToken);

    const validItems = items.filter(

        (item: any) =>

            item.snippet?.resourceId?.videoId &&

            item.snippet?.title &&

            item.snippet.title !== "Private video" &&

            item.snippet.title !== "Private Video"

    );

    const ids = validItems.map(

        (item: any) => item.snippet.resourceId.videoId

    );

    const videoDetails = await getVideoDetails(ids);

    const videos = validItems

        .map((item: any) => {

            const id = item.snippet.resourceId.videoId;

            const details = videoDetails[id];

            return {

                videoId: id,

                title: item.snippet.title,

                description: item.snippet.description,

                thumbnail:

                    item.snippet.thumbnails.high?.url ??

                    item.snippet.thumbnails.medium?.url ??

                    item.snippet.thumbnails.default?.url,

                publishedAt:
                    details?.publishedAt ??
                    item.snippet.publishedAt,

                category,

                duration:
                    details?.duration ??
                    "00:00",

                url: `https://www.youtube.com/watch?v=${id}`

            };

        })

        .sort(

            (a: YouTubeVideo, b: YouTubeVideo) =>

                new Date(b.publishedAt).getTime() -

                new Date(a.publishedAt).getTime()

        );

    if (maxResults === null) {

        return videos;

    }

    return videos.slice(0, maxResults);

}

/* ==========================================
   BUSCA PLAYLIST DE UPLOADS DO CANAL
========================================== */

async function getUploadsPlaylistId(): Promise<string> {

    const url =
        `${CHANNEL_API}?part=contentDetails&id=${YOUTUBE_CONFIG.CHANNEL_ID}&key=${YOUTUBE_CONFIG.API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {

        throw new Error(await response.text());

    }

    const data = await response.json();

    return data.items[0].contentDetails.relatedPlaylists.uploads;

}

/* ==========================================
   BUSCA OS VÍDEOS MAIS RECENTES DO CANAL
========================================== */

async function getLatestVideos(

    maxResults: number,

    category: string

): Promise<YouTubeVideo[]> {

    const uploadsPlaylistId = await getUploadsPlaylistId();

    return getPlaylistVideos(

        uploadsPlaylistId,

        maxResults,

        category

    );

}

/* ==========================================
   HOME
========================================== */

export async function getHomeContent() {

    const [videos, shorts] = await Promise.all([

        getPlaylistVideos(

            YOUTUBE_CONFIG.VIDEOS_PLAYLIST,

            YOUTUBE_CONFIG.HOME_VIDEOS,

            "Quiz"

        ),

        getPlaylistVideos(

            YOUTUBE_CONFIG.SHORTS_PLAYLIST,

            YOUTUBE_CONFIG.HOME_SHORTS,

            "Short"

        )

    ]);

    return {

        videos,

        shorts

    };

}

/* ==========================================
   TODOS OS QUIZZES
========================================== */

export async function getAllQuizVideos() {

    return getPlaylistVideos(

        YOUTUBE_CONFIG.VIDEOS_PLAYLIST,

        null,

        "Quiz"

    );

}

/* ==========================================
   TODOS OS SHORTS
========================================== */

export async function getAllShorts() {

    return getPlaylistVideos(

        YOUTUBE_CONFIG.SHORTS_PLAYLIST,

        null,

        "Short"

    );

}
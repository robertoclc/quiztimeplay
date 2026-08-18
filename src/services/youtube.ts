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
   BUSCA DURAÇÕES
========================================== */

async function getDurations(videoIds: string[]) {

    if (!videoIds.length) return {};

    const url =
        `${VIDEOS_API}?part=contentDetails&id=${videoIds.join(",")}&key=${YOUTUBE_CONFIG.API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {

        throw new Error(await response.text());

    }

    const data = await response.json();

    const durations: Record<string, string> = {};

    data.items.forEach((item: any) => {

        durations[item.id] = formatDuration(
            item.contentDetails.duration
        );

    });

    return durations;

}

/* ==========================================
   BUSCA PLAYLIST
========================================== */

async function getPlaylistVideos(

    playlistId: string,

    maxResults: number,

    category: string

): Promise<YouTubeVideo[]> {

    const url =
        `${PLAYLIST_API}?part=snippet` +
        `&playlistId=${playlistId}` +
        `&maxResults=50` +
        `&key=${YOUTUBE_CONFIG.API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {

        throw new Error(await response.text());

    }

    const data = await response.json();

    const validItems = data.items.filter(

        (item: any) =>

            item.snippet?.resourceId?.videoId &&

            item.snippet?.title &&

            item.snippet.title !== "Private video" &&

            item.snippet.title !== "Private Video"

    );

    const ids = validItems.map(

        (item: any) => item.snippet.resourceId.videoId

    );

    const durations = await getDurations(ids);

    return validItems

        .map((item: any) => {

            const id = item.snippet.resourceId.videoId;

            return {

                videoId: id,

                title: item.snippet.title,

                description: item.snippet.description,

                thumbnail:

                    item.snippet.thumbnails.high?.url ??

                    item.snippet.thumbnails.medium?.url ??

                    item.snippet.thumbnails.default?.url,

                publishedAt: item.snippet.publishedAt,

                category,

                duration: durations[id] ?? "00:00",

                url: `https://www.youtube.com/watch?v=${id}`

            };

        })

        .slice(0, maxResults);

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
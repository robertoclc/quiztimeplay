import { PLAYLISTS } from "../config/Playlists";
import { YOUTUBE_CONFIG } from "../config/youtube";

const API_URL = "https://www.googleapis.com/youtube/v3/playlistItems";

export interface PlaylistCard {

    id: string;

    title: string;

    description: string;

    icon: string;

    thumbnail: string;

    playlistUrl: string;

}

async function getPlaylistThumbnail(playlistId: string) {

    const url =
        `${API_URL}?part=snippet` +
        `&playlistId=${playlistId}` +
        `&maxResults=1` +
        `&key=${YOUTUBE_CONFIG.API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {

        throw new Error(await response.text());

    }

    const data = await response.json();

    const item = data.items?.[0];

    if (!item) {

        return "/images/default-playlist.jpg";

    }

    return (

        item.snippet.thumbnails.maxres?.url ??

        item.snippet.thumbnails.high?.url ??

        item.snippet.thumbnails.medium?.url ??

        item.snippet.thumbnails.default?.url ??

        "/images/default-playlist.jpg"

    );

}

export async function getPlaylists(): Promise<PlaylistCard[]> {

    const playlists = Object.values(PLAYLISTS);

    const cards = await Promise.all(

        playlists.map(async (playlist) => ({

            id: playlist.id,

            title: playlist.title,

            description: playlist.description,

            icon: playlist.icon,

            thumbnail: await getPlaylistThumbnail(playlist.id),

            playlistUrl:
                `https://www.youtube.com/playlist?list=${playlist.id}`

        }))

    );

    return cards;

}
const fetch = global.fetch || require('node-fetch'); // ensuring fetch is available in Node depending on version

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Fetch multiple videos matching a search query.
 * Blocks "Shorts" by enforcing videoDuration=medium (4-20 mins) or long (>20 mins).
 */
async function searchVideos(query, maxResults = 15) {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY is missing');
  }

  // We remove the native videoDuration filter to allow long master-videos (>20 mins) and (<60 mins)
  // We rely entirely on our mathematical Noise Filter to remove Shorts (<200s)
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&order=relevance&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube Search API Error: ${err}`);
  }
  
  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    return [];
  }

  return data.items.map(item => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`
  }));
}

/**
 * Fetch video details (duration, views, likes) for a comma-separated list of video IDs
 */
async function getVideoDetails(videoIds) {
  if (!videoIds || videoIds.length === 0) return [];
  if (!YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY is missing');

  const idString = videoIds.join(',');
  const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${idString}&key=${YOUTUBE_API_KEY}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube Videos API Error: ${err}`);
  }

  const data = await res.json();
  if (!data.items) return [];

  // Map to easily accessible structure
  const detailsMap = {};
  data.items.forEach(item => {
    detailsMap[item.id] = {
      duration: item.contentDetails.duration, // e.g. PT15M33S
      viewCount: item.statistics.viewCount,
      likeCount: item.statistics.likeCount,
    };
  });

  return detailsMap;
}

module.exports = {
  searchVideos,
  getVideoDetails
};

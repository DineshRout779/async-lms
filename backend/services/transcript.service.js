const { YoutubeTranscript } = require('youtube-transcript');

/**
 * Extracts the YouTube Video ID from a given URL
 * Handles standard watch URLs, shortcode (youtu.be), and embeds
 */
function extractVideoId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

const transcriptCache = new Map();

/**
 * Fetches the transcript for a given YouTube Video ID or URL.
 * It compresses the transcript into a simpler array of { text, offset, duration }
 * where offset is the timestamp in seconds.
 */
async function fetchVideoTranscript(videoUrlOrId) {
  try {
    const videoId = extractVideoId(videoUrlOrId) || videoUrlOrId;
    if (!videoId) throw new Error('Invalid YouTube URL or Video ID');

    if (transcriptCache.has(videoId)) {
      return transcriptCache.get(videoId);
    }

    // Fetch the transcript
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    const result = transcript.map(t => ({
      text: t.text.replace(/&amp;/g, '&').replace(/&#39;/g, "'"),
      offsetSec: parseFloat(t.offset) / 1000,
      durationSec: parseFloat(t.duration) / 1000
    }));

    transcriptCache.set(videoId, result);
    return result;
  } catch (error) {
    console.error('Failed to fetch transcript:', error.message);
    return null; // Return null if captions are disabled/unavailable
  }
}

module.exports = {
  extractVideoId,
  fetchVideoTranscript
};

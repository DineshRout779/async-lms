/**
 * Video Recommendation Engine Filters
 */

// Helper to convert ISO 8601 duration (e.g. PT15M33S) to seconds
function parseIsoDurationToSeconds(duration) {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Noise Filter: Removes videos < 60s and > 2 hours
 */
function applyNoiseFilter(videos) {
  return videos.filter(v => {
    const durationSecs = parseIsoDurationToSeconds(v.duration);
    return durationSecs >= 60 && durationSecs <= 7200;
  });
}

/**
 * Quality Filter: Removes videos with < 1.5% like-to-view ratio.
 * Fallback: If stats are hidden, we keep it to be safe (Edge Case 6).
 */
function applyQualityFilter(videos) {
  return videos.filter(v => {
    if (!v.viewCount || !v.likeCount || parseInt(v.viewCount, 10) === 0) return true; // keep if stats hidden
    
    const views = parseInt(v.viewCount, 10);
    const likes = parseInt(v.likeCount, 10);
    
    const ratio = (likes / views) * 100;
    return ratio >= 1.5;
  });
}

/**
 * Freshness Filter: Removes videos older than X years
 * @param {Array} videos 
 * @param {number} maxYearsOld 
 */
function applyFreshnessFilter(videos, maxYearsOld = 3) {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - maxYearsOld);
  
  return videos.filter(v => {
    if (!v.publishedAt) return true;
    return new Date(v.publishedAt) >= cutoffDate;
  });
}

/**
 * View Count Filter: Removes videos with less than the minimum view threshold.
 * This ensures we don't recommend obscure videos from beginner channels.
 */
function applyViewCountFilter(videos, minViews = 10000) {
  return videos.filter(v => {
    if (!v.viewCount) return true; // keep if stats hidden to be safe
    const views = parseInt(v.viewCount, 10);
    return views >= minViews;
  });
}

/**
 * Scores and ranks videos based on the formula:
 * (relevance * 0.40) + (engagement * 0.25) + (authority * 0.20) + (freshness * 0.15)
 */
function rankVideos(videos, whitelistMap, originalQuery = "") {
  // Heuristic: Determine Ideal Duration from Query Context
  const queryLower = originalQuery.toLowerCase();
  let idealMinDuration = 10 * 60; // Default 10 mins
  let idealMaxDuration = 40 * 60; // Default 40 mins
  
  if (queryLower.includes("course") || queryLower.includes("project") || queryLower.includes("masterclass") || queryLower.includes("build a") || queryLower.includes("full")) {
    idealMinDuration = 30 * 60;
    idealMaxDuration = 120 * 60;
  } else if (queryLower.includes("syntax") || queryLower.includes("intro") || queryLower.includes("what is") || queryLower.includes("basics")) {
    idealMinDuration = 5 * 60;
    idealMaxDuration = 20 * 60;
  }

  // We need min/max for normalization
  let maxViews = 1;
  let maxLikesRatio = 1;
  const now = new Date();

  videos.forEach(v => {
    const views = parseInt(v.viewCount || 0, 10);
    if (views > maxViews) maxViews = views;

    const likes = parseInt(v.likeCount || 0, 10);
    const ratio = views > 0 ? (likes / views) * 100 : 0;
    if (ratio > maxLikesRatio) maxLikesRatio = ratio;
  });

  // Extract core keywords from the query (ignoring common stop words)
  const stopWords = new Set(["tutorial", "for", "beginners", "how", "to", "the", "and", "in", "with", "a", "an", "code-along", "hands-on"]);
  const queryWords = originalQuery.toLowerCase().split(/\s+/).filter(w => !stopWords.has(w) && w.length > 2);

  const scored = videos.map((v, index) => {
    // Relevance (0 to 1): Base relevance relies on YouTube's sorting (index)
    let relevanceScore = Math.max(0.1, 1.0 - (index * 0.05));

    // Title Exact Match Penalty: If the title is missing the core query terms, severely penalize it.
    if (queryWords.length > 0 && v.title) {
      const titleLower = v.title.toLowerCase();
      let matchCount = 0;
      queryWords.forEach(qw => {
        if (titleLower.includes(qw)) matchCount++;
      });
      // If none of the core keywords are in the title, drop relevance drastically
      if (matchCount === 0) {
        relevanceScore *= 0.1; 
      } else {
        // Boost relevance if more words match
        relevanceScore = Math.min(1.0, relevanceScore + (matchCount / queryWords.length) * 0.2);
      }
    }

    // Engagement (0 to 1): Combination of views volume and like ratio
    const views = parseInt(v.viewCount || 0, 10);
    const likes = parseInt(v.likeCount || 0, 10);
    const ratio = views > 0 ? (likes / views) * 100 : 0;
    
    const viewScore = Math.min(1.0, views / (maxViews || 1));
    const likeScore = Math.min(1.0, ratio / (maxLikesRatio || 1));
    const engagementScore = (viewScore * 0.4) + (likeScore * 0.6);

    // Authority (0 to 1)
    let authorityScore = 0.5; // Default average
    if (whitelistMap && whitelistMap[v.channelId]) {
      authorityScore = 1.0; // Huge boost for whitelisted channels
    }

    // Freshness (0 to 1): Newer is better
    let freshnessScore = 0.5;
    if (v.publishedAt) {
      const pubDate = new Date(v.publishedAt);
      const ageMs = now - pubDate;
      const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365);
      // 0 years old = 1.0, 5 years old = 0.0
      freshnessScore = Math.max(0, 1.0 - (ageYears / 5));
    }

    // Duration Score (0 to 1): AI Human-like duration logic
    let durationScore = 0.5; // neutral
    if (v.duration) {
      const durationSecs = parseIsoDurationToSeconds(v.duration);
      if (durationSecs >= idealMinDuration && durationSecs <= idealMaxDuration) {
        durationScore = 1.0; // Perfect duration for this specific topic!
      } else if (durationSecs < idealMinDuration) {
        // Too short, penalty proportional to how short it is
        durationScore = Math.max(0.2, durationSecs / idealMinDuration);
        
        // Human Factor Exception: If the short video is an absolute banger 
        // (insanely high engagement), we forgive the duration penalty completely!
        if (engagementScore > 0.75) {
          durationScore = Math.min(1.0, durationScore + 0.6);
        }
      } else if (durationSecs > idealMaxDuration) {
        // Too long, penalty
        durationScore = Math.max(0.2, idealMaxDuration / durationSecs);
        
        // Human Factor Exception: If the long video has huge engagement, boost it slightly
        if (engagementScore > 0.8) {
          durationScore = Math.min(1.0, durationScore + 0.3);
        }
      }
    }

    // Final Formula
    const finalScore = 
      (relevanceScore * 0.35) + 
      (durationScore * 0.20) + 
      (engagementScore * 0.20) + 
      (authorityScore * 0.15) + 
      (freshnessScore * 0.10);

    return {
      ...v,
      scores: {
        relevance: relevanceScore.toFixed(3),
        duration: durationScore.toFixed(3),
        engagement: engagementScore.toFixed(3),
        authority: authorityScore.toFixed(3),
        freshness: freshnessScore.toFixed(3),
        final: finalScore.toFixed(3)
      }
    };
  });

  // Sort descending by final score
  scored.sort((a, b) => parseFloat(b.scores.final) - parseFloat(a.scores.final));
  return scored;
}

module.exports = {
  parseIsoDurationToSeconds,
  applyNoiseFilter,
  applyQualityFilter,
  applyFreshnessFilter,
  applyViewCountFilter,
  rankVideos
};

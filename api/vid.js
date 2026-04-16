export default async function handler(req, res) {
  // 1. Get the video ID from the URL query (/api/vid?id=VIDEO_ID)
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Video ID is required. Example: /api/vid?id=UxxajLWwzqY" });
  }

  // 2. Add your multiple API keys here
  const apiKeys =[
    "d1edce158amshec139440d20658ap1f2545jsnbb7da9add82f",
    // "YOUR_SECOND_KEY_HERE", 
    // "YOUR_THIRD_KEY_HERE"
  ];

  // Select a random key from the array
  const selectedKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

  try {
    // 3. Make the request to RapidAPI
    const fetchResponse = await fetch(`https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'ytstream-download-youtube-videos.p.rapidapi.com',
        'x-rapidapi-key': selectedKey
      }
    });

    const data = await fetchResponse.json();

    // Catch API level errors (like rate limits or invalid IDs)
    if (data.status !== "OK") {
      return res.status(400).json({ error: "API returned an error", details: data });
    }

    const videoResult =[];
    const audioResult =[];

    // Combine standard formats (usually Video+Audio) and adaptiveFormats (usually separated Audio or Video)
    const allFormats = [
      ...(data.formats || []),
      ...(data.adaptiveFormats ||[])
    ];

    // Helper function to format bytes to MB
    const formatBytes = (bytes) => {
      if (!bytes) return "Unknown";
      const mb = (parseInt(bytes) / (1024 * 1024)).toFixed(2);
      return `${mb} MB`;
    };

    // 4. Filter and format the response
    allFormats.forEach(item => {
      const mimeType = item.mimeType || "";
      
      // Determine if the stream contains Video
      // (It has a width attribute OR mimeType starts with 'video/')
      const hasVideo = typeof item.width !== 'undefined' || mimeType.startsWith('video/');
      
      // Determine if the stream contains Audio
      // (It has an audioQuality attribute OR mimeType starts with 'audio/' OR the codecs include 'mp4a' which is audio)
      const hasAudio = typeof item.audioQuality !== 'undefined' || mimeType.startsWith('audio/') || mimeType.includes('mp4a');

      // Calculate file size. (Standard 'formats' often lack contentLength, so we calculate it from bitrate if missing)
      let sizeStr = formatBytes(item.contentLength);
      if (!item.contentLength && item.bitrate && item.approxDurationMs) {
        const estimatedBytes = (parseInt(item.bitrate) * (parseInt(item.approxDurationMs) / 1000)) / 8;
        sizeStr = formatBytes(estimatedBytes) + " (Estimated)";
      }

      // Clean up mimeType for output (e.g., "video/mp4; codecs=..." becomes "video/mp4")
      const formatType = mimeType.split(';')[0] || "Unknown";

      // --- Give ONLY video WITH audio ---
      if (hasVideo && hasAudio) {
        videoResult.push({
          Quality: item.qualityLabel || "Unknown",
          Format: formatType,
          Size: sizeStr,
          Link: item.url || ""
        });
      } 
      
      // --- Give Audio ONLY ---
      else if (!hasVideo && hasAudio) {
        // Format the audio quality nicely (e.g., AUDIO_QUALITY_LOW -> LOW) or fallback to Bitrate
        let audioQ = item.audioQuality ? item.audioQuality.replace('AUDIO_QUALITY_', '') : `${Math.round(item.bitrate / 1000)}kbps`;
        
        audioResult.push({
          Quality: audioQ,
          Format: formatType,
          Size: sizeStr,
          Link: item.url || ""
        });
      }
    });

    // 5. Send the filtered response
    return res.status(200).json({
      Video: videoResult,
      Audio: audioResult
    });

  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch from API", details: error.message });
  }
}

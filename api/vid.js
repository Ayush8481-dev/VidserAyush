export default async function handler(req, res) {
  // 1. Setup Strict CORS specifically for your domain
  const allowedDomain = 'https://musicayush.vercel.app';
  
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', allowedDomain);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Security Check: Block direct browser access & unauthorized domains
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  
  // A request is "allowed" if the Origin matches exactly, OR if the Referer starts with your domain.
  const isAllowedOrigin = origin === allowedDomain;
  const isAllowedReferer = referer && referer.startsWith(allowedDomain);

  if (!isAllowedOrigin && !isAllowedReferer) {
    // FAKE DATA RESPONSE for direct browser visits or other websites
    return res.status(200).json({
      message: "Direct API access is restricted. Data below is mocked.",
      Video:[
        {
          Quality: "1080p",
          Format: "video/mp4",
          Size: "45.20 MB",
          Link: "https://www.w3schools.com/html/mov_bbb.mp4" // Fake demo video
        },
        {
          Quality: "720p",
          Format: "video/mp4",
          Size: "18.15 MB",
          Link: "https://www.w3schools.com/html/mov_bbb.mp4"
        }
      ],
      Audio:[
        {
          Quality: "MEDIUM",
          Format: "audio/mp4",
          Size: "3.50 MB",
          Link: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" // Fake demo audio
        }
      ]
    });
  }

  // --- REAL DATA LOGIC BELOW (Only runs if called securely from your app) ---

  // 3. Get the video ID from the URL query
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Video ID is required. Example: /api/vid?id=UxxajLWwzqY" });
  }

  // 4. Add your multiple API keys here
  const apiKeys =[
    "d1edce158amshec139440d20658ap1f2545jsnbb7da9add82f",
    // "YOUR_SECOND_KEY_HERE", 
    // "YOUR_THIRD_KEY_HERE"
  ];

  // Select a random key from the array
  const selectedKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

  try {
    // 5. Make the request to RapidAPI
    const fetchResponse = await fetch(`https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'ytstream-download-youtube-videos.p.rapidapi.com',
        'x-rapidapi-key': selectedKey
      }
    });

    const data = await fetchResponse.json();

    if (data.status !== "OK") {
      return res.status(400).json({ error: "API returned an error", details: data });
    }

    const videoResult =[];
    const audioResult = [];

    const allFormats = [
      ...(data.formats || []),
      ...(data.adaptiveFormats ||[])
    ];

    const formatBytes = (bytes) => {
      if (!bytes) return "Unknown";
      const mb = (parseInt(bytes) / (1024 * 1024)).toFixed(2);
      return `${mb} MB`;
    };

    // 6. Filter and format the response
    allFormats.forEach(item => {
      const mimeType = item.mimeType || "";
      
      const hasVideo = typeof item.width !== 'undefined' || mimeType.startsWith('video/');
      const hasAudio = typeof item.audioQuality !== 'undefined' || mimeType.startsWith('audio/') || mimeType.includes('mp4a');

      let sizeStr = formatBytes(item.contentLength);
      if (!item.contentLength && item.bitrate && item.approxDurationMs) {
        const estimatedBytes = (parseInt(item.bitrate) * (parseInt(item.approxDurationMs) / 1000)) / 8;
        sizeStr = formatBytes(estimatedBytes) + " (Estimated)";
      }

      const formatType = mimeType.split(';')[0] || "Unknown";

      if (hasVideo && hasAudio) {
        videoResult.push({
          Quality: item.qualityLabel || "Unknown",
          Format: formatType,
          Size: sizeStr,
          Link: item.url || ""
        });
      } 
      else if (!hasVideo && hasAudio) {
        let audioQ = item.audioQuality ? item.audioQuality.replace('AUDIO_QUALITY_', '') : `${Math.round(item.bitrate / 1000)}kbps`;
        
        audioResult.push({
          Quality: audioQ,
          Format: formatType,
          Size: sizeStr,
          Link: item.url || ""
        });
      }
    });

    // 7. Send the real response
    return res.status(200).json({
      Video: videoResult,
      Audio: audioResult
    });

  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch from API", details: error.message });
  }
}

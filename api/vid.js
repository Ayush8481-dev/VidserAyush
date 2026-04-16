export default async function handler(req, res) {
  // 1. Get the video ID from the URL query (/api/vid?id=VIDEO_ID)
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Video ID is required. Example: /api/vid?id=UxxajLWwzqY" });
  }

  // 2. Add your multiple API keys here. The code will pick one randomly per request.
  const apiKeys =[
    "d1edce158amshec139440d20658ap1f2545jsnbb7da9add82f",
    "", // <-- Replace with actual keys
    ""   // <-- Keep adding as many as you need
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

    // Note: RapidAPI structures can vary. Usually, the streams are under an array like `data.formats`, `data.links`, or `data.data`.
    // Change `data.formats` below if the API uses a different object name.
    const formats = data.formats || data.links || data.data || [];

    const videoResult =[];
    const audioResult =[];

    // 4. Filter and format the response
    if (Array.isArray(formats)) {
      formats.forEach(item => {
        // Checking if the item has video and audio properties
        // You may need to adapt 'item.hasVideo' depending on the exact RapidAPI JSON property names
        const hasVideo = item.hasVideo === true || item.videoCodec !== null;
        const hasAudio = item.hasAudio === true || item.audioCodec !== null;

        // Give ONLY video WITH audio
        if (hasVideo && hasAudio) {
          videoResult.push({
            Quality: item.qualityLabel || item.quality || "Unknown",
            Size: item.contentLength || item.size || "Unknown",
            Link: item.url || item.link || ""
          });
        } 
        // Give Audio ONLY
        else if (!hasVideo && hasAudio) {
          audioResult.push({
            Quality: item.audioQuality || item.quality || item.bitrate || "Unknown",
            Size: item.contentLength || item.size || "Unknown",
            Link: item.url || item.link || ""
          });
        }
      });
    }

    // 5. Send the filtered response
    return res.status(200).json({
      Video: videoResult,
      Audio: audioResult
    });

  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch from API", details: error.message });
  }
}

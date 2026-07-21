import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "B2B Marketing";
    
    const query = `${category} tutorial B2B`;
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36"
      }
    });
    
    if (!res.ok) throw new Error("YouTube fetch failed");
    const html = await res.text();
    
    const match = html.match(/ytInitialData\s*=\s*({.+?});/);
    if (!match) return NextResponse.json({ videos: [] });
    
    const data = JSON.parse(match[1]);
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
    
    const videos = [];
    for (const item of contents) {
      const videoRenderer = item.videoRenderer;
      if (!videoRenderer) continue;
      
      const title = videoRenderer.title?.runs?.[0]?.text || "";
      const videoId = videoRenderer.videoId || "";
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const description = videoRenderer.detailedMetadataSnippets?.[0]?.snippetText?.runs?.[0]?.text || videoRenderer.descriptionSnippet?.runs?.[0]?.text || "";
      const views = videoRenderer.viewCountText?.simpleText || "";
      const thumbnail = videoRenderer.thumbnail?.thumbnails?.[0]?.url || "";
      
      // Validation check
      if (title && videoId && url.startsWith("https://") && thumbnail.startsWith("https://")) {
        videos.push({
          id: `yt-${videoId}`,
          title,
          url,
          takeaway: description || "Explore B2B growth insights in this video tutorial.",
          category,
          views,
          likes: "",
          thumbnail
        });
      }
      
      if (videos.length >= 6) break;
    }
    
    return NextResponse.json({ videos });
  } catch (error) {
    return NextResponse.json({ error: error.message, videos: [] }, { status: 500 });
  }
}

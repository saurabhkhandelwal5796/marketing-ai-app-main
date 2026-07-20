import { NextResponse } from "next/server";

function toSvgDataUrl(text, index) {
  const safe = String(text || "Generated Media").slice(0, 60).replace(/[<>&]/g, "");
  const palettes = [
    ["#0ea5e9", "#2563eb"],
    ["#06b6d4", "#0f766e"],
    ["#7c3aed", "#db2777"],
  ];
  const [a, b] = palettes[index % palettes.length];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'>
  <defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0%' stop-color='${a}'/><stop offset='100%' stop-color='${b}'/></linearGradient></defs>
  <rect width='1200' height='630' fill='url(#g)'/>
  <text x='70' y='300' font-size='52' fill='white' font-family='Arial' font-weight='700'>${safe}</text>
  <text x='70' y='360' font-size='28' fill='white' font-family='Arial'>AI Generated Visual</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = String(body?.prompt || "").trim();
    const count = Math.min(3, Math.max(1, Number(body?.count || 2)));
    if (!prompt) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    let media = [];

    if (apiKey) {
      const generations = await Promise.all(
        Array.from({ length: count }, async (_, idx) => {
          try {
            const res = await fetch("https://api.openai.com/v1/images/generations", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: "gpt-image-1",
                prompt: `${prompt}. Variation ${idx + 1}.`,
                size: "1024x1024",
              }),
            });
            const data = await res.json();
            if (!res.ok || !data?.data?.[0]) return null;
            if (data.data[0].b64_json) {
              return {
                id: `img-${Date.now()}-${idx}`,
                url: `data:image/png;base64,${data.data[0].b64_json}`,
              };
            }
            if (data.data[0].url) {
              return {
                id: `img-${Date.now()}-${idx}`,
                url: data.data[0].url,
              };
            }
            return null;
          } catch {
            return null;
          }
        })
      );
      media = generations.filter(Boolean);
    }

    if (media.length === 0) {
      media = Array.from({ length: count }, (_, idx) => ({
        id: `img-${Date.now()}-${idx}`,
        url: toSvgDataUrl(`${prompt} ${Date.now()}-${idx}`, idx),
      }));
    }

    return NextResponse.json({ media });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to generate media." }, { status: 500 });
  }
}

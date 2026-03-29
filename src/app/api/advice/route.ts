import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ advice: "APIキーが未設定です。Netlifyの環境変数にANTHROPIC_API_KEYを追加してください。" });

  try {
    const { summary } = await req.json();
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 1000,
        messages: [{ role: "user", content: `優秀なFPとして以下の家計データを分析。具体的アドバイスを3〜5個、日本語で簡潔に。良い点は褒め、改善点は金額付きで提案。絵文字を使ってフレンドリーに。\n\n${summary}` }],
      }),
    });
    const data = await r.json();
    const text = data.content?.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
    return NextResponse.json({ advice: text || "分析結果を取得できませんでした。" });
  } catch (e: any) {
    return NextResponse.json({ advice: "AI分析エラー: " + e.message });
  }
}

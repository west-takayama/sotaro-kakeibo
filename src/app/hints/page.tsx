import type { Metadata } from "next";
import Link from "next/link";
import { ARTICLES } from "./articles";
import { SITE_URL } from "../site";

export const metadata: Metadata = {
  title: "お金のヒント | マイ決算書",
  description: "家計を決算書(P/L・B/S)で見る方法、カード明細の取り込み、固定費の見直し、NISAの準備など、家計と資産形成のヒントをまとめました。",
  alternates: { canonical: `${SITE_URL}/hints` },
  openGraph: { title: "お金のヒント | マイ決算書", description: "家計と資産形成のヒント集", url: `${SITE_URL}/hints`, type: "website" },
};

export default function HintsIndex() {
  return (
    <main style={{maxWidth:720,margin:"0 auto",padding:"32px 20px 64px",color:"var(--t2)",lineHeight:1.8}}>
      <nav style={{fontSize:13,color:"var(--t7)",marginBottom:20}}>
        <Link href="/" style={{color:"#4ECDC4",textDecoration:"none"}}>← マイ決算書に戻る</Link>
      </nav>
      <h1 style={{fontSize:28,fontWeight:800,margin:"0 0 8px",background:"linear-gradient(135deg,#FF6B6B,#FFB347)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>💡 お金のヒント</h1>
      <p style={{fontSize:15,color:"var(--t5)",margin:"0 0 32px"}}>家計を決算書で見る方法、明細の自動取り込み、固定費の見直し、NISAの準備など、お金まわりのヒントをまとめました。</p>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {ARTICLES.map(a=>(
          <Link key={a.slug} href={`/hints/${a.slug}`} style={{display:"block",textDecoration:"none",background:"rgba(var(--wrgb),0.035)",border:"1px solid rgba(var(--wrgb),0.08)",borderRadius:16,padding:20}}>
            <h2 style={{fontSize:18,fontWeight:700,margin:"0 0 6px",color:"var(--t1)"}}>{a.title}</h2>
            <p style={{fontSize:14,color:"var(--t6)",margin:0}}>{a.description}</p>
            <span style={{display:"inline-block",marginTop:10,fontSize:13,color:"#FFB347",fontWeight:700}}>続きを読む →</span>
          </Link>
        ))}
      </div>
      <div style={{marginTop:40,padding:"20px",borderRadius:16,background:"linear-gradient(135deg,rgba(255,107,107,0.08),rgba(255,179,71,0.05))",border:"1px solid rgba(255,179,71,0.25)",textAlign:"center"}}>
        <p style={{fontSize:15,fontWeight:700,color:"var(--t2)",margin:"0 0 4px"}}>カード明細を入れるだけで、自分の決算書ができる家計簿</p>
        <p style={{fontSize:13,color:"var(--t6)",margin:"0 0 14px"}}>広告なし・登録不要・データは端末の中だけ。完全無料。</p>
        <Link href="/" style={{display:"inline-block",background:"linear-gradient(135deg,#FF6B6B,#FF8E53)",color:"#fff",padding:"12px 28px",borderRadius:12,fontSize:15,fontWeight:800,textDecoration:"none"}}>マイ決算書を無料で使う →</Link>
      </div>
    </main>
  );
}

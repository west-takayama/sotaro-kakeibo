import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTICLES, getArticle } from "../articles";
import { SITE_URL } from "../../site";

export function generateStaticParams() {
  return ARTICLES.map(a => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) return {};
  const url = `${SITE_URL}/hints/${a.slug}`;
  return {
    title: `${a.title} | マイ決算書`,
    description: a.description,
    alternates: { canonical: url },
    openGraph: { title: a.title, description: a.description, url, type: "article" },
    twitter: { card: "summary_large_image", title: a.title, description: a.description },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) notFound();
  const url = `${SITE_URL}/hints/${a.slug}`;
  // 構造化データ（Article）— 検索エンジンに記事として認識させSEOを強化
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Article",
    headline: a.title, description: a.description, dateModified: a.updated,
    mainEntityOfPage: url, inLanguage: "ja",
    author: { "@type": "Organization", name: "マイ決算書" },
    publisher: { "@type": "Organization", name: "マイ決算書" },
  };
  const related = a.related.map(getArticle).filter(Boolean);
  return (
    <main style={{maxWidth:720,margin:"0 auto",padding:"32px 20px 64px",color:"var(--t2)",lineHeight:1.9}}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav style={{fontSize:13,color:"var(--t7)",marginBottom:20}}>
        <Link href="/hints" style={{color:"#4ECDC4",textDecoration:"none"}}>← お金のヒント一覧</Link>
      </nav>
      <article>
        <h1 style={{fontSize:26,fontWeight:800,margin:"0 0 10px",color:"var(--t1)",lineHeight:1.5}}>{a.title}</h1>
        <p style={{fontSize:12,color:"var(--t8)",margin:"0 0 20px"}}>更新: {a.updated}</p>
        <p style={{fontSize:15.5,color:"var(--t4)",margin:"0 0 28px",padding:"14px 16px",background:"rgba(var(--wrgb),0.04)",borderRadius:12,borderLeft:"3px solid #FFB347"}}>{a.lead}</p>
        {a.sections.map((s,i)=>(
          <section key={i} style={{marginBottom:24}}>
            {s.h && <h2 style={{fontSize:19,fontWeight:700,margin:"0 0 10px",color:"var(--t1)"}}>{s.h}</h2>}
            {s.p?.map((para,j)=><p key={j} style={{fontSize:15,color:"var(--t3)",margin:"0 0 12px"}}>{para}</p>)}
            {s.list && <ul style={{margin:"0 0 12px",paddingLeft:22,color:"var(--t3)"}}>{s.list.map((li,j)=><li key={j} style={{fontSize:15,marginBottom:6}}>{li}</li>)}</ul>}
            {s.note && <p style={{fontSize:13,color:"var(--t6)",margin:0,padding:"10px 14px",background:"rgba(52,152,219,0.06)",border:"1px solid rgba(52,152,219,0.18)",borderRadius:10}}>ℹ️ {s.note}</p>}
          </section>
        ))}
      </article>

      {/* アプリへのCTA */}
      <div style={{marginTop:36,padding:"22px 20px",borderRadius:16,background:"linear-gradient(135deg,rgba(255,107,107,0.08),rgba(255,179,71,0.05))",border:"1px solid rgba(255,179,71,0.25)",textAlign:"center"}}>
        <p style={{fontSize:16,fontWeight:800,color:"var(--t1)",margin:"0 0 4px"}}>💰 マイ決算書</p>
        <p style={{fontSize:14,color:"var(--t5)",margin:"0 0 4px"}}>カード明細を入れるだけで、自分専用の決算書ができる無料の家計簿アプリ。</p>
        <p style={{fontSize:13,color:"var(--t7)",margin:"0 0 16px"}}>広告なし・登録不要・データは端末の中だけ。</p>
        <Link href="/" style={{display:"inline-block",background:"linear-gradient(135deg,#FF6B6B,#FF8E53)",color:"#fff",padding:"13px 30px",borderRadius:12,fontSize:15,fontWeight:800,textDecoration:"none"}}>無料で使ってみる →</Link>
      </div>

      {related.length>0 && (
        <div style={{marginTop:36}}>
          <h2 style={{fontSize:17,fontWeight:700,margin:"0 0 12px",color:"var(--t3)"}}>関連する記事</h2>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {related.map(r=>r&&(
              <Link key={r.slug} href={`/hints/${r.slug}`} style={{textDecoration:"none",fontSize:15,color:"#4ECDC4",fontWeight:600,padding:"12px 14px",background:"rgba(var(--wrgb),0.03)",border:"1px solid rgba(var(--wrgb),0.07)",borderRadius:12}}>{r.title} →</Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

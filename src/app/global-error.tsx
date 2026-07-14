"use client";
// ルートレイアウト自体が壊れた場合の最終防衛ライン
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ja">
      <body style={{margin:0,minHeight:"100vh",background:"#0b0b1a",color:"#e0e0e0",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Hiragino Sans',-apple-system,sans-serif"}}>
        <div style={{maxWidth:400,textAlign:"center",padding:20}}>
          <div style={{fontSize:44,marginBottom:12}}>🛠️</div>
          <h2 style={{fontSize:16,fontWeight:700,margin:"0 0 8px"}}>アプリを読み込めませんでした</h2>
          <p style={{fontSize:12,color:"#999",lineHeight:1.8,margin:"0 0 16px"}}>データは端末内に保存されているため消えていません。再読み込みをお試しください。</p>
          <button onClick={()=>reset()} style={{background:"#FF6B6B",border:"none",color:"#fff",padding:"12px 28px",borderRadius:12,fontSize:14,fontWeight:600,cursor:"pointer"}}>再読み込み</button>
        </div>
      </body>
    </html>
  );
}

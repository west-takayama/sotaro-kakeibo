"use client";
// 画面内で予期しないエラーが起きたときの回復画面（白画面のまま固まらせない）
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{minHeight:"100vh",background:"#0b0b1a",color:"#e0e0e0",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Hiragino Sans',-apple-system,sans-serif"}}>
      <div style={{maxWidth:400,textAlign:"center"}}>
        <div style={{fontSize:44,marginBottom:12}}>😢</div>
        <h2 style={{fontSize:16,fontWeight:700,margin:"0 0 8px",color:"#eee"}}>問題が発生しました</h2>
        <p style={{fontSize:12,color:"#999",lineHeight:1.8,margin:"0 0 16px"}}>
          ご迷惑をおかけしています。下のボタンでやり直せます。<br/>
          あなたのデータはこの端末の中に保存されているため、消えていません。
        </p>
        <button onClick={()=>reset()} style={{background:"linear-gradient(135deg,#FF6B6B,#FF8E53)",border:"none",color:"#fff",padding:"12px 28px",borderRadius:12,fontSize:14,fontWeight:600,cursor:"pointer",marginBottom:10,width:"100%"}}>もう一度試す</button>
        <button onClick={()=>window.location.reload()} style={{background:"rgba(255,255,255,0.06)",border:"1px solid #333",color:"#ccc",padding:"11px 28px",borderRadius:12,fontSize:13,cursor:"pointer",width:"100%"}}>アプリを再読み込み</button>
        {error?.message&&<p style={{fontSize:9,color:"#555",marginTop:14,wordBreak:"break-all"}}>詳細: {String(error.message).slice(0,120)}</p>}
      </div>
    </div>
  );
}

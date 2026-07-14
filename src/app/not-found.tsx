// 存在しないURLに来たときの案内（PWAショートカット以外のパスなど）
export default function NotFound() {
  return (
    <div style={{minHeight:"100vh",background:"#0b0b1a",color:"#e0e0e0",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Hiragino Sans',-apple-system,sans-serif"}}>
      <div style={{maxWidth:400,textAlign:"center"}}>
        <div style={{fontSize:44,marginBottom:12}}>🔍</div>
        <h2 style={{fontSize:16,fontWeight:700,margin:"0 0 8px",color:"#eee"}}>ページが見つかりません</h2>
        <p style={{fontSize:12,color:"#999",margin:"0 0 16px"}}>お探しのページは存在しないか、移動しました。</p>
        <a href="/" style={{display:"inline-block",background:"linear-gradient(135deg,#FF6B6B,#FF8E53)",color:"#fff",padding:"12px 28px",borderRadius:12,fontSize:14,fontWeight:600,textDecoration:"none"}}>アプリに戻る</a>
      </div>
    </div>
  );
}

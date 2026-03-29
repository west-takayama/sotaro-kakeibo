"use client";
import { useState, useCallback, useMemo, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

// ═══ Storage ═══
function LD() { try { const s = localStorage.getItem("kakeibo-v4"); return s ? JSON.parse(s) : null; } catch { return null; } }
function SV(d: any) { try { localStorage.setItem("kakeibo-v4", JSON.stringify(d)); } catch {} }

// ═══ Categories ═══
const EC: Record<string, { i: string; c: string; t: string }> = {
  "食費（コンビニ）":{i:"🏪",c:"#FF6B6B",t:"v"},"食費（外食）":{i:"🍽️",c:"#E74C3C",t:"v"},
  "食費（自炊）":{i:"🥗",c:"#E95E4E",t:"v"},"日用品":{i:"🛍️",c:"#F39C12",t:"v"},
  "光熱費":{i:"💡",c:"#2ECC71",t:"f"},"通信費":{i:"📱",c:"#3498DB",t:"f"},
  "サブスク":{i:"🔄",c:"#9B59B6",t:"f"},"保険":{i:"🛡️",c:"#1ABC9C",t:"f"},
  "家賃・住居":{i:"🏠",c:"#16A085",t:"f"},"交通・車":{i:"🚃",c:"#4ECDC4",t:"v"},
  "健康":{i:"💪",c:"#E67E22",t:"f"},"教育・自己投資":{i:"📚",c:"#2980B9",t:"v"},
  "水・飲料":{i:"💧",c:"#5DADE2",t:"f"},"美容・衣服":{i:"👔",c:"#E6A8D7",t:"v"},
  "家電":{i:"🖥️",c:"#F1C40F",t:"v"},"医療費":{i:"🏥",c:"#87CEEB",t:"v"},
  "娯楽":{i:"🎮",c:"#FFB347",t:"v"},"税金・公的":{i:"🏛️",c:"#D2B48C",t:"f"},
  "現金支出":{i:"💴",c:"#A3BE8C",t:"v"},"その他":{i:"📦",c:"#95A5A6",t:"v"},
};
const IT = [
  {id:"salary",l:"給与",i:"💼",c:"#2ECC71"},{id:"side",l:"副業",i:"🔥",c:"#F39C12"},
  {id:"bonus",l:"賞与",i:"🎉",c:"#E74C3C"},{id:"invest",l:"投資収益",i:"📈",c:"#3498DB"},
  {id:"other",l:"その他",i:"💰",c:"#9B59B6"},
];
const AT = [
  {id:"savings",l:"普通預金",i:"🏦",c:"#2ECC71"},{id:"fixed_deposit",l:"定期預金",i:"🔒",c:"#1ABC9C"},
  {id:"stocks",l:"株式",i:"📈",c:"#3498DB"},{id:"funds",l:"投資信託",i:"📊",c:"#9B59B6"},
  {id:"crypto",l:"暗号資産",i:"₿",c:"#F39C12"},{id:"cash",l:"現金",i:"💴",c:"#A3BE8C"},
  {id:"other_a",l:"その他",i:"💎",c:"#E67E22"},
];

// ═══ CSV Parser ═══
function autoCategory(desc: string): string {
  const d = desc.toLowerCase();
  const m = (k: string[]) => k.some(x => d.includes(x.toLowerCase()));
  if (m(["セブン","ファミリーマート","ファミマ","ローソン","デイリーヤマザキ"])) return "食費（コンビニ）";
  if (m(["すき家","吉野家","松屋","マクドナルド","スターバックス","カフェ","レストラン"])) return "食費（外食）";
  if (m(["楽天ガス","楽天でんき","東京電力","電気","ガス"])) return "光熱費";
  if (m(["ソフトバンク","楽天モバイル","ドコモ","ブロードバンド"])) return "通信費";
  if (m(["APPLE COM BILL","Netflix","Spotify","MONESTA"])) return "サブスク";
  if (m(["プルデンシャル","生命保険"])) return "保険";
  if (m(["Suica","エネオス","ガソリン"])) return "交通・車";
  if (m(["フィットネス","FIT365","ジム"])) return "健康";
  if (m(["動画編集","Udemy","セミナー"])) return "教育・自己投資";
  if (m(["プレミアムウォーター"])) return "水・飲料";
  if (m(["ルミネ","ユニクロ","美容院"])) return "美容・衣服";
  if (m(["ビックカメラ","ヨドバシ"])) return "家電";
  if (m(["ウエルパーク","ドラッグ"])) return "日用品";
  return "その他";
}
function parseCSV(text: string): any[] {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const txns: any[] = [];
  for (const line of lines) {
    const fields = line.split(/[,\t]/).map(f => f.trim().replace(/^"|"$/g, ""));
    if (fields.length < 2) continue;
    let date: string|null = null, amount: number|null = null;
    for (const f of fields) {
      if (!date && /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(f)) date = f;
      else if (!date && /^\d{1,2}[\/\-]\d{1,2}$/.test(f)) date = f;
    }
    for (let i = fields.length-1; i >= 0; i--) {
      const c = fields[i].replace(/[¥￥,、円\s]/g,"").replace(/▲|△|−/g,"-");
      if (/^-?\d{2,}$/.test(c) && Math.abs(parseInt(c))>=10) { amount = Math.abs(parseInt(c)); break; }
    }
    if (date && amount) {
      let desc = "";
      for (const f of fields) {
        if (f.includes(date)) continue;
        const c = f.replace(/[¥￥,、円\s]/g,"");
        if (/^-?\d+$/.test(c) && Math.abs(parseInt(c))===amount) continue;
        if (f.length > desc.length) desc = f;
      }
      txns.push({ id: Date.now()+Math.random()*1e4, date: date.length>5?date.slice(5):date, description: desc||"不明", amount, category: autoCategory(desc), source:"card" });
    }
  }
  return txns;
}

// ═══ Default card data ═══
const CARD = [
  {d:"02/28",n:"Suica（携帯決済）",a:1000,cat:"交通・車"},{d:"02/27",n:"セブン-イレブン",a:409,cat:"食費（コンビニ）"},
  {d:"02/25",n:"楽天ペイ",a:1100,cat:"その他"},{d:"02/24",n:"ファミリーマート",a:270,cat:"食費（コンビニ）"},
  {d:"02/24",n:"ファミリーマート",a:257,cat:"食費（コンビニ）"},{d:"02/23",n:"ロケットナウ",a:2220,cat:"日用品"},
  {d:"02/23",n:"楽天ガス",a:13040,cat:"光熱費"},{d:"02/22",n:"アイハーブ",a:6411,cat:"日用品"},
  {d:"02/22",n:"グリーンスプリングス",a:300,cat:"食費（外食）"},{d:"02/22",n:"ローソン",a:214,cat:"食費（コンビニ）"},
  {d:"02/22",n:"GREENSPRINGS",a:4324,cat:"食費（外食）"},{d:"02/20",n:"プレミアムウォーター",a:4082,cat:"水・飲料"},
  {d:"02/20",n:"ウエルパーク",a:2838,cat:"日用品"},{d:"02/19",n:"プルデンシャル生命保険",a:3145,cat:"保険"},
  {d:"02/19",n:"デイリーヤマザキ",a:621,cat:"食費（コンビニ）"},{d:"02/19",n:"ファミリーマート",a:150,cat:"食費（コンビニ）"},
  {d:"02/19",n:"ローソン",a:257,cat:"食費（コンビニ）"},{d:"02/18",n:"セブン-イレブン",a:140,cat:"食費（コンビニ）"},
  {d:"02/17",n:"ファミリーマート",a:150,cat:"食費（コンビニ）"},{d:"02/17",n:"ファミリーマート",a:160,cat:"食費（コンビニ）"},
  {d:"02/17",n:"エネオス SS",a:29,cat:"交通・車"},{d:"02/16",n:"セブン-イレブン",a:709,cat:"食費（コンビニ）"},
  {d:"02/16",n:"ファミリーマート",a:467,cat:"食費（コンビニ）"},{d:"02/15",n:"ソフトバンク",a:2925,cat:"通信費"},
  {d:"02/15",n:"ルミネ立川",a:5960,cat:"美容・衣服"},{d:"02/15",n:"ららぽーと立川",a:14981,cat:"日用品"},
  {d:"02/14",n:"動画編集講座",a:15000,cat:"教育・自己投資"},{d:"02/14",n:"セブン-イレブン",a:333,cat:"食費（コンビニ）"},
  {d:"02/14",n:"セブン-イレブン",a:140,cat:"食費（コンビニ）"},{d:"02/13",n:"APPLE COM BILL",a:1200,cat:"サブスク"},
  {d:"02/13",n:"すき家",a:450,cat:"食費（外食）"},{d:"02/12",n:"ファミリーマート",a:172,cat:"食費（コンビニ）"},
  {d:"02/11",n:"楽天モバイル",a:4403,cat:"通信費"},{d:"02/11",n:"ローソン",a:152,cat:"食費（コンビニ）"},
  {d:"02/11",n:"セブン-イレブン",a:1149,cat:"食費（コンビニ）"},{d:"02/11",n:"MONESTA",a:508,cat:"サブスク"},
  {d:"02/09",n:"FIT365 会費",a:1100,cat:"健康"},{d:"02/09",n:"セブン-イレブン",a:248,cat:"食費（コンビニ）"},
  {d:"02/09",n:"セブン-イレブン",a:270,cat:"食費（コンビニ）"},{d:"02/08",n:"楽天でんき",a:12370,cat:"光熱費"},
  {d:"02/07",n:"ビックカメラ",a:15361,cat:"家電"},{d:"02/07",n:"ルミネ立川",a:5405,cat:"美容・衣服"},
  {d:"02/07",n:"伊勢丹 立川",a:13824,cat:"日用品"},{d:"02/07",n:"ビックカメラ",a:110,cat:"家電"},
  {d:"02/07",n:"セブン-イレブン",a:140,cat:"食費（コンビニ）"},{d:"02/04",n:"楽天ブロードバンド",a:4180,cat:"通信費"},
  {d:"02/03",n:"プレミアムウォーター",a:4082,cat:"水・飲料"},{d:"02/03",n:"プレミアムウォーター",a:220,cat:"水・飲料"},
  {d:"02/01",n:"APPLE COM BILL",a:2900,cat:"サブスク"},{d:"01/28",n:"インフォマート",a:1481,cat:"日用品"},
].map((t,i) => ({id:1e3+i,date:t.d,description:t.n,amount:t.a,category:t.cat,source:"card"}));

const DEF = { months:{"2026-03":{incomes:[] as any[],manualExp:[] as any[],cardExp:CARD}}, cur:"2026-03", assets:[] as any[], assetHist:[] as any[], goal:{target:0,label:""} };

// ═══ Advice ═══
function genAdvice(tI:number, tE:number, bC:any) {
  const t:any[] = [], r = tI>0?tE/tI:0;
  if (tI===0&&tE>0) t.push({ty:"info",i:"📝",tx:"収入を登録すると収支分析できます。"});
  else if (r>1) t.push({ty:"danger",i:"🚨",tx:"支出が収入超え！赤字です。"});
  else if (r>0.9) t.push({ty:"warn",i:"⚠️",tx:`支出率${(r*100).toFixed(0)}%。貯蓄余地なし。`});
  else if (r>0.7) t.push({ty:"info",i:"💡",tx:`支出率${(r*100).toFixed(0)}%。もう少し絞ると理想的。`});
  else if (tI>0) t.push({ty:"good",i:"🎉",tx:`支出率${(r*100).toFixed(0)}%！素晴らしい！`});
  const cv=bC["食費（コンビニ）"];
  if(cv?.count>=15) t.push({ty:"warn",i:"🏪",tx:`コンビニ月${cv.count}回。スーパーで月¥${Math.round(cv.total*0.3).toLocaleString()}節約も。`});
  else if(cv?.count>=8) t.push({ty:"info",i:"🏪",tx:`コンビニ${cv.count}回。まとめ買いで減らせるかも。`});
  if(bC["光熱費"]?.total>20000) t.push({ty:"warn",i:"💡",tx:`光熱費¥${bC["光熱費"].total.toLocaleString()}。プラン見直しを。`});
  if(bC["サブスク"]?.total>5000) t.push({ty:"info",i:"🔄",tx:`サブスク¥${bC["サブスク"].total.toLocaleString()}。未使用は？`});
  if(bC["教育・自己投資"]) t.push({ty:"good",i:"📚",tx:"自己投資は将来のリターンに！"});
  if(bC["健康"]) t.push({ty:"good",i:"💪",tx:"健康への投資、素晴らしい！"});
  return t;
}

// ═══ UI Parts ═══
function BS({open,onClose,title,children}:any) {
  if(!open) return null;
  return (<div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)"}} />
    <div style={{position:"relative",width:"100%",maxWidth:480,maxHeight:"85vh",overflow:"auto",background:"#14142a",borderRadius:"20px 20px 0 0",padding:"18px 16px 30px",border:"1px solid rgba(255,255,255,0.08)",borderBottom:"none"}}>
      <div style={{width:36,height:4,background:"#444",borderRadius:2,margin:"0 auto 12px"}} />
      <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 14px",color:"#eee"}}>{title}</h3>
      {children}
    </div>
  </div>);
}
function FI({label,type,value,onChange,placeholder,children}:any) {
  return (<div style={{marginBottom:12}}>
    <label style={{fontSize:10,color:"#888",marginBottom:5,display:"block"}}>{label}</label>
    {type==="select"?<select value={value} onChange={(e:any)=>onChange(e.target.value)} style={{width:"100%",padding:"10px 12px",background:"rgba(255,255,255,0.05)",border:"1px solid #333",borderRadius:10,color:"#eee",fontSize:13,outline:"none"}}>{children}</select>
    :<div style={{position:"relative"}}>{type==="amount"&&<span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#888",fontSize:14}}>¥</span>}
    <input type={type==="amount"?"number":"text"} inputMode={type==="amount"?"numeric":"text"} value={value} onChange={(e:any)=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:"100%",boxSizing:"border-box",padding:type==="amount"?"10px 12px 10px 28px":"10px 12px",background:"rgba(255,255,255,0.05)",border:"1px solid #333",borderRadius:10,color:"#eee",fontSize:13,outline:"none",fontFamily:type==="amount"?"monospace":"inherit"}} /></div>}
  </div>);
}
function TT({active,payload}:any) {
  if(!active||!payload?.[0]) return null;
  const d=payload[0].payload;
  return <div style={{background:"#1c1c30",border:"1px solid #333",borderRadius:8,padding:"6px 10px",fontSize:11,color:"#ddd"}}><div>{d.name}</div><div style={{fontWeight:700,color:d.color||"#FF6B6B"}}>¥{(d.value??payload[0].value??0).toLocaleString()}</div></div>;
}
const cs = (s:any={}) => ({background:"rgba(255,255,255,0.035)",borderRadius:14,padding:14,border:"1px solid rgba(255,255,255,0.06)",marginBottom:12,...s});
const B1:React.CSSProperties = {background:"linear-gradient(135deg,#FF6B6B,#FF8E53)",border:"none",color:"#fff",padding:"12px 0",borderRadius:12,fontSize:14,fontWeight:600,cursor:"pointer",width:"100%",fontFamily:"inherit"};

// ═══ MAIN ═══
export default function Home() {
  const [D,sD]=useState(DEF); const [pg,sPg]=useState("home"); const [rdy,sRdy]=useState(false);
  const [shI,sShI]=useState(false); const [shE,sShE]=useState(false); const [shA,sShA]=useState(false);
  const [shG,sShG]=useState(false); const [shM,sShM]=useState(false); const [shIn,sShIn]=useState(false);
  const [shUp,sShUp]=useState(false); const [eI,sEI]=useState<number|null>(null);
  const [aiT,sAiT]=useState(""); const [aiL,sAiL]=useState(false);
  const [upR,sUpR]=useState(""); const [upL,sUpL]=useState(false);
  const [fIT,sfIT]=useState("salary"); const [fIA,sfIA]=useState(""); const [fIN,sfIN]=useState("");
  const [fEC,sfEC]=useState("食費（自炊）"); const [fEA,sfEA]=useState(""); const [fEN,sfEN]=useState(""); const [fED,sfED]=useState("");
  const [fAT,sfAT]=useState("savings"); const [fAA,sfAA]=useState(""); const [fAN,sfAN]=useState("");
  const [fGA,sfGA]=useState(""); const [fGL,sfGL]=useState(""); const [fNM,sfNM]=useState("");

  useEffect(()=>{const s=LD();if(s?.months) sD(s); sRdy(true);},[]);
  useEffect(()=>{if(rdy) SV(D);},[D,rdy]);

  const cm=D.cur; const md=D.months[cm]||{incomes:[],manualExp:[],cardExp:[]};
  const allE=useMemo(()=>[...(md.cardExp||[]),...(md.manualExp||[])],[md]);
  const tI=useMemo(()=>md.incomes.reduce((s:number,i:any)=>s+i.amount,0),[md.incomes]);
  const tE=useMemo(()=>allE.reduce((s:number,e:any)=>s+e.amount,0),[allE]);
  const bal=tI-tE;
  const bC=useMemo(()=>{const m:any={}; allE.forEach((t:any)=>{if(!m[t.category]) m[t.category]={total:0,count:0,items:[]};m[t.category].total+=t.amount;m[t.category].count++;m[t.category].items.push(t);}); return m;},[allE]);
  const fxT=useMemo(()=>allE.filter((t:any)=>EC[t.category]?.t==="f").reduce((s:number,t:any)=>s+t.amount,0),[allE]);
  const srt=useMemo(()=>Object.entries(bC).sort((a:any,b:any)=>b[1].total-a[1].total),[bC]);
  const yD=useMemo(()=>{const y=cm.slice(0,4);const ms=Object.entries(D.months).filter(([k])=>k.startsWith(y)).sort((a,b)=>a[0].localeCompare(b[0]));let yI=0,yE=0;const ch=ms.map(([k,v]:any)=>{const i=v.incomes.reduce((s:number,x:any)=>s+x.amount,0);const e=[...(v.cardExp||[]),...(v.manualExp||[])].reduce((s:number,x:any)=>s+x.amount,0);yI+=i;yE+=e;return{name:k.slice(5)+"月",income:i,expense:e};});return{y,yI,yE,yB:yI-yE,ch};},[D.months,cm]);
  const tAs=useMemo(()=>D.assets.reduce((s:number,a:any)=>s+a.amount,0),[D.assets]);
  const gP=D.goal.target>0?Math.min(100,yD.yB/D.goal.target*100):0;
  const adv=useMemo(()=>genAdvice(tI,tE,bC),[tI,tE,bC]);

  const uM=(fn:any)=>sD((p:any)=>({...p,months:{...p.months,[cm]:fn(p.months[cm]||{incomes:[],manualExp:[],cardExp:[]})}}));
  const addI=()=>{if(!fIA||Number(fIA)<=0)return;uM((m:any)=>({...m,incomes:[...m.incomes,{type:fIT,amount:Number(fIA),note:fIN,id:Date.now()}]}));sfIA("");sfIN("");sShI(false);};
  const addE=()=>{if(!fEA||Number(fEA)<=0)return;const d=fED||new Date().toLocaleDateString("ja-JP",{month:"2-digit",day:"2-digit"});uM((m:any)=>({...m,manualExp:[...m.manualExp,{date:d,description:fEN||fEC,amount:Number(fEA),category:fEC,source:"manual",id:Date.now()}]}));sfEA("");sfEN("");sfED("");sShE(false);};
  const addAs=()=>{if(!fAA)return;const now=new Date().toISOString().slice(0,10);sD((p:any)=>{const na=[...p.assets.filter((a:any)=>a.type!==fAT),{type:fAT,amount:Number(fAA),note:fAN,id:Date.now()}];return{...p,assets:na,assetHist:[...p.assetHist,{date:now,total:na.reduce((s:number,a:any)=>s+a.amount,0)}].slice(-120)};});sfAA("");sfAN("");sShA(false);};

  const handleUpload = async (file: File) => {
    sUpL(true); sUpR("");
    try {
      const text = await file.text();
      const txns = parseCSV(text);
      if (txns.length === 0) { sUpR("❌ 取引データを抽出できませんでした。"); }
      else { uM((m:any)=>({...m,cardExp:[...m.cardExp,...txns]})); sUpR(`✅ ${txns.length}件追加しました！`); }
    } catch(e:any) { sUpR("❌ "+e.message); }
    sUpL(false);
  };

  const getAi=async()=>{sAiL(true);try{
    const sum=`月:${cm} 収入:¥${tI.toLocaleString()} 支出:¥${tE.toLocaleString()}\nカテゴリ:\n${srt.map(([c,v]:any)=>`${c}:¥${v.total.toLocaleString()}(${v.count}件)`).join("\n")}\n年間:収入¥${yD.yI.toLocaleString()} 支出¥${yD.yE.toLocaleString()} 資産¥${tAs.toLocaleString()}`;
    const r=await fetch("/api/advice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({summary:sum})});
    const d=await r.json(); sAiT(d.advice||"取得失敗");
  }catch{sAiT("AI分析でエラーが発生しました。");}sAiL(false);};

  const hCC=useCallback((idx:number,val:string)=>{const cl=md.cardExp?.length||0;if(idx<cl)uM((m:any)=>({...m,cardExp:m.cardExp.map((t:any,i:number)=>i===idx?{...t,category:val}:t)}));else uM((m:any)=>({...m,manualExp:m.manualExp.map((t:any,i:number)=>i===(idx-cl)?{...t,category:val}:t)}));},[md.cardExp?.length,cm]);

  if(!rdy) return <div style={{minHeight:"100vh",background:"#0b0b1a",display:"flex",alignItems:"center",justifyContent:"center",color:"#888"}}>読み込み中...</div>;
  const ac:any = {good:"#2ECC71",danger:"#E74C3C",warn:"#F39C12",info:"#bbb"};

  return (
    <div style={{minHeight:"100vh",background:"#0b0b1a",color:"#e0e0e0",fontFamily:"'Hiragino Sans',-apple-system,sans-serif",paddingBottom:72}}>
      <div style={{maxWidth:480,margin:"0 auto",padding:"16px 14px"}}>

        {pg==="home"&&(<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h1 style={{fontSize:18,fontWeight:700,margin:0,background:"linear-gradient(135deg,#FF6B6B,#FFB347)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>💰 マイ家計簿</h1>
            <button onClick={()=>sShM(true)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid #333",color:"#ccc",padding:"5px 12px",borderRadius:8,fontSize:12,cursor:"pointer"}}>📅 {cm}</button>
          </div>
          <div style={cs({background:"linear-gradient(135deg,rgba(255,107,107,0.06),rgba(255,179,71,0.04))",borderColor:"rgba(255,107,107,0.12)",padding:16})}>
            <div style={{fontSize:10,color:"#999"}}>今月の収支</div>
            <div style={{fontSize:26,fontWeight:800,fontFamily:"monospace",color:bal>=0?"#2ECC71":"#E74C3C",marginBottom:6}}>{bal>=0?"+":""}¥{bal.toLocaleString()}</div>
            <div style={{display:"flex",gap:14,fontSize:11}}>
              <span><span style={{color:"#888"}}>収入 </span><span style={{color:"#2ECC71",fontFamily:"monospace",fontWeight:600}}>¥{tI.toLocaleString()}</span></span>
              <span><span style={{color:"#888"}}>支出 </span><span style={{color:"#FF6B6B",fontFamily:"monospace",fontWeight:600}}>¥{tE.toLocaleString()}</span></span>
            </div>
            {tI>0&&<div style={{marginTop:6,height:5,background:"rgba(255,255,255,0.08)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:Math.min(100,tE/tI*100)+"%",background:tE/tI>1?"#E74C3C":tE/tI>0.8?"#F39C12":"#2ECC71",borderRadius:3}}/></div>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>
            <button onClick={()=>sShI(true)} style={{background:"rgba(46,204,113,0.03)",border:"1px dashed rgba(46,204,113,0.3)",borderRadius:12,padding:10,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:18}}>💼</div><div style={{fontSize:10,color:"#2ECC71",fontWeight:600}}>収入</div></button>
            <button onClick={()=>sShE(true)} style={{background:"rgba(255,107,107,0.03)",border:"1px dashed rgba(255,107,107,0.3)",borderRadius:12,padding:10,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:18}}>💸</div><div style={{fontSize:10,color:"#FF6B6B",fontWeight:600}}>支出</div></button>
            <button onClick={()=>sShUp(true)} style={{background:"rgba(52,152,219,0.03)",border:"1px dashed rgba(52,152,219,0.3)",borderRadius:12,padding:10,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:18}}>💳</div><div style={{fontSize:10,color:"#3498DB",fontWeight:600}}>明細CSV</div></button>
          </div>
          {D.goal.target>0&&<div style={cs()}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{fontWeight:600,color:"#ccc"}}>🎯 {D.goal.label||"貯金目標"}</span><span style={{fontFamily:"monospace",color:"#FFB347"}}>¥{D.goal.target.toLocaleString()}</span></div><div style={{height:8,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:gP+"%",background:gP>=100?"#2ECC71":"linear-gradient(90deg,#3498DB,#2ECC71)",borderRadius:4}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#888"}}><span>年間貯蓄 ¥{yD.yB.toLocaleString()}</span><span style={{color:gP>=100?"#2ECC71":"#FFB347",fontWeight:600}}>{gP.toFixed(0)}%</span></div></div>}
          <div style={cs({background:"rgba(255,107,107,0.03)",borderColor:"rgba(255,107,107,0.1)"})}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 8px",color:"#FF6B6B"}}>🤖 アドバイス</h3>
            {adv.slice(0,4).map((t:any,i:number)=><div key={i} style={{fontSize:11,color:ac[t.ty],padding:"3px 0",lineHeight:1.6}}>{t.i} {t.tx}</div>)}
            <button onClick={getAi} disabled={aiL} style={{marginTop:8,background:"rgba(155,89,182,0.12)",border:"1px solid rgba(155,89,182,0.25)",color:"#9B59B6",padding:"7px 0",borderRadius:8,fontSize:11,cursor:"pointer",width:"100%",fontWeight:600}}>{aiL?"⏳ 分析中...":"✨ AIに詳しく分析してもらう"}</button>
            {aiT&&<div style={{marginTop:8,fontSize:11,color:"#ccc",lineHeight:1.7,whiteSpace:"pre-wrap",background:"rgba(155,89,182,0.06)",padding:10,borderRadius:8}}>{aiT}</div>}
          </div>
          <div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 8px",color:"#bbb"}}>支出トップ5</h3>
            {srt.slice(0,5).map(([cat,d]:any)=>{const cfg=EC[cat]||{i:"📦",c:"#888"};return(<div key={cat} style={{marginBottom:6}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:2}}><span style={{color:"#ccc"}}>{cfg.i} {cat}</span><span style={{fontFamily:"monospace",color:cfg.c,fontWeight:600}}>¥{d.total.toLocaleString()}</span></div><div style={{height:3,background:"rgba(255,255,255,0.05)",borderRadius:2}}><div style={{height:"100%",width:(tE>0?d.total/tE*100:0)+"%",background:cfg.c,borderRadius:2}}/></div></div>);})}
          </div>
        </div>)}

        {pg==="analysis"&&(<div>
          <h2 style={{fontSize:16,fontWeight:700,margin:"0 0 14px",color:"#eee"}}>📊 分析</h2>
          <div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 6px",color:"#FFB347"}}>📅 {yD.y}年 累計</h3><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,fontSize:11,marginBottom:8}}><div><div style={{color:"#888",fontSize:9}}>収入</div><div style={{fontFamily:"monospace",color:"#2ECC71",fontWeight:600}}>¥{yD.yI.toLocaleString()}</div></div><div><div style={{color:"#888",fontSize:9}}>支出</div><div style={{fontFamily:"monospace",color:"#FF6B6B",fontWeight:600}}>¥{yD.yE.toLocaleString()}</div></div><div><div style={{color:"#888",fontSize:9}}>貯蓄</div><div style={{fontFamily:"monospace",color:yD.yB>=0?"#2ECC71":"#E74C3C",fontWeight:600}}>{yD.yB>=0?"+":""}¥{yD.yB.toLocaleString()}</div></div></div>
            {yD.ch.length>1&&<ResponsiveContainer width="100%" height={120}><BarChart data={yD.ch} margin={{top:8,right:4,left:-20,bottom:0}}><XAxis dataKey="name" tick={{fill:"#888",fontSize:9}} axisLine={false} tickLine={false}/><YAxis hide/><Tooltip content={<TT/>}/><Bar dataKey="income" fill="#2ECC71" radius={[3,3,0,0]} name="収入"/><Bar dataKey="expense" fill="#FF6B6B" radius={[3,3,0,0]} name="支出"/></BarChart></ResponsiveContainer>}
          </div>
          <div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 2px",color:"#bbb"}}>固定費 vs 変動費</h3><ResponsiveContainer width="100%" height={170}><PieChart><Pie data={[{name:"固定費",value:fxT,color:"#3498DB"},{name:"変動費",value:tE-fxT,color:"#F39C12"}]} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value" paddingAngle={4} stroke="none" label={({name,percent}:any)=>name+" "+(percent*100).toFixed(0)+"%"}><Cell fill="#3498DB"/><Cell fill="#F39C12"/></Pie><Tooltip content={<TT/>}/></PieChart></ResponsiveContainer></div>
          <div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 2px",color:"#bbb"}}>カテゴリ別支出</h3><ResponsiveContainer width="100%" height={Math.max(200,srt.length*28)}><BarChart data={srt.map(([c,v]:any)=>({name:(EC[c]?.i||"")+" "+c,value:v.total,color:EC[c]?.c||"#888"}))} layout="vertical" margin={{left:100,right:45,top:4,bottom:4}}><XAxis type="number" hide/><YAxis type="category" dataKey="name" width={100} tick={{fill:"#aaa",fontSize:9}} axisLine={false} tickLine={false}/><Tooltip content={<TT/>}/><Bar dataKey="value" radius={[0,4,4,0]} label={{position:"right",fill:"#888",fontSize:8,formatter:(v:number)=>"¥"+v.toLocaleString()}}>{srt.map(([c]:any,i:number)=><Cell key={i} fill={EC[c]?.c||"#888"}/>)}</Bar></BarChart></ResponsiveContainer></div>
        </div>)}

        {pg==="assets"&&(<div>
          <h2 style={{fontSize:16,fontWeight:700,margin:"0 0 14px",color:"#eee"}}>💎 資産管理</h2>
          <div style={cs({padding:16})}><div style={{fontSize:10,color:"#999"}}>総資産</div><div style={{fontSize:24,fontWeight:800,fontFamily:"monospace",color:"#2ECC71",marginBottom:6}}>¥{tAs.toLocaleString()}</div><button onClick={()=>sShA(true)} style={{background:"rgba(46,204,113,0.1)",border:"1px solid rgba(46,204,113,0.2)",color:"#2ECC71",padding:"6px 14px",borderRadius:8,fontSize:11,cursor:"pointer",fontWeight:600}}>資産を更新</button></div>
          {D.assets.length>0&&<div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 8px",color:"#bbb"}}>内訳</h3><ResponsiveContainer width="100%" height={170}><PieChart><Pie data={D.assets.map((a:any)=>{const at=AT.find(t=>t.id===a.type);return{name:at?.l||"他",value:a.amount,color:at?.c||"#888"};})} cx="50%" cy="50%" innerRadius={38} outerRadius={65} dataKey="value" paddingAngle={2} stroke="none" label={({name,percent}:any)=>percent>0.05?name:""}>{D.assets.map((a:any,i:number)=><Cell key={i} fill={AT.find(t=>t.id===a.type)?.c||"#888"}/>)}</Pie><Tooltip content={<TT/>}/></PieChart></ResponsiveContainer>{D.assets.map((a:any)=>{const at=AT.find(t=>t.id===a.type);return<div key={a.type} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12,borderBottom:"1px solid rgba(255,255,255,0.03)"}}><span style={{color:"#ccc"}}>{at?.i} {at?.l}</span><span style={{fontFamily:"monospace",color:at?.c,fontWeight:600}}>¥{a.amount.toLocaleString()}</span></div>;})}</div>}
          {D.assetHist.length>1&&<div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 4px",color:"#bbb"}}>📈 推移</h3><ResponsiveContainer width="100%" height={130}><AreaChart data={D.assetHist.map((h:any)=>({name:h.date.slice(5),value:h.total}))} margin={{top:8,right:8,left:-20,bottom:0}}><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2ECC71" stopOpacity={0.3}/><stop offset="95%" stopColor="#2ECC71" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="name" tick={{fill:"#888",fontSize:9}} axisLine={false} tickLine={false}/><YAxis hide/><Tooltip content={<TT/>}/><Area type="monotone" dataKey="value" stroke="#2ECC71" fill="url(#ag)" strokeWidth={2} name="総資産"/></AreaChart></ResponsiveContainer></div>}
          <div style={cs()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3 style={{fontSize:12,fontWeight:600,margin:0,color:"#FFB347"}}>🎯 貯金目標</h3><button onClick={()=>{sfGA(String(D.goal.target||""));sfGL(D.goal.label);sShG(true);}} style={{background:"rgba(255,179,71,0.1)",border:"1px solid rgba(255,179,71,0.2)",color:"#FFB347",padding:"3px 8px",borderRadius:5,fontSize:10,cursor:"pointer",fontWeight:600}}>{D.goal.target>0?"変更":"設定"}</button></div>{D.goal.target>0&&<div style={{marginTop:8}}><div style={{height:10,background:"rgba(255,255,255,0.06)",borderRadius:5,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:gP+"%",background:gP>=100?"#2ECC71":"linear-gradient(90deg,#3498DB,#2ECC71)",borderRadius:5}}/></div><div style={{fontSize:10,color:"#888"}}>{gP.toFixed(0)}%（¥{yD.yB.toLocaleString()} / ¥{D.goal.target.toLocaleString()}）</div></div>}</div>
        </div>)}

        {pg==="list"&&(<div>
          <h2 style={{fontSize:16,fontWeight:700,margin:"0 0 4px",color:"#eee"}}>📋 明細 ({cm})</h2>
          <p style={{fontSize:9,color:"#666",margin:"0 0 10px"}}>💳{md.cardExp?.length||0} + ✏️{md.manualExp?.length||0} = {allE.length}件</p>
          <div style={cs()}>{allE.map((t:any,i:number)=>{const cfg=EC[t.category]||{i:"📦",c:"#888",t:"v"};return(
            <div key={t.id||i} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.03)",fontSize:11}}>
              <span style={{flex:"0 0 34px",color:"#666",fontFamily:"monospace",fontSize:9}}>{t.date}</span>
              <span style={{fontSize:10}}>{t.source==="card"?"💳":"✏️"}</span>
              <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#ddd",minWidth:0}}>{t.description}</span>
              <span style={{fontFamily:"monospace",color:"#ddd",fontSize:10}}>¥{t.amount.toLocaleString()}</span>
              {eI===i?<select value={t.category} onChange={(e:any)=>{hCC(i,e.target.value);sEI(null);}} onBlur={()=>sEI(null)} autoFocus style={{background:"#1a1a2e",color:"#ddd",border:"1px solid #444",borderRadius:6,padding:"2px 3px",fontSize:9,maxWidth:100}}>{Object.entries(EC).map(([c,v])=><option key={c} value={c}>{v.i} {c}</option>)}</select>
              :<span onClick={()=>sEI(i)} style={{padding:"1px 5px",borderRadius:8,fontSize:8,cursor:"pointer",background:cfg.c+"18",color:cfg.c,whiteSpace:"nowrap"}}>{cfg.i}{t.category}</span>}
              {t.source==="manual"&&<button onClick={()=>uM((m:any)=>({...m,manualExp:m.manualExp.filter((e:any)=>e.id!==t.id)}))} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:0}}>×</button>}
            </div>);})}</div>
        </div>)}

        {pg==="more"&&(<div>
          <h2 style={{fontSize:16,fontWeight:700,margin:"0 0 14px",color:"#eee"}}>⚙️ 設定</h2>
          <div style={cs()}><button onClick={()=>sShIn(!shIn)} style={{background:"none",border:"none",color:"#3498DB",fontSize:13,fontWeight:600,cursor:"pointer",padding:0,width:"100%",textAlign:"left"}}>📲 ホーム画面に追加する方法 {shIn?"▲":"▼"}</button>
            {shIn&&<div style={{marginTop:10,fontSize:11,color:"#bbb",lineHeight:1.8}}><p style={{margin:"0 0 4px"}}><strong>iPhone:</strong> Safari → 共有（□↑）→ ホーム画面に追加</p><p style={{margin:0}}><strong>Android:</strong> Chrome → ⋮ → ホーム画面に追加</p></div>}
          </div>
          <div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 6px",color:"#ccc"}}>📅 月の管理</h3><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{Object.keys(D.months).sort().map(k=><button key={k} onClick={()=>sD((p:any)=>({...p,cur:k}))} style={{padding:"5px 10px",borderRadius:6,fontSize:10,cursor:"pointer",background:k===cm?"rgba(255,107,107,0.15)":"rgba(255,255,255,0.04)",border:"1px solid "+(k===cm?"rgba(255,107,107,0.3)":"#333"),color:k===cm?"#FF6B6B":"#aaa"}}>{k}</button>)}<button onClick={()=>sShM(true)} style={{padding:"5px 10px",borderRadius:6,fontSize:10,cursor:"pointer",background:"rgba(255,255,255,0.04)",border:"1px dashed #555",color:"#888"}}>+ 新規</button></div></div>
          <div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 6px",color:"#ccc"}}>💳 明細アップロード</h3><p style={{fontSize:11,color:"#999",margin:"0 0 8px"}}>カード会社のCSVをアップロードして取引を追加できます。</p><button onClick={()=>sShUp(true)} style={{background:"rgba(52,152,219,0.1)",border:"1px solid rgba(52,152,219,0.2)",color:"#3498DB",padding:"8px 0",borderRadius:8,fontSize:12,cursor:"pointer",width:"100%",fontWeight:600}}>📄 CSVをアップロード</button></div>
          <div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 6px",color:"#ccc"}}>💼 収入一覧 ({cm})</h3>{md.incomes.length===0&&<p style={{fontSize:10,color:"#666",margin:0}}>未登録</p>}{md.incomes.map((inc:any)=>{const t=IT.find(x=>x.id===inc.type)||IT[4];return(<div key={inc.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",fontSize:11}}><span style={{color:"#ccc"}}>{t.i} {t.l} {inc.note&&<span style={{color:"#666"}}>({inc.note})</span>}</span><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontFamily:"monospace",color:t.c,fontWeight:600}}>¥{inc.amount.toLocaleString()}</span><button onClick={()=>uM((m:any)=>({...m,incomes:m.incomes.filter((i:any)=>i.id!==inc.id)}))} style={{background:"none",border:"none",color:"#555",cursor:"pointer"}}>×</button></div></div>);})}</div>
          <button onClick={()=>{if(confirm("全データをリセット？")) sD(DEF);}} style={{background:"rgba(231,76,60,0.08)",border:"1px solid rgba(231,76,60,0.2)",color:"#E74C3C",padding:"10px 0",borderRadius:10,fontSize:11,cursor:"pointer",width:"100%",marginTop:8}}>🗑️ リセット</button>
        </div>)}
      </div>

      {/* Nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#0f0f22",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"center",paddingBottom:"env(safe-area-inset-bottom,0px)",zIndex:50}}>
        <div style={{display:"flex",maxWidth:480,width:"100%"}}>{[{id:"home",ic:"🏠",l:"ホーム"},{id:"analysis",ic:"📊",l:"分析"},{id:"assets",ic:"💎",l:"資産"},{id:"list",ic:"📋",l:"明細"},{id:"more",ic:"⚙️",l:"設定"}].map(n=><button key={n.id} onClick={()=>{sPg(n.id);sEI(null);}} style={{flex:1,background:"none",border:"none",padding:"8px 0 6px",cursor:"pointer",color:pg===n.id?"#FF6B6B":"#666",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}><span style={{fontSize:17}}>{n.ic}</span><span style={{fontSize:8,fontWeight:pg===n.id?600:400}}>{n.l}</span></button>)}</div>
      </div>

      {/* Modals */}
      <BS open={shI} onClose={()=>sShI(false)} title="💼 収入を追加"><div style={{marginBottom:12}}><label style={{fontSize:10,color:"#888",display:"block",marginBottom:5}}>種類</label><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{IT.map(t=><button key={t.id} onClick={()=>sfIT(t.id)} style={{padding:"7px 12px",borderRadius:8,fontSize:11,cursor:"pointer",fontFamily:"inherit",background:fIT===t.id?t.c+"20":"rgba(255,255,255,0.04)",border:"1px solid "+(fIT===t.id?t.c+"50":"#333"),color:fIT===t.id?t.c:"#aaa"}}>{t.i} {t.l}</button>)}</div></div><FI label="金額" type="amount" value={fIA} onChange={sfIA}/><FI label="メモ" value={fIN} onChange={sfIN} placeholder="例: フリーランス"/><button onClick={addI} style={B1}>追加</button></BS>

      <BS open={shE} onClose={()=>sShE(false)} title="💸 支出を追加"><FI label="カテゴリ" type="select" value={fEC} onChange={sfEC}>{Object.entries(EC).map(([c,v])=><option key={c} value={c}>{v.i} {c}</option>)}</FI><FI label="金額" type="amount" value={fEA} onChange={sfEA}/><FI label="日付" value={fED} onChange={sfED} placeholder="例: 03/15"/><FI label="内容" value={fEN} onChange={sfEN} placeholder="例: ランチ代"/><button onClick={addE} style={B1}>追加</button></BS>

      <BS open={shUp} onClose={()=>sShUp(false)} title="💳 明細CSVをアップロード">
        <p style={{fontSize:12,color:"#bbb",margin:"0 0 12px",lineHeight:1.6}}>カード会社からダウンロードしたCSVファイルを選択してください。</p>
        <div onClick={()=>{const inp=document.createElement("input");inp.type="file";inp.accept=".csv,.tsv,.txt";inp.onchange=(e:any)=>e.target.files[0]&&handleUpload(e.target.files[0]);inp.click();}}
          style={{border:"2px dashed #333",borderRadius:14,padding:"28px 16px",textAlign:"center",cursor:"pointer",background:"rgba(255,255,255,0.02)",marginBottom:12}}>
          {upL?<div><div style={{fontSize:28}}>⏳</div><p style={{color:"#999",fontSize:12,margin:"6px 0 0"}}>読み取り中...</p></div>
          :<div><div style={{fontSize:28}}>📄</div><p style={{color:"#ccc",fontSize:13,margin:"6px 0 4px",fontWeight:600}}>タップして選択</p><p style={{color:"#888",fontSize:11,margin:0}}>CSV / TSV</p></div>}
        </div>
        {upR&&<div style={{padding:10,borderRadius:8,background:upR.startsWith("✅")?"rgba(46,204,113,0.1)":"rgba(255,80,80,0.1)",color:upR.startsWith("✅")?"#2ECC71":"#FF6B6B",fontSize:12}}>{upR}</div>}
      </BS>

      <BS open={shA} onClose={()=>sShA(false)} title="💎 資産を更新"><FI label="種類" type="select" value={fAT} onChange={sfAT}>{AT.map(t=><option key={t.id} value={t.id}>{t.i} {t.l}</option>)}</FI><FI label="残高" type="amount" value={fAA} onChange={sfAA}/><FI label="メモ" value={fAN} onChange={sfAN} placeholder="例: SBI証券"/><button onClick={addAs} style={B1}>更新</button></BS>
      <BS open={shG} onClose={()=>sShG(false)} title="🎯 貯金目標"><FI label="年間目標額" type="amount" value={fGA} onChange={sfGA} placeholder="例: 1000000"/><FI label="目標名" value={fGL} onChange={sfGL} placeholder="例: 旅行資金"/><button onClick={()=>{sD((p:any)=>({...p,goal:{target:Number(fGA)||0,label:fGL}}));sShG(false);}} style={B1}>設定</button></BS>

      <BS open={shM} onClose={()=>sShM(false)} title="📅 月を選択・追加">
        {Object.keys(D.months).sort().map(k=><button key={k} onClick={()=>{sD((p:any)=>({...p,cur:k}));sShM(false);}} style={{display:"block",width:"100%",padding:"10px 12px",marginBottom:4,borderRadius:8,fontSize:13,cursor:"pointer",textAlign:"left",background:k===cm?"rgba(255,107,107,0.12)":"rgba(255,255,255,0.03)",border:"1px solid "+(k===cm?"rgba(255,107,107,0.25)":"#333"),color:k===cm?"#FF6B6B":"#ccc"}}>📅 {k} {k===cm&&"（表示中）"}</button>)}
        <div style={{marginTop:12}}><FI label="新しい月（YYYY-MM）" value={fNM} onChange={sfNM} placeholder="例: 2026-04"/><button onClick={()=>{if(!fNM)return;sD((p:any)=>({...p,months:{...p.months,[fNM]:p.months[fNM]||{incomes:[],manualExp:[],cardExp:[]}},cur:fNM}));sfNM("");sShM(false);}} style={B1}>追加して切替</button></div>
      </BS>
    </div>
  );
}

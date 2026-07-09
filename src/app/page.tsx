"use client";
import { useState, useCallback, useMemo, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

// ═══ Storage ═══
// v5: デモデータ入りのv4を破棄して全ユーザーまっさらな状態から開始
function LD() { try { const s = localStorage.getItem("kakeibo-v5"); return s ? JSON.parse(s) : null; } catch { return null; } }
function SV(d: any) { try { localStorage.setItem("kakeibo-v5", JSON.stringify(d)); } catch {} }

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
  "投資・貯蓄":{i:"📈",c:"#27AE60",t:"v"},
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
  {id:"bonds",l:"債券",i:"📜",c:"#5DADE2"},{id:"crypto",l:"暗号資産",i:"₿",c:"#F39C12"},
  {id:"insurance",l:"保険(積立)",i:"🛡️",c:"#16A085"},{id:"pension",l:"年金(iDeCo等)",i:"👴",c:"#27AE60"},
  {id:"realestate",l:"不動産",i:"🏢",c:"#D35400"},{id:"cash",l:"現金",i:"💴",c:"#A3BE8C"},
  {id:"other_a",l:"その他",i:"💎",c:"#E67E22"},
];
// ═══ 負債の種別（貸借対照表の負債の部）═══
const LT = [
  {id:"loan_home",l:"住宅ローン",i:"🏠",c:"#E74C3C"},{id:"loan_car",l:"自動車ローン",i:"🚗",c:"#E67E22"},
  {id:"loan_edu",l:"奨学金",i:"🎓",c:"#F39C12"},{id:"card_debt",l:"カード残高",i:"💳",c:"#FF6B6B"},
  {id:"loan_personal",l:"カードローン",i:"🏧",c:"#C0392B"},{id:"loan_other",l:"その他負債",i:"📋",c:"#95A5A6"},
];

// ═══ CSV Parser ═══
// 半角カナや小書きカナの違いを吸収して照合（PDF明細は半角カナが多い）
const KN_S = "ァィゥェォッャュョヮ", KN_B = "アイウエオツヤユヨワ";
function kanaNorm(s: string): string {
  let r = s.normalize("NFKC");
  for (let i = 0; i < KN_S.length; i++) r = r.split(KN_S[i]).join(KN_B[i]);
  // 長音「ー」とハイフン類は表記ゆれが激しいので除去して照合（例: サ-バ- ↔ サーバー）
  r = r.replace(/[ーｰ‐−–—-]/g, "");
  return r.toLowerCase();
}
// カテゴリごとのキーワード辞書（上から順に判定。specificなものを先に）
const CAT_KW: [string, string[]][] = [
  ["水・飲料", ["プレミアムウォーター","水道","スイドウ","ウォーターサーバー","クリクラ","アクアクララ"]],
  ["光熱費", ["楽天ガス","楽天でんき","でんき","東京電力","東京ガス","大阪ガス","東邦ガス","西部ガス","関西電力","中部電力","九州電力","東北電力","北海道電力","電気料","ガス料","エナジー","電力"]],
  ["通信費", ["ソフトバンク","楽天モバイル","ドコモ","DOCOMO","KDDI","ワイモバイル","YMOBILE","UQモバイル","AHAMO","POVO","LINEMO","ブロードバンド","OCN","ビッグローブ","BIGLOBE","NURO","インターネット","通信料","通信"]],
  ["サブスク", ["APPLE COM BILL","GOOGLE","Netflix","Spotify","YOUTUBE","HULU","DISNEY","DAZN","U-NEXT","ABEMA","KINDLE","AUDIBLE","ICLOUD","DROPBOX","MICROSOFT","ADOBE","CANVA","NOTION","ZOOM","GITHUB","OPENAI","CHATGPT","CLAUDE","SUBSCRIPTI","MONESTA","アマゾンプライム","AMAZON PRIME","PRIME VIDEO","エックスサーバー","XSERVER","サーバー","ドメイン","さくらインターネット","RIVERSIDE"]],
  ["保険", ["プルデンシャル","生命保険","損保","あいおい","東京海上","アフラック","メットライフ","県民共済","都民共済","ソニー損保","セイメイホケン"]],
  ["税金・公的", ["国税","都税","県税","市税","市役所","区役所","国民健康保険","国保","国民年金","NHK","年金機構"]],
  ["投資・貯蓄", ["証券","投信","積立","つみたて","IDECO","NISA","ウェルスナビ","WEALTHNAVI","楽天キャッシュ","ビットフライヤー","BITFLYER","コインチェック","COINCHECK"]],
  ["健康", ["フィットネス","FIT365","ジム","スポーツクラブ","エニタイム","ゴールドジム","カーブス","ヨガ","ピラティス"]],
  ["教育・自己投資", ["動画編集","ドウガヘンシユウ","UDEMY","セミナー","スクール","講座","資格","英会話","スタディ","書店","ブックオフ","紀伊國屋","ジュンク","有隣堂","丸善"]],
  ["食費（コンビニ）", ["セブン","ファミリーマート","ファミマ","ローソン","デイリーヤマザキ","ミニストップ","ニューデイズ","NEWDAYS","セイコーマート","ポプラ","ヤマザキショップ"]],
  ["食費（自炊）", ["いなげや","イナゲヤ","マルエツ","サミット","ヤオコー","オーケーストア","西友","イトーヨーカドー","ヨーカドー","ベイシア","業務スーパー","ロピア","コープ","まいばすけっと","マミーマート","マックスバリュ","イオンスタイル","ベルク","カスミ","トップバルー","肉のハナマサ","スーパー"]],
  ["食費（外食）", ["すき家","吉野家","松屋","マクドナルド","スターバックス","ドトール","タリーズ","コメダ","丸亀製麺","はなまる","ココイチ","COCO壱","大戸屋","やよい軒","ガスト","サイゼリヤ","バーミヤン","ジョナサン","デニーズ","ロイヤルホスト","王将","日高屋","富士そば","ゆで太郎","くら寿司","スシロー","はま寿司","銀のさら","モスバーガー","バーガー","ケンタ","ピザ","ドミノ","ウーバー","UBER","出前館","ロケットナウ","カフェ","珈琲","喫茶","レストラン","食堂","キッチン","ダイニング","居酒屋","焼肉","焼鳥","ホルモン","ラーメン","うどん","寿司","ビストロ"]],
  ["交通・車", ["SUICA","PASMO","モバイルスイカ","エネオス","ガソリン","ETC","高速道路","NEXCO","首都高","タイムズ","パーク24","リパーク","ナビパーク","コインパ","駐車","JR","メトロ","都営","小田急","京王","東急","西武","東武","京急","京成","相鉄","モノレール","タクシー","GO ","バス","洗車","オートバックス","イエローハット","車検","タイヤ","レンタカー","カーシェア"]],
  ["家電", ["ビックカメラ","ヨドバシ","エディオン","ヤマダ電機","ケーズデンキ","ジョーシン","ノジマ","ソフマップ"]],
  ["美容・衣服", ["ルミネ","ユニクロ","UNIQLO","GU","ZARA","しまむら","ABCマート","伊勢丹","高島屋","タカシマヤ","マルイ","パルコ","美容院","美容室","理容","ヘアサロン","ネイル","QBハウス","エステ"]],
  ["日用品", ["ウエルパ","ドラッグ","クリエイト","マツモトキヨシ","マツキヨ","ウェルシア","スギ薬局","ツルハ","サンドラッグ","ココカラ","ドンキ","ドン・キホーテ","メガドンキ","ニトリ","無印","ダイソー","セリア","キャンドゥ","スリーコインズ","カインズ","コーナン","ビバホーム","DCM","ホームセンター","ハンズ","ロフト","アマゾン","AMAZON","イオンモール","ららぽーと","アリオ"]],
  ["医療費", ["病院","クリニック","歯科","調剤","内科","外科","皮膚科","眼科","耳鼻","整形外科","整骨院","接骨院","鍼灸","薬局"]],
  ["娯楽", ["ラウンドワン","カラオケ","ビッグエコー","映画","シネマ","TOHO","ゴルフ","ボウリング","温泉","スパ","プレイステーション","PLAYSTATION","NINTENDO","任天堂","STEAM","チケット","遊園地","水族館","動物園","ペイパービュー","レミノ"]],
  ["家賃・住居", ["家賃","賃貸","不動産"]],
];
function autoCategory(desc: string, rules?: Record<string, string>): string {
  const d = kanaNorm(desc);
  // ① 学習済みルール（ユーザーが手で直した店名）を最優先
  if (rules) {
    if (rules[d]) return rules[d];
    for (const k in rules) { if (k && (d.includes(k) || k.includes(d))) return rules[k]; }
  }
  // ② キーワード辞書
  for (const [cat, kws] of CAT_KW) {
    if (kws.some(x => d.includes(kanaNorm(x)))) return cat;
  }
  return "その他";
}
function parseCSV(text: string, rules?: Record<string, string>): any[] {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const txns: any[] = [];
  for (const line of lines) {
    const fields = line.split(/[,\t]/).map(f => f.trim().replace(/^"|"$/g, "")).filter(Boolean);
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
      txns.push({ id: Date.now()+Math.random()*1e4, date: date.length>5?date.slice(5):date, description: desc||"不明", amount, category: autoCategory(desc, rules), source:"card" });
    }
  }
  return txns;
}

// ═══ PDF Text Extraction (ブラウザ内・pdf.js / 無料・APIなし) ═══
async function extractPdfText(file: File): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  const buf = await file.arrayBuffer();
  // cMapUrl/cMapPacked は日本語フォント(CMap)のPDFをテキスト化するのに必須
  const doc = await pdfjs.getDocument({ data: buf, cMapUrl: "/cmaps/", cMapPacked: true }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const rows: Record<number, any[]> = {};
    for (const it of tc.items) {
      if (!("str" in it) || !it.str) continue;
      const y = Math.round(it.transform[5]); // 同じ高さ＝同じ行
      (rows[y] = rows[y] || []).push(it);
    }
    const ys = Object.keys(rows).map(Number).sort((a, b) => b - a); // PDFは下が原点
    for (const y of ys) {
      const items = rows[y].sort((a, b) => a.transform[4] - b.transform[4]); // 左→右
      let line = ""; let prevEnd: number | null = null;
      for (const it of items) {
        const x = it.transform[4];
        if (prevEnd != null) { const gap = x - prevEnd; if (gap > 4) line += "\t"; else if (gap > 0.5) line += " "; }
        line += it.str; prevEnd = x + (it.width || 0);
      }
      if (line.trim()) lines.push(line.trim());
    }
  }
  return lines.join("\n");
}

// ═══ カード明細PDFの行を解析（日付 店名 利用者 支払方法 利用金額 …の表形式に対応）═══
function parsePdfStatement(text: string, rules?: Record<string, string>): any[] {
  const txns: any[] = [];
  const dateRe = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
  for (const raw of text.split("\n")) {
    const toks = raw.trim().split(/[\s\t]+/).filter(Boolean);
    if (toks.length < 4) continue;
    const dm = toks[0].match(dateRe);
    if (!dm) continue;
    // 支払方法（1回払い/リボ/分割/ボーナス）の列を探し、その次が「利用金額」
    let payIdx = -1;
    for (let i = 2; i < toks.length; i++) { if (/払い|リボ|分割|ボーナス/.test(toks[i])) { payIdx = i; break; } }
    if (payIdx < 0 || payIdx + 1 >= toks.length) continue;
    const amtTok = toks[payIdx + 1].replace(/[¥￥,、円\s]/g, "").replace(/[▲△−]/g, "-");
    if (!/^-?\d+$/.test(amtTok)) continue;
    const amount = Math.abs(parseInt(amtTok, 10));
    if (!amount) continue;
    const store = (toks.slice(1, Math.max(2, payIdx - 1)).join(" ") || toks[1]).normalize("NFKC");
    const date = dm[2].padStart(2, "0") + "/" + dm[3].padStart(2, "0");
    txns.push({ id: Date.now() + Math.random() * 1e4, date, description: store || "不明", amount, category: autoCategory(store, rules), source: "card" });
  }
  return txns;
}

// ═══ 初期状態（デモデータなし・まっさらな状態から開始）═══
const DEF = { months:{} as any, cur:"", assets:[] as any[], liabilities:[] as any[], assetHist:[] as any[], goal:{target:0,label:""}, rules:{} as Record<string,string> };
const freshState = () => { const m = new Date().toISOString().slice(0,7); return { ...DEF, months:{ [m]: { incomes:[] as any[], manualExp:[] as any[], cardExp:[] as any[] } }, cur:m }; };

// ═══ スマートコメント（端末内で完結・API不要）═══
// 前月比・貯蓄率・カテゴリ動向・純資産の進捗からコメントを生成。褒めて伸ばすトーン。
function genAdvice(tI:number, tE:number, bC:any, x:any={}) {
  const t:any[] = [];
  const bal = tI - tE, sr = tI > 0 ? (bal / tI) * 100 : 0;
  const inv = bC["投資・貯蓄"]?.total || 0;
  // データがまだ無い月：はじめの一歩を案内
  if (tI === 0 && tE === 0) {
    t.push({ty:"info",i:"👋",tx:"今月はまだデータがありません。「明細取込」でカード明細(CSV/PDF)をアップするか、収入を登録してみましょう！"});
    return t;
  }
  // ① 収支・貯蓄率（投資は消費でなく貯蓄側として評価）
  const realSr = tI > 0 ? ((bal + inv) / tI) * 100 : 0;
  if (tI === 0 && tE > 0) t.push({ty:"info",i:"📝",tx:"収入を登録すると貯蓄率が出ます。貯蓄率は家計の最重要指標です。"});
  else if (bal < 0 && bal + inv >= 0) t.push({ty:"good",i:"🌱",tx:`収支は−¥${Math.abs(bal).toLocaleString()}ですが、投資¥${inv.toLocaleString()}を含めれば実質プラス。良いお金の流れです。`});
  else if (bal < 0) t.push({ty:"danger",i:"🚨",tx:`支出が収入を¥${Math.abs(bal).toLocaleString()}超過。まず金額の大きい固定費から1つ見直しましょう。`});
  else if (realSr >= 30) t.push({ty:"good",i:"🏆",tx:`実質貯蓄率${realSr.toFixed(0)}%（投資含む）！理想の20〜30%を超えています。素晴らしい。`});
  else if (realSr >= 20) t.push({ty:"good",i:"🎉",tx:`実質貯蓄率${realSr.toFixed(0)}%。理想的なペースです。この調子！`});
  else if (realSr >= 10) t.push({ty:"info",i:"💡",tx:`貯蓄率${realSr.toFixed(0)}%。理想の20%まであと¥${Math.max(0, Math.ceil((0.2*tI - bal - inv)/1000)*1000).toLocaleString()}。変動費に注目。`});
  else t.push({ty:"warn",i:"⚠️",tx:`貯蓄率${realSr.toFixed(0)}%。まずは手取りの10%を先に取り分けるのがコツです。`});
  // ② 前月比（増減の気づき）
  if (x.prevTE > 0 && tE > 0) {
    const d = tE - x.prevTE, pct = Math.abs(d)/x.prevTE*100;
    if (d <= -3000) t.push({ty:"good",i:"📉",tx:`支出は前月より¥${Math.abs(d).toLocaleString()}減（−${pct.toFixed(0)}%）。確実に改善しています！`});
    else if (d >= 3000) t.push({ty:"warn",i:"📈",tx:`支出は前月より¥${d.toLocaleString()}増（＋${pct.toFixed(0)}%）。下の前月比で内訳を見てみましょう。`});
    if (x.upCat) t.push({ty:"info",i:"🔎",tx:`今月増えたのは「${x.upCat[0]}」＋¥${x.upCat[1].toLocaleString()}。心当たりはありますか？`});
    if (x.downCat) t.push({ty:"good",i:"✂️",tx:`「${x.downCat[0]}」を前月比−¥${x.downCat[1].toLocaleString()}。ナイスコントロール！`});
  }
  // ③ 固定費率
  if (tE > 0 && x.fxT > 0) { const fr = x.fxT/tE*100; if (fr >= 60) t.push({ty:"warn",i:"🏗️",tx:`固定費が支出の${fr.toFixed(0)}%。通信・サブスク・保険は一度替えれば毎月効きます。`}); }
  // ④ カテゴリ別の気づき
  const cv = bC["食費（コンビニ）"];
  if (cv?.count >= 15) t.push({ty:"warn",i:"🏪",tx:`コンビニ${cv.count}回・計¥${cv.total.toLocaleString()}。まとめ買いに置き換えると月¥${Math.round(cv.total*0.3).toLocaleString()}浮く計算。`});
  else if (cv?.count >= 8) t.push({ty:"info",i:"🏪",tx:`コンビニ${cv.count}回。回数を意識するだけでも自然と減ります。`});
  const eo = bC["食費（外食）"]?.total || 0, ji = bC["食費（自炊）"]?.total || 0;
  if (eo > 10000 && eo > ji*2) t.push({ty:"info",i:"🍳",tx:`外食¥${eo.toLocaleString()} vs 自炊¥${ji.toLocaleString()}。週1回の置き換えで年間数万円の差に。`});
  if (bC["サブスク"]?.total > 5000) t.push({ty:"info",i:"🔄",tx:`サブスク計¥${bC["サブスク"].total.toLocaleString()}/月＝年間¥${(bC["サブスク"].total*12).toLocaleString()}。使っていないものは？`});
  if (bC["光熱費"]?.total > 20000) t.push({ty:"warn",i:"💡",tx:`光熱費¥${bC["光熱費"].total.toLocaleString()}。プラン見直しの余地があるかも。`});
  // ⑤ 良い支出を褒める
  if (inv > 0) t.push({ty:"good",i:"📈",tx:`先取り投資¥${inv.toLocaleString()}。未来の自分への仕送りです。`});
  if (bC["教育・自己投資"]) t.push({ty:"good",i:"📚",tx:"自己投資はリターン最大の支出。続けましょう！"});
  if (bC["健康"]) t.push({ty:"good",i:"💪",tx:"健康への投資は将来の医療費の節約でもあります。"});
  // ⑥ 純資産の前進（モチベーション）
  if (x.histUp > 0) t.push({ty:"good",i:"🚀",tx:`純資産が前回更新から＋¥${x.histUp.toLocaleString()}。確実に前進しています！`});
  if (x.nwTgt > 0 && x.netW < x.nwTgt) t.push({ty:"info",i:"🎯",tx:`目標純資産まであと¥${(x.nwTgt - x.netW).toLocaleString()}（達成率${x.nwP.toFixed(0)}%）。`});
  else if (x.nwTgt > 0) t.push({ty:"good",i:"👑",tx:"目標純資産を達成！おめでとうございます。次の目標を設定しましょう。"});
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
function SR({l,v,c,bold,sub,sm,signed}:any){
  const pfx = v<0?"-":(signed?"+":"");
  return (<div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:sm?"2px 0":"3px 0"}}>
    <span style={{color:sub?"#888":(bold?"#ddd":"#bbb"),fontWeight:bold?700:400,fontSize:sm?10:12}}>{l}</span>
    <span style={{fontFamily:"monospace",color:c,fontWeight:bold?700:600,fontSize:sm?10:12}}>{pfx}¥{Math.abs(v).toLocaleString()}</span>
  </div>);
}
const cs = (s:any={}) => ({background:"rgba(255,255,255,0.035)",borderRadius:14,padding:14,border:"1px solid rgba(255,255,255,0.06)",marginBottom:12,...s});
const B1:React.CSSProperties = {background:"linear-gradient(135deg,#FF6B6B,#FF8E53)",border:"none",color:"#fff",padding:"12px 0",borderRadius:12,fontSize:14,fontWeight:600,cursor:"pointer",width:"100%",fontFamily:"inherit"};

// ═══ MAIN ═══
export default function Home() {
  const [D,sD]=useState(DEF); const [pg,sPg]=useState("home"); const [rdy,sRdy]=useState(false);
  const [shI,sShI]=useState(false); const [shE,sShE]=useState(false); const [shA,sShA]=useState(false);
  const [shG,sShG]=useState(false); const [shM,sShM]=useState(false); const [shIn,sShIn]=useState(false);
  const [shUp,sShUp]=useState(false); const [shL,sShL]=useState(false); const [eI,sEI]=useState<number|null>(null);
  const [upR,sUpR]=useState(""); const [upL,sUpL]=useState(false);
  const [fIT,sfIT]=useState("salary"); const [fIA,sfIA]=useState(""); const [fIN,sfIN]=useState("");
  const [fEC,sfEC]=useState("食費（自炊）"); const [fEA,sfEA]=useState(""); const [fEN,sfEN]=useState(""); const [fED,sfED]=useState("");
  const [fAT,sfAT]=useState("savings"); const [fAA,sfAA]=useState(""); const [fAN,sfAN]=useState("");
  const [fLT,sfLT]=useState("loan_home"); const [fLA,sfLA]=useState(""); const [fLN,sfLN]=useState("");
  const [eAsId,sEAsId]=useState<number|null>(null); const [eLiId,sELiId]=useState<number|null>(null);
  const [fGA,sfGA]=useState(""); const [fGL,sfGL]=useState(""); const [fNWA,sfNWA]=useState(""); const [fNM,sfNM]=useState("");

  useEffect(()=>{const s=LD();if(s?.months&&Object.keys(s.months).length) sD({...DEF,...s,assets:s.assets||[],liabilities:s.liabilities||[],assetHist:s.assetHist||[],rules:s.rules||{}}); else sD(freshState()); sRdy(true);},[]);
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
  const tAs=useMemo(()=>(D.assets||[]).reduce((s:number,a:any)=>s+a.amount,0),[D.assets]);
  const tLi=useMemo(()=>(D.liabilities||[]).reduce((s:number,a:any)=>s+a.amount,0),[D.liabilities]);
  const netW=tAs-tLi;
  const gP=D.goal.target>0?Math.min(100,yD.yB/D.goal.target*100):0;
  const nwTgt=D.goal.nw||0;
  const nwP=nwTgt>0?Math.min(100,Math.max(0,netW/nwTgt*100)):0;
  // ── 前月データ（前月比の可視化とコメントに使用）──
  const prevKey=useMemo(()=>{if(!cm)return "";const [y,m]=cm.split("-").map(Number);return m===1?`${y-1}-12`:`${y}-${String(m-1).padStart(2,"0")}`;},[cm]);
  const prev=useMemo(()=>{
    const pm=D.months[prevKey];if(!pm)return{tE:0,tI:0,bC:{} as any};
    const all=[...(pm.cardExp||[]),...(pm.manualExp||[])];
    const m:any={};all.forEach((t:any)=>{m[t.category]=(m[t.category]||0)+t.amount;});
    return{tE:all.reduce((s:number,e:any)=>s+e.amount,0),tI:(pm.incomes||[]).reduce((s:number,i:any)=>s+i.amount,0),bC:m};
  },[D.months,prevKey]);
  const catDelta=useMemo(()=>{
    if(prev.tE===0)return[] as [string,number][];
    const keys=new Set([...Object.keys(bC),...Object.keys(prev.bC)]);
    return[...keys].map(k=>[k,(bC[k]?.total||0)-(prev.bC[k]||0)] as [string,number]).filter(([,d])=>Math.abs(d)>=1000).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
  },[bC,prev]);
  const advCtx=useMemo(()=>{
    const ups=catDelta.filter(([,d])=>d>0),downs=catDelta.filter(([,d])=>d<0);
    const h=D.assetHist;let histUp=0;
    if(h.length>=2){const a=h[h.length-1],b=h[h.length-2];const dv=(a.net??a.total??0)-(b.net??b.total??0);if(dv>0)histUp=dv;}
    return{prevTE:prev.tE,prevTI:prev.tI,fxT,netW,nwTgt,nwP,histUp,
      upCat:ups.length&&ups[0][1]>=3000?[ups[0][0],ups[0][1]]:null,
      downCat:downs.length&&-downs[0][1]>=3000?[downs[0][0],-downs[0][1]]:null};
  },[prev,catDelta,fxT,netW,nwTgt,nwP,D.assetHist]);
  const adv=useMemo(()=>genAdvice(tI,tE,bC,advCtx),[tI,tE,bC,advCtx]);

  const uM=(fn:any)=>sD((p:any)=>({...p,months:{...p.months,[cm]:fn(p.months[cm]||{incomes:[],manualExp:[],cardExp:[]})}}));
  const shiftMonth=(dir:number)=>{if(!cm)return;const [y,m]=cm.split("-").map(Number);const d=new Date(y,(m-1)+dir,1);const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;sD((p:any)=>({...p,months:{...p.months,[k]:p.months[k]||{incomes:[],manualExp:[],cardExp:[]}},cur:k}));};
  const addI=()=>{if(!fIA||Number(fIA)<=0)return;uM((m:any)=>({...m,incomes:[...m.incomes,{type:fIT,amount:Number(fIA),note:fIN,id:Date.now()}]}));sfIA("");sfIN("");sShI(false);};
  const addE=()=>{if(!fEA||Number(fEA)<=0)return;const d=fED||new Date().toLocaleDateString("ja-JP",{month:"2-digit",day:"2-digit"});uM((m:any)=>({...m,manualExp:[...m.manualExp,{date:d,description:fEN||fEC,amount:Number(fEA),category:fEC,source:"manual",id:Date.now()}]}));sfEA("");sfEN("");sfED("");sShE(false);};
  const snap=(p:any,assets:any[],liabs:any[])=>{const now=new Date().toISOString().slice(0,10);const a=assets.reduce((s:number,x:any)=>s+x.amount,0);const l=liabs.reduce((s:number,x:any)=>s+x.amount,0);return[...(p.assetHist||[]),{date:now,assets:a,liab:l,net:a-l,total:a}].slice(-120);};
  const openAs=(a?:any)=>{if(a){sfAT(a.type);sfAA(String(a.amount));sfAN(a.note||"");sEAsId(a.id);}else{sfAT("savings");sfAA("");sfAN("");sEAsId(null);}sShA(true);};
  const openLi=(a?:any)=>{if(a){sfLT(a.type);sfLA(String(a.amount));sfLN(a.note||"");sELiId(a.id);}else{sfLT("loan_home");sfLA("");sfLN("");sELiId(null);}sShL(true);};
  const addAs=()=>{if(!fAA)return;sD((p:any)=>{const na=[...(p.assets||[]).filter((a:any)=>a.id!==eAsId&&a.type!==fAT),{type:fAT,amount:Number(fAA),note:fAN,id:eAsId||Date.now()}];return{...p,assets:na,assetHist:snap(p,na,p.liabilities||[])};});sfAA("");sfAN("");sEAsId(null);sShA(false);};
  const addLi=()=>{if(!fLA)return;sD((p:any)=>{const nl=[...(p.liabilities||[]).filter((a:any)=>a.id!==eLiId&&a.type!==fLT),{type:fLT,amount:Number(fLA),note:fLN,id:eLiId||Date.now()}];return{...p,liabilities:nl,assetHist:snap(p,p.assets||[],nl)};});sfLA("");sfLN("");sELiId(null);sShL(false);};
  const delAs=(id:number)=>sD((p:any)=>{const na=(p.assets||[]).filter((a:any)=>a.id!==id);return{...p,assets:na,assetHist:snap(p,na,p.liabilities||[])};});
  const delLi=(id:number)=>sD((p:any)=>{const nl=(p.liabilities||[]).filter((a:any)=>a.id!==id);return{...p,liabilities:nl,assetHist:snap(p,p.assets||[],nl)};});

  const handleUpload = async (file: File) => {
    sUpL(true); sUpR("");
    try {
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      const text = isPdf ? await extractPdfText(file) : await file.text();
      let txns = isPdf ? parsePdfStatement(text, D.rules) : parseCSV(text, D.rules);
      if (txns.length === 0) txns = parseCSV(text, D.rules); // 念のためCSV方式でも再解析
      if (txns.length === 0) {
        sUpR(isPdf ? "❌ PDFから取引データを読み取れませんでした。画像(スキャン)のPDFは読み取れません。CSVもお試しください。" : "❌ 取引データを抽出できませんでした。");
      } else {
        // ── 蓄積：すでに登録済みの取引（日付・金額・内容が同じ）はスキップ ──
        const seen = new Set((md.cardExp || []).map((t:any)=>`${t.date}|${t.amount}|${t.description}`));
        const fresh:any[] = []; let dup = 0;
        for (const t of txns) { const k=`${t.date}|${t.amount}|${t.description}`; if (seen.has(k)) { dup++; continue; } seen.add(k); fresh.push(t); }
        if (fresh.length === 0) sUpR(`ℹ️ ${txns.length}件すべて登録済みでした（重複スキップ）。`);
        else { uM((m:any)=>({...m,cardExp:[...m.cardExp,...fresh]})); sUpR(`✅ ${fresh.length}件を「${cm}」に追加しました！${dup>0?`（重複${dup}件はスキップ）`:""}`); }
      }
    } catch(e:any) { sUpR("❌ 読み取りエラー: "+(e?.message||e)); }
    sUpL(false);
  };

  const exportData=()=>{try{const blob=new Blob([JSON.stringify(D,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`kakeibo-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}catch(e:any){alert("書き出しに失敗しました: "+e.message);}};
  const importData=async(file:File)=>{try{const o=JSON.parse(await file.text());if(!o||typeof o!=="object"||!o.months){alert("❌ このアプリのバックアップファイル(JSON)ではないようです。");return;}if(!confirm("現在のデータを、選んだファイルの内容で置き換えます。よろしいですか？（先に今のデータを書き出しておくと安心です）"))return;sD({...DEF,...o,assets:o.assets||[],liabilities:o.liabilities||[],assetHist:o.assetHist||[],goal:o.goal||{target:0,label:""},rules:o.rules||{}});alert("✅ データを読み込みました！");}catch(e:any){alert("❌ 読み込みに失敗しました: "+e.message);}};

  // カテゴリ変更＝学習：同じ店名の取引を全て変更し、店名→カテゴリを記憶して次回の取込に反映
  const hCC=useCallback((idx:number,val:string)=>{
    const t=allE[idx]; if(!t) return;
    const key=kanaNorm(t.description||"");
    sD((p:any)=>{
      const m=p.months[p.cur]||{incomes:[],manualExp:[],cardExp:[]};
      const upd=(list:any[])=>(list||[]).map((x:any)=>kanaNorm(x.description||"")===key?{...x,category:val}:x);
      return {...p,rules:{...(p.rules||{}),[key]:val},months:{...p.months,[p.cur]:{...m,cardExp:upd(m.cardExp),manualExp:upd(m.manualExp)}}};
    });
  },[allE]);

  // 「その他」の取引だけを、最新のルール＋キーワード辞書で再仕分け
  const reCat=useCallback(()=>{
    sD((p:any)=>{
      const m=p.months[p.cur]; if(!m) return p;
      const f=(list:any[])=>(list||[]).map((x:any)=>x.category==="その他"?{...x,category:autoCategory(x.description||"",p.rules)}:x);
      return {...p,months:{...p.months,[p.cur]:{...m,cardExp:f(m.cardExp),manualExp:f(m.manualExp)}}};
    });
  },[]);

  if(!rdy) return <div style={{minHeight:"100vh",background:"#0b0b1a",display:"flex",alignItems:"center",justifyContent:"center",color:"#888"}}>読み込み中...</div>;
  const ac:any = {good:"#2ECC71",danger:"#E74C3C",warn:"#F39C12",info:"#bbb"};

  return (
    <div style={{minHeight:"100vh",background:"#0b0b1a",color:"#e0e0e0",fontFamily:"'Hiragino Sans',-apple-system,sans-serif",paddingBottom:72}}>
      <div style={{maxWidth:480,margin:"0 auto",padding:"16px 14px"}}>

        {pg==="home"&&(<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h1 style={{fontSize:18,fontWeight:700,margin:0,background:"linear-gradient(135deg,#FF6B6B,#FFB347)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>💰 マイ家計簿</h1>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <button onClick={()=>shiftMonth(-1)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid #333",color:"#ccc",padding:"5px 9px",borderRadius:8,fontSize:12,cursor:"pointer"}}>‹</button>
              <button onClick={()=>sShM(true)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid #333",color:"#ccc",padding:"5px 10px",borderRadius:8,fontSize:12,cursor:"pointer"}}>📅 {cm}</button>
              <button onClick={()=>shiftMonth(1)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid #333",color:"#ccc",padding:"5px 9px",borderRadius:8,fontSize:12,cursor:"pointer"}}>›</button>
            </div>
          </div>
          <div style={cs({background:"linear-gradient(135deg,rgba(255,107,107,0.06),rgba(255,179,71,0.04))",borderColor:"rgba(255,107,107,0.12)",padding:16})}>
            <div style={{fontSize:10,color:"#999"}}>今月の収支</div>
            <div style={{fontSize:26,fontWeight:800,fontFamily:"monospace",color:bal>=0?"#2ECC71":"#E74C3C",marginBottom:6}}>{bal>=0?"+":""}¥{bal.toLocaleString()}</div>
            <div style={{display:"flex",gap:14,fontSize:11,flexWrap:"wrap"}}>
              <span><span style={{color:"#888"}}>収入 </span><span style={{color:"#2ECC71",fontFamily:"monospace",fontWeight:600}}>¥{tI.toLocaleString()}</span></span>
              <span><span style={{color:"#888"}}>支出 </span><span style={{color:"#FF6B6B",fontFamily:"monospace",fontWeight:600}}>¥{tE.toLocaleString()}</span></span>
              {tI>0&&<span><span style={{color:"#888"}}>貯蓄率 </span><span style={{color:bal/tI>=0.2?"#2ECC71":bal/tI>=0.1?"#F39C12":"#FF6B6B",fontFamily:"monospace",fontWeight:700}}>{Math.max(0,bal/tI*100).toFixed(0)}%</span></span>}
              {prev.tE>0&&tE>0&&<span><span style={{color:"#888"}}>前月比 </span><span style={{color:tE<=prev.tE?"#2ECC71":"#FF6B6B",fontFamily:"monospace",fontWeight:600}}>{tE<=prev.tE?"−":"＋"}¥{Math.abs(tE-prev.tE).toLocaleString()}</span></span>}
            </div>
            {tI>0&&<div style={{marginTop:6,height:5,background:"rgba(255,255,255,0.08)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:Math.min(100,tE/tI*100)+"%",background:tE/tI>1?"#E74C3C":tE/tI>0.8?"#F39C12":"#2ECC71",borderRadius:3}}/></div>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>
            <button onClick={()=>sShI(true)} style={{background:"rgba(46,204,113,0.03)",border:"1px dashed rgba(46,204,113,0.3)",borderRadius:12,padding:10,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:18}}>💼</div><div style={{fontSize:10,color:"#2ECC71",fontWeight:600}}>収入</div></button>
            <button onClick={()=>sShE(true)} style={{background:"rgba(255,107,107,0.03)",border:"1px dashed rgba(255,107,107,0.3)",borderRadius:12,padding:10,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:18}}>💸</div><div style={{fontSize:10,color:"#FF6B6B",fontWeight:600}}>支出</div></button>
            <button onClick={()=>sShUp(true)} style={{background:"rgba(52,152,219,0.03)",border:"1px dashed rgba(52,152,219,0.3)",borderRadius:12,padding:10,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:18}}>💳</div><div style={{fontSize:10,color:"#3498DB",fontWeight:600}}>明細取込</div></button>
          </div>
          <div onClick={()=>sPg("statement")} style={cs({background:"linear-gradient(135deg,rgba(52,152,219,0.06),rgba(46,204,113,0.04))",borderColor:"rgba(52,152,219,0.12)",cursor:"pointer"})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontSize:10,color:"#999"}}>純資産（総資産 − 負債）</span><span style={{fontSize:9,color:"#666"}}>📑 決算書 ›</span></div>
            <div style={{fontSize:22,fontWeight:800,fontFamily:"monospace",color:netW>=0?"#3498DB":"#E74C3C",marginBottom:6}}>{netW>=0?"":"-"}¥{Math.abs(netW).toLocaleString()}</div>
            <div style={{display:"flex",gap:14,fontSize:11}}>
              <span><span style={{color:"#888"}}>資産 </span><span style={{color:"#2ECC71",fontFamily:"monospace",fontWeight:600}}>¥{tAs.toLocaleString()}</span></span>
              <span><span style={{color:"#888"}}>負債 </span><span style={{color:"#FF6B6B",fontFamily:"monospace",fontWeight:600}}>¥{tLi.toLocaleString()}</span></span>
            </div>
            {nwTgt>0&&<div style={{marginTop:8}}><div style={{height:5,background:"rgba(255,255,255,0.08)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:nwP+"%",background:nwP>=100?"#2ECC71":"linear-gradient(90deg,#3498DB,#2ECC71)",borderRadius:3}}/></div><div style={{fontSize:9,color:"#888",marginTop:3}}>🎯 目標 ¥{nwTgt.toLocaleString()} まで {nwP.toFixed(0)}%{netW<nwTgt?`（あと¥${(nwTgt-netW).toLocaleString()}）`:" 達成！🎉"}</div></div>}
          </div>
          {D.goal.target>0&&<div style={cs()}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{fontWeight:600,color:"#ccc"}}>🎯 {D.goal.label||"貯金目標"}</span><span style={{fontFamily:"monospace",color:"#FFB347"}}>¥{D.goal.target.toLocaleString()}</span></div><div style={{height:8,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:gP+"%",background:gP>=100?"#2ECC71":"linear-gradient(90deg,#3498DB,#2ECC71)",borderRadius:4}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#888"}}><span>年間貯蓄 ¥{yD.yB.toLocaleString()}</span><span style={{color:gP>=100?"#2ECC71":"#FFB347",fontWeight:600}}>{gP.toFixed(0)}%</span></div></div>}
          <div style={cs({background:"rgba(255,107,107,0.03)",borderColor:"rgba(255,107,107,0.1)"})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}><h3 style={{fontSize:12,fontWeight:600,margin:0,color:"#FF6B6B"}}>💬 スマートコメント</h3><span style={{fontSize:8,color:"#666"}}>端末内で分析・外部送信なし</span></div>
            {adv.slice(0,7).map((t:any,i:number)=><div key={i} style={{fontSize:11,color:ac[t.ty],padding:"3px 0",lineHeight:1.6}}>{t.i} {t.tx}</div>)}
          </div>
          <div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 8px",color:"#bbb"}}>支出トップ5</h3>
            {srt.slice(0,5).map(([cat,d]:any)=>{const cfg=EC[cat]||{i:"📦",c:"#888"};return(<div key={cat} style={{marginBottom:6}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:2}}><span style={{color:"#ccc"}}>{cfg.i} {cat}</span><span style={{fontFamily:"monospace",color:cfg.c,fontWeight:600}}>¥{d.total.toLocaleString()}</span></div><div style={{height:3,background:"rgba(255,255,255,0.05)",borderRadius:2}}><div style={{height:"100%",width:(tE>0?d.total/tE*100:0)+"%",background:cfg.c,borderRadius:2}}/></div></div>);})}
          </div>
        </div>)}

        {pg==="statement"&&(<div>
          <h2 style={{fontSize:16,fontWeight:700,margin:"0 0 2px",color:"#eee"}}>📑 マイ決算書</h2>
          <p style={{fontSize:10,color:"#666",margin:"0 0 14px"}}>あなた専用の損益計算書(P/L)と貸借対照表(B/S)</p>

          {/* ── 損益計算書 P/L ── */}
          <div style={cs()}>
            <h3 style={{fontSize:13,fontWeight:700,margin:"0 0 2px",color:"#FF8E53"}}>損益計算書 <span style={{fontSize:9,color:"#777",fontWeight:400}}>P/L · {cm}</span></h3>
            <p style={{fontSize:9,color:"#666",margin:"0 0 10px"}}>その月にいくら稼ぎ、いくら使ったか</p>
            <SR l="収益（収入）" v={tI} c="#2ECC71"/>
            <SR l="費用（支出）" v={tE} c="#FF6B6B"/>
            <SR l="　└ 固定費" v={fxT} c="#3498DB" sub/>
            <SR l="　└ 変動費" v={tE-fxT} c="#F39C12" sub/>
            {bC["投資・貯蓄"]&&<SR l="　└ うち投資・貯蓄" v={bC["投資・貯蓄"].total} c="#27AE60" sub/>}
            <div style={{borderTop:"1px solid rgba(255,255,255,0.12)",margin:"8px 0 6px"}}/>
            <SR l="当期純利益（収支）" v={bal} c={bal>=0?"#2ECC71":"#E74C3C"} bold signed/>
            {bC["投資・貯蓄"]&&tI>0&&<SR l="実質収支（投資を貯蓄側に）" v={bal+bC["投資・貯蓄"].total} c={bal+bC["投資・貯蓄"].total>=0?"#27AE60":"#E74C3C"} signed sm/>}
            <div style={{marginTop:12,borderTop:"1px dashed rgba(255,255,255,0.1)",paddingTop:10}}>
              <div style={{fontSize:10,color:"#FFB347",fontWeight:600,marginBottom:6}}>📅 {yD.y}年 累計</div>
              <SR l="収益（年間）" v={yD.yI} c="#2ECC71"/>
              <SR l="費用（年間）" v={yD.yE} c="#FF6B6B"/>
              <SR l="当期純利益（年間）" v={yD.yB} c={yD.yB>=0?"#2ECC71":"#E74C3C"} bold signed/>
              {yD.ch.length>1&&<div style={{marginTop:8}}><ResponsiveContainer width="100%" height={120}><BarChart data={yD.ch} margin={{top:8,right:4,left:-20,bottom:0}}><XAxis dataKey="name" tick={{fill:"#888",fontSize:9}} axisLine={false} tickLine={false}/><YAxis hide/><Tooltip content={<TT/>}/><Bar dataKey="income" fill="#2ECC71" radius={[3,3,0,0]} name="収入"/><Bar dataKey="expense" fill="#FF6B6B" radius={[3,3,0,0]} name="支出"/></BarChart></ResponsiveContainer></div>}
            </div>
          </div>

          {/* ── 前月比（どこが増えた/減ったか）── */}
          {prev.tE>0&&catDelta.length>0&&<div style={cs()}>
            <h3 style={{fontSize:12,fontWeight:600,margin:"0 0 2px",color:"#bbb"}}>📊 前月比 <span style={{fontSize:9,color:"#777",fontWeight:400}}>{prevKey} → {cm}</span></h3>
            <p style={{fontSize:9,color:"#666",margin:"0 0 8px"}}>支出合計 {tE<=prev.tE?"−":"＋"}¥{Math.abs(tE-prev.tE).toLocaleString()}（¥{prev.tE.toLocaleString()} → ¥{tE.toLocaleString()}）</p>
            {catDelta.slice(0,6).map(([c,d])=>{const cfg=EC[c]||{i:"📦",c:"#888"};const w=Math.min(100,Math.abs(d)/Math.max(...catDelta.map(([,x])=>Math.abs(x)))*100);
              return(<div key={c} style={{marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:2}}>
                  <span style={{color:"#ccc"}}>{cfg.i} {c}</span>
                  <span style={{fontFamily:"monospace",fontWeight:600,color:d>0?"#FF6B6B":"#2ECC71"}}>{d>0?"＋":"−"}¥{Math.abs(d).toLocaleString()}</span>
                </div>
                <div style={{height:3,background:"rgba(255,255,255,0.05)",borderRadius:2}}><div style={{height:"100%",width:w+"%",background:d>0?"#FF6B6B":"#2ECC71",borderRadius:2}}/></div>
              </div>);})}
          </div>}

          {/* ── 費用の内訳 ── */}
          <div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 2px",color:"#bbb"}}>固定費 vs 変動費</h3><ResponsiveContainer width="100%" height={170}><PieChart><Pie data={[{name:"固定費",value:fxT,color:"#3498DB"},{name:"変動費",value:tE-fxT,color:"#F39C12"}]} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value" paddingAngle={4} stroke="none" label={({name,percent}:any)=>name+" "+(percent*100).toFixed(0)+"%"}><Cell fill="#3498DB"/><Cell fill="#F39C12"/></Pie><Tooltip content={<TT/>}/></PieChart></ResponsiveContainer></div>
          <div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 2px",color:"#bbb"}}>カテゴリ別支出</h3><ResponsiveContainer width="100%" height={Math.max(200,srt.length*28)}><BarChart data={srt.map(([c,v]:any)=>({name:(EC[c]?.i||"")+" "+c,value:v.total,color:EC[c]?.c||"#888"}))} layout="vertical" margin={{left:100,right:45,top:4,bottom:4}}><XAxis type="number" hide/><YAxis type="category" dataKey="name" width={100} tick={{fill:"#aaa",fontSize:9}} axisLine={false} tickLine={false}/><Tooltip content={<TT/>}/><Bar dataKey="value" radius={[0,4,4,0]} label={{position:"right",fill:"#888",fontSize:8,formatter:(v:number)=>"¥"+v.toLocaleString()}}>{srt.map(([c]:any,i:number)=><Cell key={i} fill={EC[c]?.c||"#888"}/>)}</Bar></BarChart></ResponsiveContainer></div>

          {/* ── 貸借対照表 B/S ── */}
          <div style={cs()}>
            <h3 style={{fontSize:13,fontWeight:700,margin:"0 0 2px",color:"#3498DB"}}>貸借対照表 <span style={{fontSize:9,color:"#777",fontWeight:400}}>B/S · 現在</span></h3>
            <p style={{fontSize:9,color:"#666",margin:"0 0 10px"}}>今いくら持っていて、いくら借りているか</p>
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1,background:"rgba(46,204,113,0.05)",borderRadius:10,padding:"10px 10px 8px",border:"1px solid rgba(46,204,113,0.12)"}}>
                <div style={{fontSize:10,color:"#2ECC71",fontWeight:700,marginBottom:6}}>資産の部</div>
                {(D.assets||[]).length===0&&<p style={{fontSize:9,color:"#666",margin:0}}>未登録</p>}
                {(D.assets||[]).map((a:any)=>{const at=AT.find(t=>t.id===a.type);return<SR key={a.id} l={(at?.i||"")+" "+(at?.l||"他")} v={a.amount} c="#ccc" sm/>;})}
                <div style={{borderTop:"1px solid rgba(46,204,113,0.2)",margin:"6px 0 4px"}}/>
                <SR l="資産合計" v={tAs} c="#2ECC71" bold sm/>
              </div>
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
                <div style={{background:"rgba(255,107,107,0.05)",borderRadius:10,padding:"10px 10px 8px",border:"1px solid rgba(255,107,107,0.12)"}}>
                  <div style={{fontSize:10,color:"#FF6B6B",fontWeight:700,marginBottom:6}}>負債の部</div>
                  {(D.liabilities||[]).length===0&&<p style={{fontSize:9,color:"#666",margin:0}}>なし</p>}
                  {(D.liabilities||[]).map((a:any)=>{const lt=LT.find(t=>t.id===a.type);return<SR key={a.id} l={(lt?.i||"")+" "+(lt?.l||"他")} v={a.amount} c="#ccc" sm/>;})}
                  <div style={{borderTop:"1px solid rgba(255,107,107,0.2)",margin:"6px 0 4px"}}/>
                  <SR l="負債合計" v={tLi} c="#FF6B6B" bold sm/>
                </div>
                <div style={{background:"rgba(52,152,219,0.05)",borderRadius:10,padding:"10px 10px 8px",border:"1px solid rgba(52,152,219,0.12)"}}>
                  <div style={{fontSize:10,color:"#3498DB",fontWeight:700,marginBottom:6}}>純資産の部</div>
                  <SR l="純資産" v={netW} c={netW>=0?"#3498DB":"#E74C3C"} bold sm signed/>
                </div>
              </div>
            </div>
            <div style={{marginTop:10,fontSize:9,color:"#666",textAlign:"center"}}>資産 ¥{tAs.toLocaleString()} ＝ 負債 ¥{tLi.toLocaleString()} ＋ 純資産 {netW<0?"-":""}¥{Math.abs(netW).toLocaleString()}</div>
            <button onClick={()=>sPg("assets")} style={{marginTop:10,background:"rgba(52,152,219,0.1)",border:"1px solid rgba(52,152,219,0.2)",color:"#3498DB",padding:"8px 0",borderRadius:8,fontSize:11,cursor:"pointer",width:"100%",fontWeight:600}}>💎 資産・負債を編集する</button>
          </div>
        </div>)}

        {pg==="assets"&&(<div>
          <h2 style={{fontSize:16,fontWeight:700,margin:"0 0 14px",color:"#eee"}}>💎 資産・負債</h2>
          <div style={cs({background:"linear-gradient(135deg,rgba(52,152,219,0.06),rgba(46,204,113,0.04))",borderColor:"rgba(52,152,219,0.12)",padding:16})}>
            <div style={{fontSize:10,color:"#999"}}>純資産（総資産 − 負債）</div>
            <div style={{fontSize:26,fontWeight:800,fontFamily:"monospace",color:netW>=0?"#3498DB":"#E74C3C",marginBottom:8}}>{netW<0?"-":""}¥{Math.abs(netW).toLocaleString()}</div>
            <div style={{display:"flex",gap:14,fontSize:11,marginBottom:12}}>
              <span><span style={{color:"#888"}}>総資産 </span><span style={{color:"#2ECC71",fontFamily:"monospace",fontWeight:600}}>¥{tAs.toLocaleString()}</span></span>
              <span><span style={{color:"#888"}}>負債 </span><span style={{color:"#FF6B6B",fontFamily:"monospace",fontWeight:600}}>¥{tLi.toLocaleString()}</span></span>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>openAs()} style={{flex:1,background:"rgba(46,204,113,0.1)",border:"1px solid rgba(46,204,113,0.2)",color:"#2ECC71",padding:"8px 0",borderRadius:8,fontSize:11,cursor:"pointer",fontWeight:600}}>＋ 資産を追加</button>
              <button onClick={()=>openLi()} style={{flex:1,background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.2)",color:"#FF6B6B",padding:"8px 0",borderRadius:8,fontSize:11,cursor:"pointer",fontWeight:600}}>＋ 負債を追加</button>
            </div>
          </div>
          <div style={cs()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3 style={{fontSize:12,fontWeight:600,margin:0,color:"#3498DB"}}>🎯 純資産の目標</h3><button onClick={()=>{sfGA(String(D.goal.target||""));sfGL(D.goal.label);sfNWA(String(D.goal.nw||""));sShG(true);}} style={{background:"rgba(52,152,219,0.1)",border:"1px solid rgba(52,152,219,0.2)",color:"#3498DB",padding:"3px 8px",borderRadius:5,fontSize:10,cursor:"pointer",fontWeight:600}}>{nwTgt>0?"変更":"設定"}</button></div>{nwTgt>0?<div style={{marginTop:8}}><div style={{height:10,background:"rgba(255,255,255,0.06)",borderRadius:5,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:nwP+"%",background:nwP>=100?"#2ECC71":"linear-gradient(90deg,#3498DB,#2ECC71)",borderRadius:5}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#888"}}><span>純資産 ¥{netW.toLocaleString()} / ¥{nwTgt.toLocaleString()}</span><span style={{color:nwP>=100?"#2ECC71":"#3498DB",fontWeight:600}}>{nwP.toFixed(0)}%{netW<nwTgt?` ・あと¥${(nwTgt-netW).toLocaleString()}`:""}</span></div></div>:<p style={{fontSize:10,color:"#666",margin:"6px 0 0"}}>目標の純資産額を設定すると、達成率と「あといくら」が表示されます。</p>}</div>
          {D.assets.length>0&&<div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 8px",color:"#2ECC71"}}>資産の内訳</h3><ResponsiveContainer width="100%" height={170}><PieChart><Pie data={D.assets.map((a:any)=>{const at=AT.find(t=>t.id===a.type);return{name:at?.l||"他",value:a.amount,color:at?.c||"#888"};})} cx="50%" cy="50%" innerRadius={38} outerRadius={65} dataKey="value" paddingAngle={2} stroke="none" label={({name,percent}:any)=>percent>0.05?name:""}>{D.assets.map((a:any,i:number)=><Cell key={i} fill={AT.find(t=>t.id===a.type)?.c||"#888"}/>)}</Pie><Tooltip content={<TT/>}/></PieChart></ResponsiveContainer>{D.assets.map((a:any)=>{const at=AT.find(t=>t.id===a.type);return<div key={a.type} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",fontSize:12,borderBottom:"1px solid rgba(255,255,255,0.03)"}}><span onClick={()=>openAs(a)} style={{color:"#ccc",cursor:"pointer",flex:1}}>{at?.i} {at?.l} {a.note&&<span style={{color:"#666",fontSize:10}}>({a.note})</span>} <span style={{color:"#555",fontSize:9}}>✎</span></span><div style={{display:"flex",alignItems:"center",gap:8}}><span onClick={()=>openAs(a)} style={{fontFamily:"monospace",color:at?.c,fontWeight:600,cursor:"pointer"}}>¥{a.amount.toLocaleString()}</span><button onClick={()=>delAs(a.id)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:0}}>×</button></div></div>;})}</div>}
          {D.liabilities.length>0&&<div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 8px",color:"#FF6B6B"}}>負債の内訳</h3>{D.liabilities.map((a:any)=>{const lt=LT.find(t=>t.id===a.type);return<div key={a.type} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",fontSize:12,borderBottom:"1px solid rgba(255,255,255,0.03)"}}><span onClick={()=>openLi(a)} style={{color:"#ccc",cursor:"pointer",flex:1}}>{lt?.i} {lt?.l} {a.note&&<span style={{color:"#666",fontSize:10}}>({a.note})</span>} <span style={{color:"#555",fontSize:9}}>✎</span></span><div style={{display:"flex",alignItems:"center",gap:8}}><span onClick={()=>openLi(a)} style={{fontFamily:"monospace",color:lt?.c,fontWeight:600,cursor:"pointer"}}>¥{a.amount.toLocaleString()}</span><button onClick={()=>delLi(a.id)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:0}}>×</button></div></div>;})}</div>}
          {D.assetHist.length>1&&<div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 4px",color:"#bbb"}}>📈 純資産の推移</h3><ResponsiveContainer width="100%" height={130}><AreaChart data={D.assetHist.map((h:any)=>({name:h.date.slice(5),value:h.net??h.total}))} margin={{top:8,right:8,left:-20,bottom:0}}><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3498DB" stopOpacity={0.3}/><stop offset="95%" stopColor="#3498DB" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="name" tick={{fill:"#888",fontSize:9}} axisLine={false} tickLine={false}/><YAxis hide/><Tooltip content={<TT/>}/><Area type="monotone" dataKey="value" stroke="#3498DB" fill="url(#ag)" strokeWidth={2} name="純資産"/></AreaChart></ResponsiveContainer></div>}
          <div style={cs()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3 style={{fontSize:12,fontWeight:600,margin:0,color:"#FFB347"}}>🎯 貯金目標</h3><button onClick={()=>{sfGA(String(D.goal.target||""));sfGL(D.goal.label);sfNWA(String(D.goal.nw||""));sShG(true);}} style={{background:"rgba(255,179,71,0.1)",border:"1px solid rgba(255,179,71,0.2)",color:"#FFB347",padding:"3px 8px",borderRadius:5,fontSize:10,cursor:"pointer",fontWeight:600}}>{D.goal.target>0?"変更":"設定"}</button></div>{D.goal.target>0&&<div style={{marginTop:8}}><div style={{height:10,background:"rgba(255,255,255,0.06)",borderRadius:5,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:gP+"%",background:gP>=100?"#2ECC71":"linear-gradient(90deg,#3498DB,#2ECC71)",borderRadius:5}}/></div><div style={{fontSize:10,color:"#888"}}>{gP.toFixed(0)}%（¥{yD.yB.toLocaleString()} / ¥{D.goal.target.toLocaleString()}）</div></div>}</div>
        </div>)}

        {pg==="list"&&(<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"0 0 4px"}}>
            <h2 style={{fontSize:16,fontWeight:700,margin:0,color:"#eee"}}>📋 明細 ({cm})</h2>
            {allE.some((t:any)=>t.category==="その他")&&<button onClick={reCat} style={{background:"rgba(155,89,182,0.1)",border:"1px solid rgba(155,89,182,0.25)",color:"#9B59B6",padding:"4px 10px",borderRadius:6,fontSize:10,cursor:"pointer",fontWeight:600}}>🪄 その他を再仕分け</button>}
          </div>
          <p style={{fontSize:9,color:"#666",margin:"0 0 10px"}}>💳{md.cardExp?.length||0} + ✏️{md.manualExp?.length||0} = {allE.length}件 ・ カテゴリをタップで変更→同じ店は次回から自動仕分け</p>
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
          <div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 6px",color:"#ccc"}}>💳 明細アップロード</h3><p style={{fontSize:11,color:"#999",margin:"0 0 8px"}}>カード会社の明細（CSV / PDF）をアップロードして取引を追加できます。重複は自動でスキップされ、何度でも蓄積できます。</p><button onClick={()=>sShUp(true)} style={{background:"rgba(52,152,219,0.1)",border:"1px solid rgba(52,152,219,0.2)",color:"#3498DB",padding:"8px 0",borderRadius:8,fontSize:12,cursor:"pointer",width:"100%",fontWeight:600}}>📄 明細をアップロード</button></div>
          <div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 6px",color:"#ccc"}}>💼 収入一覧 ({cm})</h3>{md.incomes.length===0&&<p style={{fontSize:10,color:"#666",margin:0}}>未登録</p>}{md.incomes.map((inc:any)=>{const t=IT.find(x=>x.id===inc.type)||IT[4];return(<div key={inc.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",fontSize:11}}><span style={{color:"#ccc"}}>{t.i} {t.l} {inc.note&&<span style={{color:"#666"}}>({inc.note})</span>}</span><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontFamily:"monospace",color:t.c,fontWeight:600}}>¥{inc.amount.toLocaleString()}</span><button onClick={()=>uM((m:any)=>({...m,incomes:m.incomes.filter((i:any)=>i.id!==inc.id)}))} style={{background:"none",border:"none",color:"#555",cursor:"pointer"}}>×</button></div></div>);})}</div>
          <div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 6px",color:"#ccc"}}>💾 データのバックアップ</h3><p style={{fontSize:11,color:"#999",margin:"0 0 10px",lineHeight:1.6}}>データはこの端末のブラウザ内にだけ保存されます。機種変更やキャッシュ削除で消えないよう、定期的にファイルへ書き出して保管してください。別の端末へ引っ越す時も使えます。</p><div style={{display:"flex",gap:8}}><button onClick={exportData} style={{flex:1,background:"rgba(46,204,113,0.1)",border:"1px solid rgba(46,204,113,0.2)",color:"#2ECC71",padding:"9px 0",borderRadius:8,fontSize:12,cursor:"pointer",fontWeight:600}}>⬇️ 書き出し</button><button onClick={()=>{const inp=document.createElement("input");inp.type="file";inp.accept=".json,application/json";inp.onchange=(e:any)=>e.target.files[0]&&importData(e.target.files[0]);inp.click();}} style={{flex:1,background:"rgba(52,152,219,0.1)",border:"1px solid rgba(52,152,219,0.2)",color:"#3498DB",padding:"9px 0",borderRadius:8,fontSize:12,cursor:"pointer",fontWeight:600}}>⬆️ 読み込み</button></div></div>
          <button onClick={()=>{if(confirm("全データをリセット？（先にバックアップの書き出しをおすすめします）")) sD(freshState());}} style={{background:"rgba(231,76,60,0.08)",border:"1px solid rgba(231,76,60,0.2)",color:"#E74C3C",padding:"10px 0",borderRadius:10,fontSize:11,cursor:"pointer",width:"100%",marginTop:8}}>🗑️ リセット</button>
        </div>)}
      </div>

      {/* Nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#0f0f22",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"center",paddingBottom:"env(safe-area-inset-bottom,0px)",zIndex:50}}>
        <div style={{display:"flex",maxWidth:480,width:"100%"}}>{[{id:"home",ic:"🏠",l:"ホーム"},{id:"statement",ic:"📑",l:"決算書"},{id:"assets",ic:"💎",l:"資産"},{id:"list",ic:"📋",l:"明細"},{id:"more",ic:"⚙️",l:"設定"}].map(n=><button key={n.id} onClick={()=>{sPg(n.id);sEI(null);}} style={{flex:1,background:"none",border:"none",padding:"8px 0 6px",cursor:"pointer",color:pg===n.id?"#FF6B6B":"#666",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}><span style={{fontSize:17}}>{n.ic}</span><span style={{fontSize:8,fontWeight:pg===n.id?600:400}}>{n.l}</span></button>)}</div>
      </div>

      {/* Modals */}
      <BS open={shI} onClose={()=>sShI(false)} title="💼 収入を追加"><div style={{marginBottom:12}}><label style={{fontSize:10,color:"#888",display:"block",marginBottom:5}}>種類</label><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{IT.map(t=><button key={t.id} onClick={()=>sfIT(t.id)} style={{padding:"7px 12px",borderRadius:8,fontSize:11,cursor:"pointer",fontFamily:"inherit",background:fIT===t.id?t.c+"20":"rgba(255,255,255,0.04)",border:"1px solid "+(fIT===t.id?t.c+"50":"#333"),color:fIT===t.id?t.c:"#aaa"}}>{t.i} {t.l}</button>)}</div></div><FI label="金額" type="amount" value={fIA} onChange={sfIA}/><FI label="メモ" value={fIN} onChange={sfIN} placeholder="例: フリーランス"/><button onClick={addI} style={B1}>追加</button></BS>

      <BS open={shE} onClose={()=>sShE(false)} title="💸 支出を追加"><FI label="カテゴリ" type="select" value={fEC} onChange={sfEC}>{Object.entries(EC).map(([c,v])=><option key={c} value={c}>{v.i} {c}</option>)}</FI><FI label="金額" type="amount" value={fEA} onChange={sfEA}/><FI label="日付" value={fED} onChange={sfED} placeholder="例: 03/15"/><FI label="内容" value={fEN} onChange={sfEN} placeholder="例: ランチ代"/><button onClick={addE} style={B1}>追加</button></BS>

      <BS open={shUp} onClose={()=>sShUp(false)} title="💳 明細をアップロード">
        <p style={{fontSize:12,color:"#bbb",margin:"0 0 8px",lineHeight:1.6}}>カード会社からダウンロードした明細（CSV / PDF）を選択してください。今表示中の月「{cm}」に追加されます。</p>
        <p style={{fontSize:10,color:"#777",margin:"0 0 12px",lineHeight:1.6}}>※ 同じ取引（日付・金額・内容が一致）は自動でスキップされるので、何度アップロードしても重複しません。PDFは文字情報のあるもののみ対応（画像スキャンは不可）。</p>
        <div onClick={()=>{if(upL)return;const inp=document.createElement("input");inp.type="file";inp.accept=".csv,.tsv,.txt,.pdf,application/pdf";inp.onchange=(e:any)=>e.target.files[0]&&handleUpload(e.target.files[0]);inp.click();}}
          style={{border:"2px dashed #333",borderRadius:14,padding:"28px 16px",textAlign:"center",cursor:"pointer",background:"rgba(255,255,255,0.02)",marginBottom:12}}>
          {upL?<div><div style={{fontSize:28}}>⏳</div><p style={{color:"#999",fontSize:12,margin:"6px 0 0"}}>読み取り中...</p></div>
          :<div><div style={{fontSize:28}}>📄</div><p style={{color:"#ccc",fontSize:13,margin:"6px 0 4px",fontWeight:600}}>タップして選択</p><p style={{color:"#888",fontSize:11,margin:0}}>CSV / TSV / PDF</p></div>}
        </div>
        {upR&&<div style={{padding:10,borderRadius:8,background:/^[✅ℹ]/.test(upR)?"rgba(46,204,113,0.1)":"rgba(255,80,80,0.1)",color:upR.startsWith("✅")?"#2ECC71":upR.startsWith("ℹ️")?"#3498DB":"#FF6B6B",fontSize:12}}>{upR}</div>}
      </BS>

      <BS open={shA} onClose={()=>sShA(false)} title={eAsId?"💎 資産を編集":"💎 資産を追加"}><p style={{fontSize:10,color:"#888",margin:"0 0 12px"}}>{eAsId?"金額・メモを変更できます。":"同じ種類は最新の残高で上書きされます。"}</p><FI label="種類" type="select" value={fAT} onChange={sfAT}>{AT.map(t=><option key={t.id} value={t.id}>{t.i} {t.l}</option>)}</FI><FI label="残高" type="amount" value={fAA} onChange={sfAA}/><FI label="メモ" value={fAN} onChange={sfAN} placeholder="例: SBI証券"/><button onClick={addAs} style={B1}>{eAsId?"保存":"追加"}</button></BS>
      <BS open={shL} onClose={()=>sShL(false)} title={eLiId?"💳 負債を編集":"💳 負債を追加"}><p style={{fontSize:10,color:"#888",margin:"0 0 12px"}}>{eLiId?"金額・メモを変更できます。":"ローン残高やカード未払い分などを入力します。同じ種類は上書きされます。"}</p><FI label="種類" type="select" value={fLT} onChange={sfLT}>{LT.map(t=><option key={t.id} value={t.id}>{t.i} {t.l}</option>)}</FI><FI label="残高" type="amount" value={fLA} onChange={sfLA}/><FI label="メモ" value={fLN} onChange={sfLN} placeholder="例: 〇〇銀行 住宅ローン"/><button onClick={addLi} style={{...B1,background:"linear-gradient(135deg,#FF6B6B,#E74C3C)"}}>{eLiId?"保存":"追加"}</button></BS>
      <BS open={shG} onClose={()=>sShG(false)} title="🎯 目標を設定"><FI label="目標純資産額（資産−負債）" type="amount" value={fNWA} onChange={sfNWA} placeholder="例: 10000000"/><div style={{borderTop:"1px dashed rgba(255,255,255,0.1)",margin:"4px 0 12px"}}/><FI label="年間の貯蓄目標額" type="amount" value={fGA} onChange={sfGA} placeholder="例: 1000000"/><FI label="目標名（貯蓄）" value={fGL} onChange={sfGL} placeholder="例: 旅行資金"/><button onClick={()=>{sD((p:any)=>({...p,goal:{target:Number(fGA)||0,label:fGL,nw:Number(fNWA)||0}}));sShG(false);}} style={B1}>設定</button></BS>

      <BS open={shM} onClose={()=>sShM(false)} title="📅 月を選択・追加">
        {Object.keys(D.months).sort().map(k=><button key={k} onClick={()=>{sD((p:any)=>({...p,cur:k}));sShM(false);}} style={{display:"block",width:"100%",padding:"10px 12px",marginBottom:4,borderRadius:8,fontSize:13,cursor:"pointer",textAlign:"left",background:k===cm?"rgba(255,107,107,0.12)":"rgba(255,255,255,0.03)",border:"1px solid "+(k===cm?"rgba(255,107,107,0.25)":"#333"),color:k===cm?"#FF6B6B":"#ccc"}}>📅 {k} {k===cm&&"（表示中）"}</button>)}
        <div style={{marginTop:12}}><FI label="新しい月（YYYY-MM）" value={fNM} onChange={sfNM} placeholder="例: 2026-04"/><button onClick={()=>{if(!fNM)return;sD((p:any)=>({...p,months:{...p.months,[fNM]:p.months[fNM]||{incomes:[],manualExp:[],cardExp:[]}},cur:fNM}));sfNM("");sShM(false);}} style={B1}>追加して切替</button></div>
      </BS>
    </div>
  );
}

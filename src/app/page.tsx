"use client";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

// ═══ Storage ═══
// v5: デモデータ入りのv4を破棄して全ユーザーまっさらな状態から開始
function LD() { try { const s = localStorage.getItem("kakeibo-v5"); return s ? JSON.parse(s) : null; } catch { return null; } }
function SV(d: any) { try { localStorage.setItem("kakeibo-v5", JSON.stringify(d)); return true; } catch { return false; } }

// ═══ Categories（組み込み。ユーザー定義・上書きは D.cats とマージして使う）═══
const ECB: Record<string, { i: string; c: string; t: string }> = {
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
  //    誤爆防止: 完全一致 → 「取引名がルール名を含む」片方向のみ・3文字以上・最長一致
  if (rules) {
    if (rules[d]) return rules[d];
    let best = "";
    for (const k in rules) { if (k.length >= 3 && d.includes(k) && k.length > best.length) best = k; }
    if (best) return rules[best];
  }
  // ② キーワード辞書
  for (const [cat, kws] of CAT_KW) {
    if (kws.some(x => d.includes(kanaNorm(x)))) return cat;
  }
  return "その他";
}
// 引用符対応のCSV行分割（"12,340" のようなカンマ入り金額・店名を壊さない）
function splitCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i+1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else { if (ch === '"') q = true; else if (ch === "," || ch === "\t") { out.push(cur); cur = ""; } else cur += ch; }
  }
  out.push(cur);
  return out.map(f => f.trim());
}
function parseCSV(text: string, rules?: Record<string, string>): any[] {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const txns: any[] = [];
  for (const line of lines) {
    const fields = splitCsvLine(line).filter(Boolean);
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
      // 年付きの日付なら所属月(YYYY-MM)を持たせる（アップロード時の自動振り分けに使用）
      const fm = date.match(/(\d{4})[\/\-](\d{1,2})[\/\-]\d{1,2}/);
      const ym = fm ? fm[1]+"-"+fm[2].padStart(2,"0") : null;
      txns.push({ id: Date.now()+Math.random()*1e4, date: date.length>5?date.slice(5):date, description: desc||"不明", amount, category: autoCategory(desc, rules), source:"card", ym });
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
    const ym = dm[1] + "-" + dm[2].padStart(2, "0"); // 所属月（自動振り分け用）
    txns.push({ id: Date.now() + Math.random() * 1e4, date, description: store || "不明", amount, category: autoCategory(store, rules), source: "card", ym });
  }
  return txns;
}

// ═══ 初期状態（デモデータなし・まっさらな状態から開始）═══
const DEF = { months:{} as any, cur:"", assets:[] as any[], liabilities:[] as any[], assetHist:[] as any[], goal:{target:0,label:""}, rules:{} as Record<string,string>, budget:{total:0,cat:{} as Record<string,number>}, cats:{} as Record<string,{i:string;c:string;t:string}> };
// ローカル時刻基準の年月・年月日（UTC基準だと日本の月初0時〜9時に月がズレる）
const localYM = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const localYMD = (d = new Date()) => `${localYM(d)}-${String(d.getDate()).padStart(2,"0")}`;
const freshState = () => { const m = localYM(); return { ...DEF, months:{ [m]: { incomes:[] as any[], manualExp:[] as any[], cardExp:[] as any[] } }, cur:m }; };
// 読み込んだデータのcurが欠落・不正なら最新の月に補正（旧形式バックアップ対策）
const fixCur = (o: any) => {
  const keys = Object.keys(o.months||{}).filter(k=>/^\d{4}-\d{2}$/.test(k)).sort();
  if (o.cur && o.months?.[o.cur]) return o.cur;
  return keys[keys.length-1] || localYM();
};

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
  // ③ 予算の進捗
  if (x.bud?.total > 0) {
    const rem = x.bud.total - x.bud.spent;
    if (rem < 0) t.push({ty:"danger",i:"🧯",tx:`月予算¥${x.bud.total.toLocaleString()}を¥${Math.abs(rem).toLocaleString()}超過。来月の予算配分を見直しましょう。`});
    else if (rem <= x.bud.total*0.2) t.push({ty:"warn",i:"⏳",tx:`予算残り¥${rem.toLocaleString()}（${(rem/x.bud.total*100).toFixed(0)}%）。${x.bud.perDay>0?`1日¥${x.bud.perDay.toLocaleString()}以内でクリアできます。`:"ラストスパート！"}`});
    else t.push({ty:"good",i:"🛡️",tx:`予算内で推移中。残り¥${rem.toLocaleString()}${x.bud.perDay>0?`（1日¥${x.bud.perDay.toLocaleString()}使えるペース）`:""}。`});
  }
  if (x.overCat) t.push({ty:"warn",i:"📌",tx:`「${x.overCat[0]}」がカテゴリ予算を¥${x.overCat[1].toLocaleString()}超過しています。`});
  // ④ 固定費率
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
  if (x.isPeak) t.push({ty:"good",i:"🏔️",tx:"純資産が過去最高を更新中！可視化の成果が出ています。"});
  if (x.histUp > 0) t.push({ty:"good",i:"🚀",tx:`純資産が前回更新から＋¥${x.histUp.toLocaleString()}。確実に前進しています！`});
  if (x.nwTgt > 0 && x.netW < x.nwTgt) t.push({ty:"info",i:"🎯",tx:`目標純資産まであと¥${(x.nwTgt - x.netW).toLocaleString()}（達成率${x.nwP.toFixed(0)}%）。`});
  else if (x.nwTgt > 0) t.push({ty:"good",i:"👑",tx:"目標純資産を達成！おめでとうございます。次の目標を設定しましょう。"});
  // ⑦ 曜日の傾向
  if (x.weekendShare != null && tE > 20000 && x.weekendShare >= 0.55) t.push({ty:"info",i:"🛍",tx:`支出の${Math.round(x.weekendShare*100)}%が週末に集中。お出かけ前に「今日の上限」を決めると効きます。`});
  // ⑧ 予算の提案（未設定で先月データがあるとき）
  if (!x.bud && x.prevTE > 0) t.push({ty:"info",i:"📏",tx:`先月の支出は¥${x.prevTE.toLocaleString()}。ホームから今月の予算を設定すると「あと使える額」が見えます。`});
  // ⑨ データ保護の案内
  if (x.backup) t.push({ty:"info",i:"💾",tx:x.backup.days==null?"データはこの端末だけに保存されています。設定からバックアップを書き出しておくと安心です。":`最後のバックアップから${x.backup.days}日経過。設定から書き出しておきましょう。`});
  return t;
}
// 数字がヌルッと増えるカウントアップ（モチベーション演出・軽量）
function useCountUp(v: number, dur = 550) {
  const [x, sX] = useState(v); const disp = useRef(v);
  useEffect(() => {
    const from = disp.current, to = v; if (from === to) return; // 表示中の値から滑らかに継続（連続更新でも跳ばない）
    const t0 = performance.now(); let raf = 0;
    const step = (t: number) => { const p = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - p, 3); const cur = Math.round(from + (to - from) * e); disp.current = cur; sX(cur); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [v, dur]);
  return x;
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
  const [shUp,sShUp]=useState(false); const [shL,sShL]=useState(false); const [eI,sEI]=useState<number|null>(null); const [shHow,sShHow]=useState(false); const [shPriv,sShPriv]=useState(false);
  const [shB,sShB]=useState(false); const [fBT,sfBT]=useState(""); const [fBC,sfBC]=useState<Record<string,string>>({});
  const [q,sQ]=useState(""); const [fCat,sFCat]=useState(""); const [sortBy,sSortBy]=useState<"date"|"amount">("date");
  const [shT,sShT]=useState(false); const [eTx,sETx]=useState<any>(null);
  const [fTD,sfTD]=useState(""); const [fTN,sfTN]=useState(""); const [fTA,sfTA]=useState(""); const [fTC,sfTC]=useState("その他");
  const [toast,sToast]=useState<string|null>(null); const toastT=useRef<any>(null);
  const showToast=useCallback((msg:string)=>{sToast(msg);clearTimeout(toastT.current);toastT.current=setTimeout(()=>sToast(null),2200);},[]);
  // 日またぎ・アプリ復帰時に「今日」を更新（予算の残り日数/1日ペースを最新に保つ）
  const [dayKey,sDayKey]=useState("");
  useEffect(()=>{const u=()=>sDayKey(new Date().toDateString());u();window.addEventListener("focus",u);document.addEventListener("visibilitychange",u);return()=>{window.removeEventListener("focus",u);document.removeEventListener("visibilitychange",u);};},[]);
  // 組み込みカテゴリ＋ユーザー定義/上書き（D.cats）をマージ。以降このECを参照する
  const EC=useMemo(()=>{const m:Record<string,{i:string;c:string;t:string}>={...ECB};Object.entries((D as any).cats||{}).forEach(([k,v]:any)=>{m[k]={...(m[k]||{i:"🏷️",c:"#95A5A6",t:"v"}),...v};});return m;},[D]);
  // カテゴリ管理モーダル
  const [shCat,sShCat]=useState(false); const [eCat,sECat]=useState<string|null>(null);
  const [fCN,sfCN]=useState(""); const [fCI,sfCI]=useState("🏷️"); const [fCCo,sfCCo]=useState("#4ECDC4"); const [fCT,sfCT]=useState("v");
  const [upR,sUpR]=useState(""); const [upL,sUpL]=useState(false); const [upMode,sUpMode]=useState<"auto"|"cur">("auto");
  const [fIT,sfIT]=useState("salary"); const [fIA,sfIA]=useState(""); const [fIN,sfIN]=useState(""); const [eInId,sEInId]=useState<number|null>(null);
  const [fEC,sfEC]=useState("食費（自炊）"); const [fEA,sfEA]=useState(""); const [fEN,sfEN]=useState(""); const [fED,sfED]=useState("");
  const [fAT,sfAT]=useState("savings"); const [fAA,sfAA]=useState(""); const [fAN,sfAN]=useState("");
  const [fLT,sfLT]=useState("loan_home"); const [fLA,sfLA]=useState(""); const [fLN,sfLN]=useState("");
  const [eAsId,sEAsId]=useState<number|null>(null); const [eLiId,sELiId]=useState<number|null>(null);
  const [fGA,sfGA]=useState(""); const [fGL,sfGL]=useState(""); const [fNWA,sfNWA]=useState(""); const [fNM,sfNM]=useState("");

  useEffect(()=>{const s=LD();if(s?.months&&Object.keys(s.months).length){const cur=fixCur(s);const months={...s.months};if(!months[cur])months[cur]={incomes:[],manualExp:[],cardExp:[]};sD({...DEF,...s,months,cur,assets:s.assets||[],liabilities:s.liabilities||[],assetHist:s.assetHist||[],rules:s.rules||{},budget:s.budget||{total:0,cat:{}},cats:s.cats||{}});} else sD(freshState()); sRdy(true);},[]);
  useEffect(()=>{if(rdy&&!SV(D)) showToast("⚠️ 保存できませんでした。端末の空き容量やプライベートモードをご確認ください");},[D,rdy,showToast]);
  // PWAショートカット（アイコン長押し）からの起動: /?p=exp|list|st
  useEffect(()=>{if(!rdy)return;const p=new URLSearchParams(window.location.search).get("p");if(!p)return;
    if(p==="exp"){sPg("home");sShE(true);}else if(p==="list")sPg("list");else if(p==="st")sPg("statement");
    window.history.replaceState(null,"","/");},[rdy]);

  const cm=D.cur; const md=D.months[cm]||{incomes:[],manualExp:[],cardExp:[]};
  const allE=useMemo(()=>[...(md.cardExp||[]),...(md.manualExp||[])],[md]);
  const tI=useMemo(()=>md.incomes.reduce((s:number,i:any)=>s+i.amount,0),[md.incomes]);
  const tE=useMemo(()=>allE.reduce((s:number,e:any)=>s+e.amount,0),[allE]);
  const bal=tI-tE;
  const bC=useMemo(()=>{const m:any={}; allE.forEach((t:any)=>{if(!m[t.category]) m[t.category]={total:0,count:0,items:[]};m[t.category].total+=t.amount;m[t.category].count++;m[t.category].items.push(t);}); return m;},[allE]);
  const fxT=useMemo(()=>allE.filter((t:any)=>EC[t.category]?.t==="f").reduce((s:number,t:any)=>s+t.amount,0),[allE]);
  const srt=useMemo(()=>Object.entries(bC).sort((a:any,b:any)=>b[1].total-a[1].total),[bC]);
  const yD=useMemo(()=>{
    const y=cm.slice(0,4);const ms=Object.entries(D.months).filter(([k])=>k.startsWith(y)).sort((a,b)=>a[0].localeCompare(b[0]));
    let yI=0,yE=0,mCount=0;const catY:Record<string,number>={};
    const ch=ms.map(([k,v]:any)=>{
      const exps=[...(v.cardExp||[]),...(v.manualExp||[])];
      const i=v.incomes.reduce((s:number,x:any)=>s+x.amount,0);
      const e=exps.reduce((s:number,x:any)=>s+x.amount,0);
      exps.forEach((x:any)=>{catY[x.category]=(catY[x.category]||0)+x.amount;});
      if(i>0||e>0)mCount++;
      yI+=i;yE+=e;return{name:k.slice(5)+"月",income:i,expense:e,cumI:yI,cumE:yE,sr:i>0?Math.max(0,Math.round((i-e)/i*100)):null};
    });
    const catTop=Object.entries(catY).sort((a,b)=>b[1]-a[1]).slice(0,3);
    return{y,yI,yE,yB:yI-yE,ch,mCount,catTop};
  },[D.months,cm]);
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
  // ── 予算の進捗（今月なら「1日あたり使えるペース」も算出）──
  const budCfg=D.budget||{total:0,cat:{}};
  const bud=useMemo(()=>{
    const total=budCfg.total||0;const catB=budCfg.cat||{};
    if(!total&&!Object.keys(catB).length)return null;
    let perDay=0,daysLeft=0;
    const now=new Date();const curKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    if(cm===curKey){const [y,m]=cm.split("-").map(Number);const dim=new Date(y,m,0).getDate();daysLeft=dim-now.getDate()+1;const rem=total-tE;if(total>0&&rem>0&&daysLeft>0)perDay=Math.floor(rem/daysLeft);}
    const overCats=Object.entries(catB).map(([c,b]:any)=>[c,(bC[c]?.total||0)-b] as [string,number]).filter(([,d])=>d>0).sort((a,b)=>b[1]-a[1]);
    return{total,spent:tE,perDay,daysLeft,catB,overCats};
  },[budCfg,cm,tE,bC,dayKey]);
  const advCtx=useMemo(()=>{
    const ups=catDelta.filter(([,d])=>d>0),downs=catDelta.filter(([,d])=>d<0);
    const h=D.assetHist;let histUp=0,isPeak=false;
    if(h.length>=2){const a=h[h.length-1],b=h[h.length-2];const dv=(a.net??a.total??0)-(b.net??b.total??0);if(dv>0)histUp=dv;
      const last=a.net??a.total??0;const prevMax=Math.max(...h.slice(0,-1).map((z:any)=>z.net??z.total??0));if(last>prevMax&&last>0)isPeak=true;}
    // バックアップの鮮度（データがあるのに30日以上 or 一度も書き出していない場合に案内）
    let backup:any=null;
    const totalTx=Object.values(D.months).reduce((s:number,v:any)=>s+((v.cardExp||[]).length+(v.manualExp||[]).length),0);
    if(totalTx>0){
      if(!(D as any).lastBackup) backup={days:null};
      else{const days=Math.floor((Date.now()-new Date((D as any).lastBackup).getTime())/86400000);if(days>=30)backup={days};}
    }
    // 週末にどれだけ使っているか
    let weekendShare:number|null=null;
    if(tE>0&&cm){const [yy]=cm.split("-").map(Number);let wk=0;allE.forEach((t:any)=>{const m=String(t.date||"").match(/(\d{1,2})[\/\-](\d{1,2})/);if(!m)return;const day=new Date(yy,parseInt(m[1],10)-1,parseInt(m[2],10)).getDay();if(day===0||day===6)wk+=t.amount;});weekendShare=wk/tE;}
    return{prevTE:prev.tE,prevTI:prev.tI,fxT,netW,nwTgt,nwP,histUp,isPeak,backup,weekendShare,
      bud:bud&&bud.total>0?{total:bud.total,spent:bud.spent,perDay:bud.perDay}:null,
      overCat:bud?.overCats?.[0]||null,
      upCat:ups.length&&ups[0][1]>=3000?[ups[0][0],ups[0][1]]:null,
      downCat:downs.length&&-downs[0][1]>=3000?[downs[0][0],-downs[0][1]]:null};
  },[prev,catDelta,fxT,netW,nwTgt,nwP,D.assetHist,bud,D.months,D,allE,tE,cm]);
  const balA=useCountUp(bal); const netWA=useCountUp(netW);
  // 完全に空の状態か（初回ガイド表示用）
  const isEmpty=useMemo(()=>{
    const anyTx=Object.values(D.months).some((v:any)=>((v.cardExp||[]).length+(v.manualExp||[]).length+(v.incomes||[]).length)>0);
    return !anyTx&&(D.assets||[]).length===0&&(D.liabilities||[]).length===0;
  },[D.months,D.assets,D.liabilities]);
  // ── 実績バッジ（続けること自体を褒める）──
  const badges=useMemo(()=>{
    const out:string[]=[];
    const keys=Object.keys(D.months).sort();
    let streak=0;
    for(let i=keys.length-1;i>=0;i--){const k=keys[i];if(k>cm)continue;const mm=D.months[k];
      const inc=(mm.incomes||[]).reduce((s:number,x:any)=>s+x.amount,0);
      const ex=[...(mm.cardExp||[]),...(mm.manualExp||[])].reduce((s:number,x:any)=>s+x.amount,0);
      if(inc>0&&inc-ex>=0)streak++;else break;}
    if(streak>=2)out.push(`🔥 ${streak}ヶ月連続黒字`);
    let rec=0,k=cm;
    while(D.months[k]&&(((D.months[k].cardExp||[]).length+(D.months[k].manualExp||[]).length+(D.months[k].incomes||[]).length)>0)){rec++;const [y,m]=k.split("-").map(Number);k=m===1?`${y-1}-12`:`${y}-${String(m-1).padStart(2,"0")}`;}
    if(rec>=2)out.push(`📝 記録${rec}ヶ月継続`);
    const h=D.assetHist;
    if(h.length>=2){const last=h[h.length-1].net??h[h.length-1].total??0;const prevMax=Math.max(...h.slice(0,-1).map((z:any)=>z.net??z.total??0));if(last>prevMax&&last>0)out.push("🏔️ 純資産 過去最高");}
    return out;
  },[D.months,D.assetHist,cm]);
  const adv=useMemo(()=>genAdvice(tI,tE,bC,advCtx),[tI,tE,bC,advCtx]);

  const uM=(fn:any)=>sD((p:any)=>({...p,months:{...p.months,[cm]:fn(p.months[cm]||{incomes:[],manualExp:[],cardExp:[]})}}));
  const shiftMonth=(dir:number)=>{if(!cm)return;const [y,m]=cm.split("-").map(Number);const d=new Date(y,(m-1)+dir,1);const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;sD((p:any)=>({...p,months:{...p.months,[k]:p.months[k]||{incomes:[],manualExp:[],cardExp:[]}},cur:k}));};
  const openIn=(inc?:any)=>{if(inc){sfIT(inc.type);sfIA(String(inc.amount));sfIN(inc.note||"");sEInId(inc.id);}else{sfIT("salary");sfIA("");sfIN("");sEInId(null);}sShI(true);};
  const addI=()=>{if(!fIA||Number(fIA)<=0)return;
    if(eInId!=null){uM((m:any)=>({...m,incomes:m.incomes.map((i:any)=>i.id===eInId?{...i,type:fIT,amount:Number(fIA),note:fIN}:i)}));showToast("✏️ 収入を更新しました");}
    else{uM((m:any)=>({...m,incomes:[...m.incomes,{type:fIT,amount:Number(fIA),note:fIN,id:Date.now()}]}));showToast(`✅ 収入 ¥${Number(fIA).toLocaleString()} を追加しました`);}
    sfIA("");sfIN("");sEInId(null);sShI(false);};
  // 支出は連続入力できるようモーダルを閉じない（金額・内容だけクリア）
  const addE=()=>{if(!fEA||Number(fEA)<=0)return;const d=fED||new Date().toLocaleDateString("ja-JP",{month:"2-digit",day:"2-digit"});uM((m:any)=>({...m,manualExp:[...m.manualExp,{date:d,description:fEN||fEC,amount:Number(fEA),category:fEC,source:"manual",id:Date.now()}]}));showToast(`✅ ¥${Number(fEA).toLocaleString()} を追加（続けて入力できます）`);sfEA("");sfEN("");};
  const snap=(p:any,assets:any[],liabs:any[])=>{const now=localYMD();const a=assets.reduce((s:number,x:any)=>s+x.amount,0);const l=liabs.reduce((s:number,x:any)=>s+x.amount,0);return[...(p.assetHist||[]),{date:now,assets:a,liab:l,net:a-l,total:a}].slice(-120);};
  const openAs=(a?:any)=>{if(a){sfAT(a.type);sfAA(String(a.amount));sfAN(a.note||"");sEAsId(a.id);}else{sfAT("savings");sfAA("");sfAN("");sEAsId(null);}sShA(true);};
  const openLi=(a?:any)=>{if(a){sfLT(a.type);sfLA(String(a.amount));sfLN(a.note||"");sELiId(a.id);}else{sfLT("loan_home");sfLA("");sfLN("");sELiId(null);}sShL(true);};
  const addAs=()=>{if(!fAA)return;
    // 編集中に種類を変えた結果、既存の同種資産を置き換えることになる場合は確認を挟む
    const clash=(D.assets||[]).find((a:any)=>a.type===fAT&&a.id!==eAsId);
    if(eAsId!=null&&clash&&!confirm(`同じ種類の登録（¥${clash.amount.toLocaleString()}）がすでにあります。置き換えますか？`))return;
    sD((p:any)=>{const na=[...(p.assets||[]).filter((a:any)=>a.id!==eAsId&&a.type!==fAT),{type:fAT,amount:Number(fAA),note:fAN,id:eAsId||Date.now()}];return{...p,assets:na,assetHist:snap(p,na,p.liabilities||[])};});showToast("✅ 資産を更新しました");sfAA("");sfAN("");sEAsId(null);sShA(false);};
  const addLi=()=>{if(!fLA)return;
    const clash=(D.liabilities||[]).find((a:any)=>a.type===fLT&&a.id!==eLiId);
    if(eLiId!=null&&clash&&!confirm(`同じ種類の登録（¥${clash.amount.toLocaleString()}）がすでにあります。置き換えますか？`))return;
    sD((p:any)=>{const nl=[...(p.liabilities||[]).filter((a:any)=>a.id!==eLiId&&a.type!==fLT),{type:fLT,amount:Number(fLA),note:fLN,id:eLiId||Date.now()}];return{...p,liabilities:nl,assetHist:snap(p,p.assets||[],nl)};});showToast("✅ 負債を更新しました");sfLA("");sfLN("");sELiId(null);sShL(false);};
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
        // ── 行き先の月ごとにグループ化（自動＝取引の日付どおり / 手動＝表示中の月）──
        // 年なし日付(MM/DD)のCSVは表示中の月から年を推定（月が2つ以上先なら前年とみなす）
        const inferYm = (date:string) => {
          const m = String(date||"").match(/^(\d{1,2})[\/\-]\d{1,2}/); if (!m) return null;
          const mo = parseInt(m[1],10); if (!mo || mo > 12) return null;
          const [cy, cmo] = cm.split("-").map(Number); const y = (mo - cmo > 1) ? cy - 1 : cy;
          return `${y}-${String(mo).padStart(2,"0")}`;
        };
        const groups: Record<string, any[]> = {};
        for (const t of txns) {
          const key = (upMode==="auto") ? (t.ym || inferYm(t.date) || cm) : cm;
          const { ym, ...rest } = t;
          (groups[key] = groups[key] || []).push(rest);
        }
        // 月ごとに重複をスキップして追加
        // 既存件数ぶんだけスキップする方式：同ファイル内の「同日・同額・同店の正当な複数取引」は
        // すべて追加され、同じファイルの再アップロードは全件スキップされる
        const added: Record<string, number> = {}; let dup = 0;
        const fresh: Record<string, any[]> = {};
        for (const [key, list] of Object.entries(groups)) {
          const cnt = new Map<string, number>();
          (((D.months[key]?.cardExp) || []) as any[]).forEach((t:any)=>{const k=`${t.date}|${t.amount}|${t.description}`;cnt.set(k,(cnt.get(k)||0)+1);});
          for (const t of list) {
            const k = `${t.date}|${t.amount}|${t.description}`;
            const c = cnt.get(k) || 0;
            if (c > 0) { cnt.set(k, c - 1); dup++; continue; }
            (fresh[key] = fresh[key] || []).push(t);
          }
          if (fresh[key]?.length) added[key] = fresh[key].length;
        }
        const total = Object.values(added).reduce((s,n)=>s+n,0);
        if (total === 0) sUpR(`ℹ️ ${txns.length}件すべて登録済みでした（重複スキップ）。`);
        else {
          sD((p:any)=>{
            const months = {...p.months};
            for (const [key, list] of Object.entries(fresh)) {
              const m = months[key] || { incomes:[], manualExp:[], cardExp:[] };
              months[key] = { ...m, cardExp: [...(m.cardExp||[]), ...list] };
            }
            return { ...p, months };
          });
          const parts = Object.entries(added).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,n])=>`${k}へ${n}件`);
          sUpR(`✅ ${parts.join("、")}追加しました！${dup>0?`（重複${dup}件はスキップ）`:""}`);
        }
      }
    } catch(e:any) { sUpR("❌ 読み取りエラー: "+(e?.message||e)); }
    sUpL(false);
  };

  const dl=(content:BlobPart,mime:string,name:string)=>{const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);};
  const exportData=()=>{try{dl(JSON.stringify(D,null,2),"application/json",`kakeibo-backup-${localYMD()}.json`);sD((p:any)=>({...p,lastBackup:localYMD()}));showToast("💾 バックアップを書き出しました");}catch(e:any){alert("書き出しに失敗しました: "+e.message);}};
  // 全期間の明細をExcelで開けるCSVに（BOM付きUTF-8）
  const exportCSV=()=>{try{
    const rows:string[][]=[["月","日付","種別","内容","カテゴリ","金額"]];
    Object.entries(D.months).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([k,v]:any)=>{
      (v.incomes||[]).forEach((i:any)=>{const t=IT.find(x=>x.id===i.type);rows.push([k,"","収入",(t?.l||"収入")+(i.note?`（${i.note}）`:""),"",String(i.amount)]);});
      [...(v.cardExp||[]),...(v.manualExp||[])].forEach((t:any)=>rows.push([k,t.date||"",t.source==="card"?"カード":"手入力",t.description||"",t.category||"",String(t.amount)]));
    });
    const csv="\uFEFF"+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    dl(csv,"text/csv;charset=utf-8",`kakeibo-${localYMD()}.csv`);
    showToast("📊 CSVを書き出しました");
  }catch(e:any){alert("CSV書き出しに失敗しました: "+e.message);}};
  const importData=async(file:File)=>{try{const o=JSON.parse(await file.text());if(!o||typeof o!=="object"||!o.months){alert("❌ このアプリのバックアップファイル(JSON)ではないようです。");return;}if(!confirm("現在のデータを、選んだファイルの内容で置き換えます。よろしいですか？（先に今のデータを書き出しておくと安心です）"))return;const cur=fixCur(o);const months={...o.months};if(!months[cur])months[cur]={incomes:[],manualExp:[],cardExp:[]};sD({...DEF,...o,months,cur,assets:o.assets||[],liabilities:o.liabilities||[],assetHist:o.assetHist||[],goal:o.goal||{target:0,label:""},rules:o.rules||{},budget:o.budget||{total:0,cat:{}},cats:o.cats||{}});alert("✅ データを読み込みました！");}catch(e:any){alert("❌ 読み込みに失敗しました: "+e.message);}};

  // カテゴリ変更＝学習：同じ店名の取引を全て変更し、店名→カテゴリを記憶して次回の取込に反映
  const hCC=useCallback((tx:any,val:string)=>{
    if(!tx) return;
    const key=kanaNorm(tx.description||"");
    sD((p:any)=>{
      const m=p.months[p.cur]||{incomes:[],manualExp:[],cardExp:[]};
      const upd=(list:any[])=>(list||[]).map((x:any)=>kanaNorm(x.description||"")===key?{...x,category:val}:x);
      return {...p,rules:{...(p.rules||{}),[key]:val},months:{...p.months,[p.cur]:{...m,cardExp:upd(m.cardExp),manualExp:upd(m.manualExp)}}};
    });
    showToast(`🧠 「${(tx.description||"").slice(0,12)}」→ ${val} を学習しました`);
  },[showToast]);
  // 取引の編集・削除（card/manual両対応）
  const openTx=(t:any)=>{sETx(t);sfTD(t.date||"");sfTN(t.description||"");sfTA(String(t.amount||""));sfTC(t.category||"その他");sShT(true);};
  const saveTx=()=>{
    if(!eTx) return; const amt=Number(fTA); if(!amt||amt<=0) return;
    const upd=(list:any[])=>(list||[]).map((x:any)=>x.id===eTx.id?{...x,date:fTD||x.date,description:fTN||x.description,amount:amt,category:fTC}:x);
    uM((m:any)=>eTx.source==="card"?{...m,cardExp:upd(m.cardExp)}:{...m,manualExp:upd(m.manualExp)});
    showToast("✅ 取引を保存しました");
    sShT(false); sETx(null);
  };
  const delTx=(t:any)=>{
    if(!t) return;
    if(!confirm(`「${t.description}」¥${t.amount.toLocaleString()} を削除しますか？`)) return;
    uM((m:any)=>t.source==="card"?{...m,cardExp:(m.cardExp||[]).filter((x:any)=>x.id!==t.id)}:{...m,manualExp:(m.manualExp||[]).filter((x:any)=>x.id!==t.id)});
    sShT(false); sETx(null);
  };
  // ── カテゴリの作成・編集・削除（リネームは全データを移行）──
  const openCat=(name?:string)=>{
    if(name&&EC[name]){const c=EC[name];sECat(name);sfCN(name);sfCI(c.i);sfCCo(c.c);sfCT(c.t);}
    else{sECat(null);sfCN("");sfCI("🏷️");sfCCo("#4ECDC4");sfCT("v");}
    sShCat(true);
  };
  const saveCat=()=>{
    const name=fCN.trim();
    if(!name){alert("カテゴリ名を入力してください");return;}
    const isBuiltin=eCat!=null&&(eCat in ECB);
    const renamed=eCat!=null&&!isBuiltin&&name!==eCat;
    if((eCat==null||renamed)&&EC[name]){alert("同じ名前のカテゴリがすでにあります");return;}
    sD((p:any)=>{
      let months=p.months,rules=p.rules||{},budget=p.budget||{total:0,cat:{}};
      const cats={...(p.cats||{})};
      if(renamed&&eCat){
        months=Object.fromEntries(Object.entries(p.months).map(([k,v]:any)=>[k,{...v,
          cardExp:(v.cardExp||[]).map((x:any)=>x.category===eCat?{...x,category:name}:x),
          manualExp:(v.manualExp||[]).map((x:any)=>x.category===eCat?{...x,category:name}:x)}]));
        rules=Object.fromEntries(Object.entries(rules).map(([k,v]:any)=>[k,v===eCat?name:v]));
        if(budget.cat&&budget.cat[eCat]!=null){const bc={...budget.cat};bc[name]=bc[eCat];delete bc[eCat];budget={...budget,cat:bc};}
        delete cats[eCat];
      }
      cats[isBuiltin?(eCat as string):name]={i:fCI||"🏷️",c:fCCo||"#4ECDC4",t:fCT};
      return{...p,months,rules,budget,cats};
    });
    showToast(eCat?"✏️ カテゴリを更新しました":`🏷️ 「${name}」を追加しました`);
    sShCat(false);sECat(null);
  };
  const delCat=(name:string)=>{
    if(name in ECB){alert("標準カテゴリは削除できません（絵文字・色・固定/変動の変更は可能です）");return;}
    if(!confirm(`「${name}」を削除しますか？このカテゴリの取引は「その他」に変わります。`))return;
    sD((p:any)=>{
      const cats={...(p.cats||{})};delete cats[name];
      const months=Object.fromEntries(Object.entries(p.months).map(([k,v]:any)=>[k,{...v,
        cardExp:(v.cardExp||[]).map((x:any)=>x.category===name?{...x,category:"その他"}:x),
        manualExp:(v.manualExp||[]).map((x:any)=>x.category===name?{...x,category:"その他"}:x)}]));
      const rules=Object.fromEntries(Object.entries(p.rules||{}).filter(([,v]:any)=>v!==name));
      const bc={...(p.budget?.cat||{})};delete bc[name];
      return{...p,cats,months,rules,budget:{...(p.budget||{total:0}),cat:bc}};
    });
    showToast(`🗑 「${name}」を削除しました`);
  };
  // 検索・絞り込み・並び替え後の明細ビュー（qAll=trueなら全期間を横断検索）
  const [qAll,sQAll]=useState(false);
  const listView=useMemo(()=>{
    if(q&&qAll){
      const k=kanaNorm(q);const out:any[]=[];
      Object.entries(D.months).forEach(([mk,v]:any)=>{[...(v.cardExp||[]),...(v.manualExp||[])].forEach((t:any)=>{if(kanaNorm(t.description||"").includes(k)&&(!fCat||t.category===fCat))out.push({...t,_m:mk});});});
      if(sortBy==="amount")out.sort((a,b)=>b.amount-a.amount);
      else out.sort((a,b)=>String(b._m+b.date).localeCompare(String(a._m+a.date)));
      return out;
    }
    let l=allE as any[];
    if(q){const k=kanaNorm(q);l=l.filter((t:any)=>kanaNorm(t.description||"").includes(k));}
    if(fCat)l=l.filter((t:any)=>t.category===fCat);
    l=[...l];
    if(sortBy==="amount")l.sort((a,b)=>b.amount-a.amount);
    else l.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    return l;
  },[allE,q,fCat,sortBy,qAll,D.months]);
  const jumpMonth=(t:any)=>{if(!t._m)return;sD((p:any)=>({...p,cur:t._m}));showToast(`📅 ${t._m} に移動しました`);};
  // 前月の手入力固定費（家賃など現金払いの毎月支出）を今月へワンタップコピー
  const copyPrevManual=()=>{
    const pm=D.months[prevKey];if(!pm)return;
    const fixed=(pm.manualExp||[]).filter((t:any)=>EC[t.category]?.t==="f");
    if(!fixed.length){showToast("前月に手入力の固定費がありません");return;}
    // 同じ店名がすでに今月にあればスキップ（金額を編集済みでも二重登録しない）
    const seen=new Set((md.manualExp||[]).map((t:any)=>kanaNorm(t.description||"")));
    const fresh=fixed.filter((t:any)=>!seen.has(kanaNorm(t.description||""))).map((t:any)=>{
      // 日付の末尾の数字＝日として取り出し（年付き"2026/06/25"や"06-25"もOK）、月の日数に収める
      const m=String(t.date||"").match(/(\d{1,2})\s*$/);const [y,mo]=cm.split("-").map(Number);const dim=new Date(y,mo,0).getDate();
      const dd=String(Math.min(m?parseInt(m[1],10):1,dim)).padStart(2,"0");
      return{...t,id:Date.now()+Math.random()*1e4,date:`${cm.slice(5)}/${dd}`};});
    if(!fresh.length){showToast("すべてコピー済みです");return;}
    if(!confirm(`前月の手入力固定費 ${fresh.length}件（${fresh.map((t:any)=>t.description).slice(0,3).join("・")}${fresh.length>3?" ほか":""}）を今月にコピーしますか？`))return;
    uM((m:any)=>({...m,manualExp:[...m.manualExp,...fresh]}));
    showToast(`↩️ 前月の固定費 ${fresh.length}件をコピーしました`);
  };
  const listSum=useMemo(()=>listView.reduce((s:number,t:any)=>s+t.amount,0),[listView]);
  // ── 月の比較（任意の2ヶ月をカテゴリ別に）──
  const [cmpA,sCmpA]=useState(""); const [cmpB,sCmpB]=useState("");
  const monthKeys=useMemo(()=>Object.keys(D.months).filter(k=>{const v=D.months[k];return ((v.cardExp||[]).length+(v.manualExp||[]).length)>0;}).sort(),[D.months]);
  const cmpData=useMemo(()=>{
    if(monthKeys.length<2)return null;
    const eB=monthKeys.includes(cmpB)?cmpB:(monthKeys.includes(cm)?cm:monthKeys[monthKeys.length-1]);
    let eA=monthKeys.includes(cmpA)&&cmpA!==eB?cmpA:"";
    if(!eA){const idx=monthKeys.indexOf(eB);eA=monthKeys[idx-1]??(monthKeys.find(k=>k!==eB) as string);}
    const catTotals=(k:string)=>{const v=D.months[k];const m:Record<string,number>={};[...(v.cardExp||[]),...(v.manualExp||[])].forEach((t:any)=>{m[t.category]=(m[t.category]||0)+t.amount;});return m;};
    const A=catTotals(eA),B=catTotals(eB);
    const cats=[...new Set([...Object.keys(A),...Object.keys(B)])].map(c=>({name:c,a:A[c]||0,b:B[c]||0})).sort((x,y)=>Math.max(y.a,y.b)-Math.max(x.a,x.b)).slice(0,10);
    const tA=Object.values(A).reduce((s,v)=>s+v,0),tB=Object.values(B).reduce((s,v)=>s+v,0);
    return{eA,eB,cats,tA,tB};
  },[monthKeys,cmpA,cmpB,cm,D.months]);
  // 固定費・サブスク一覧（同じ店をまとめて月額と年換算を出す）
  const fixedList=useMemo(()=>{
    const map:Record<string,{desc:string,cat:string,total:number,count:number}>={};
    allE.forEach((t:any)=>{if(EC[t.category]?.t!=="f")return;const k=kanaNorm(t.description||"");const e=map[k]||(map[k]={desc:t.description,cat:t.category,total:0,count:0});e.total+=t.amount;e.count++;});
    return Object.values(map).sort((a,b)=>b.total-a.total);
  },[allE]);
  const fixedSum=useMemo(()=>fixedList.reduce((s,x)=>s+x.total,0),[fixedList]);
  // 支出カレンダー（日別合計）
  const [selDay,sSelDay]=useState<number|null>(null);
  const calData=useMemo(()=>{
    const curMo=cm?parseInt(cm.split("-")[1],10):0;
    const byDay:Record<number,{total:number,items:any[]}>={};
    // 表示中の月と同じ月の日付のみ集計（「表示中の月へ」モードで混入した他月日付を誤ったマスに出さない）
    allE.forEach((t:any)=>{const m=String(t.date||"").match(/(\d{1,2})[\/\-](\d{1,2})/);if(!m)return;if(parseInt(m[1],10)!==curMo)return;const d=parseInt(m[2],10);if(!d||d>31)return;const e=byDay[d]||(byDay[d]={total:0,items:[]});e.total+=t.amount;e.items.push(t);});
    const [y,mo]=cm?cm.split("-").map(Number):[0,0];
    const dim=y?new Date(y,mo,0).getDate():30;
    const off=y?new Date(y,mo-1,1).getDay():0;
    const max=Math.max(1,...Object.values(byDay).map(v=>v.total));
    return{byDay,dim,off,max};
  },[allE,cm]);
  useEffect(()=>{sQ("");sFCat("");sQAll(false);sEI(null);sSelDay(null);sfED("");},[cm]); // 月を切り替えたら絞り込みと支出日付欄をリセット

  // 「その他」の取引だけを、最新のルール＋キーワード辞書で再仕分け
  const reCat=useCallback(()=>{
    sD((p:any)=>{
      const m=p.months[p.cur]; if(!m) return p;
      const f=(list:any[])=>(list||[]).map((x:any)=>x.category==="その他"?{...x,category:autoCategory(x.description||"",p.rules)}:x);
      return {...p,months:{...p.months,[p.cur]:{...m,cardExp:f(m.cardExp),manualExp:f(m.manualExp)}}};
    });
    showToast("🪄 「その他」を再仕分けしました");
  },[showToast]);

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
          {isEmpty&&<div style={cs({background:"linear-gradient(135deg,rgba(255,107,107,0.08),rgba(255,179,71,0.05))",borderColor:"rgba(255,107,107,0.2)"})}>
            <h3 style={{fontSize:13,fontWeight:700,margin:"0 0 4px",color:"#eee"}}>👋 ようこそ！3ステップで始めましょう</h3>
            <p style={{fontSize:10,color:"#999",margin:"0 0 10px"}}>データはこの端末の中だけに保存。無料・登録不要・外部送信なし。</p>
            <button onClick={()=>sShUp(true)} style={{display:"block",width:"100%",textAlign:"left",background:"rgba(52,152,219,0.08)",border:"1px solid rgba(52,152,219,0.2)",color:"#ddd",padding:"10px 12px",borderRadius:10,fontSize:12,cursor:"pointer",marginBottom:6}}>1️⃣ 💳 <b>カード明細（CSV/PDF）を取り込む</b><span style={{display:"block",fontSize:10,color:"#888",marginTop:2}}>自動でカテゴリ仕分けされます</span></button>
            <button onClick={()=>openIn()} style={{display:"block",width:"100%",textAlign:"left",background:"rgba(46,204,113,0.08)",border:"1px solid rgba(46,204,113,0.2)",color:"#ddd",padding:"10px 12px",borderRadius:10,fontSize:12,cursor:"pointer",marginBottom:6}}>2️⃣ 💼 <b>今月の収入を登録する</b><span style={{display:"block",fontSize:10,color:"#888",marginTop:2}}>貯蓄率が見えるようになります</span></button>
            <button onClick={()=>sPg("assets")} style={{display:"block",width:"100%",textAlign:"left",background:"rgba(155,89,182,0.08)",border:"1px solid rgba(155,89,182,0.2)",color:"#ddd",padding:"10px 12px",borderRadius:10,fontSize:12,cursor:"pointer"}}>3️⃣ 💎 <b>資産・負債を登録する</b><span style={{display:"block",fontSize:10,color:"#888",marginTop:2}}>純資産と決算書(B/S)が完成します</span></button>
          </div>}
          <div style={cs({background:"linear-gradient(135deg,rgba(255,107,107,0.06),rgba(255,179,71,0.04))",borderColor:"rgba(255,107,107,0.12)",padding:16})}>
            <div style={{fontSize:10,color:"#999"}}>今月の収支</div>
            <div style={{fontSize:26,fontWeight:800,fontFamily:"monospace",color:bal>=0?"#2ECC71":"#E74C3C",marginBottom:6}}>{balA>=0?"+":"−"}¥{Math.abs(balA).toLocaleString()}</div>
            <div style={{display:"flex",gap:14,fontSize:11,flexWrap:"wrap"}}>
              <span><span style={{color:"#888"}}>収入 </span><span style={{color:"#2ECC71",fontFamily:"monospace",fontWeight:600}}>¥{tI.toLocaleString()}</span></span>
              <span><span style={{color:"#888"}}>支出 </span><span style={{color:"#FF6B6B",fontFamily:"monospace",fontWeight:600}}>¥{tE.toLocaleString()}</span></span>
              {tI>0&&<span><span style={{color:"#888"}}>貯蓄率 </span><span style={{color:bal/tI>=0.2?"#2ECC71":bal/tI>=0.1?"#F39C12":"#FF6B6B",fontFamily:"monospace",fontWeight:700}}>{Math.max(0,bal/tI*100).toFixed(0)}%</span></span>}
              {prev.tE>0&&tE>0&&<span><span style={{color:"#888"}}>前月比 </span><span style={{color:tE<=prev.tE?"#2ECC71":"#FF6B6B",fontFamily:"monospace",fontWeight:600}}>{tE<=prev.tE?"−":"＋"}¥{Math.abs(tE-prev.tE).toLocaleString()}</span></span>}
            </div>
            {tI>0&&<div style={{marginTop:6,height:5,background:"rgba(255,255,255,0.08)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:Math.min(100,tE/tI*100)+"%",background:tE/tI>1?"#E74C3C":tE/tI>0.8?"#F39C12":"#2ECC71",borderRadius:3}}/></div>}
          </div>
          {badges.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{badges.map(b=><span key={b} style={{fontSize:10,fontWeight:700,color:"#FFB347",background:"rgba(255,179,71,0.08)",border:"1px solid rgba(255,179,71,0.25)",padding:"4px 10px",borderRadius:999}}>{b}</span>)}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>
            <button onClick={()=>openIn()} style={{background:"rgba(46,204,113,0.03)",border:"1px dashed rgba(46,204,113,0.3)",borderRadius:12,padding:10,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:18}}>💼</div><div style={{fontSize:10,color:"#2ECC71",fontWeight:600}}>収入</div></button>
            <button onClick={()=>sShE(true)} style={{background:"rgba(255,107,107,0.03)",border:"1px dashed rgba(255,107,107,0.3)",borderRadius:12,padding:10,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:18}}>💸</div><div style={{fontSize:10,color:"#FF6B6B",fontWeight:600}}>支出</div></button>
            <button onClick={()=>sShUp(true)} style={{background:"rgba(52,152,219,0.03)",border:"1px dashed rgba(52,152,219,0.3)",borderRadius:12,padding:10,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:18}}>💳</div><div style={{fontSize:10,color:"#3498DB",fontWeight:600}}>明細取込</div></button>
          </div>
          {bud?(<div style={cs()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h3 style={{fontSize:12,fontWeight:600,margin:0,color:"#4ECDC4"}}>📏 今月の予算</h3>
              <button onClick={()=>{sfBT(String(budCfg.total||""));sfBC(Object.fromEntries(Object.entries(budCfg.cat||{}).map(([k,v]:any)=>[k,String(v)])));sShB(true);}} style={{background:"rgba(78,205,196,0.1)",border:"1px solid rgba(78,205,196,0.2)",color:"#4ECDC4",padding:"3px 8px",borderRadius:5,fontSize:10,cursor:"pointer",fontWeight:600}}>変更</button>
            </div>
            {bud.total>0&&(()=>{const pct=Math.min(100,bud.spent/bud.total*100);const rem=bud.total-bud.spent;const col=pct>=100?"#E74C3C":pct>=80?"#F39C12":"#2ECC71";return(
              <div style={{marginTop:8}}>
                <div style={{height:8,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:pct+"%",background:col,borderRadius:4}}/></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#888"}}>
                  <span>¥{bud.spent.toLocaleString()} / ¥{bud.total.toLocaleString()}</span>
                  <span style={{color:col,fontWeight:700}}>{rem>=0?`残り¥${rem.toLocaleString()}`:`超過¥${Math.abs(rem).toLocaleString()}`}{bud.perDay>0&&`・1日¥${bud.perDay.toLocaleString()}`}</span>
                </div>
              </div>);})()}
            {Object.entries(bud.catB).map(([c,b]:any)=>{const sp=bC[c]?.total||0;const p=Math.min(100,sp/b*100);const cfg=EC[c]||{i:"📦",c:"#888"};const col=p>=100?"#E74C3C":p>=80?"#F39C12":"#2ECC71";return(
              <div key={c} style={{marginTop:8}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:2}}><span style={{color:"#ccc"}}>{cfg.i} {c}</span><span style={{fontFamily:"monospace",color:col,fontWeight:600}}>¥{sp.toLocaleString()} / ¥{b.toLocaleString()}</span></div>
                <div style={{height:3,background:"rgba(255,255,255,0.05)",borderRadius:2}}><div style={{height:"100%",width:p+"%",background:col,borderRadius:2}}/></div>
              </div>);})}
          </div>):(
            <button onClick={()=>{sfBT("");sfBC({});sShB(true);}} style={{background:"rgba(78,205,196,0.03)",border:"1px dashed rgba(78,205,196,0.3)",color:"#4ECDC4",padding:"10px 0",borderRadius:12,fontSize:11,cursor:"pointer",width:"100%",marginBottom:12,fontWeight:600}}>📏 月の予算を設定してみる（残り額と1日ペースが見えます）</button>
          )}
          <div onClick={()=>sPg("statement")} style={cs({background:"linear-gradient(135deg,rgba(52,152,219,0.06),rgba(46,204,113,0.04))",borderColor:"rgba(52,152,219,0.12)",cursor:"pointer"})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontSize:10,color:"#999"}}>純資産（総資産 − 負債）</span><span style={{fontSize:9,color:"#666"}}>📑 決算書 ›</span></div>
            <div style={{fontSize:22,fontWeight:800,fontFamily:"monospace",color:netW>=0?"#3498DB":"#E74C3C",marginBottom:6}}>{netWA>=0?"":"−"}¥{Math.abs(netWA).toLocaleString()}</div>
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
            {srt.slice(0,5).map(([cat,d]:any)=>{const cfg=EC[cat]||{i:"📦",c:"#888"};return(<div key={cat} onClick={()=>{sFCat(cat);sPg("list");}} style={{marginBottom:6,cursor:"pointer"}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:2}}><span style={{color:"#ccc"}}>{cfg.i} {cat} <span style={{color:"#555",fontSize:8}}>›</span></span><span style={{fontFamily:"monospace",color:cfg.c,fontWeight:600}}>¥{d.total.toLocaleString()}</span></div><div style={{height:3,background:"rgba(255,255,255,0.05)",borderRadius:2}}><div style={{height:"100%",width:(tE>0?d.total/tE*100:0)+"%",background:cfg.c,borderRadius:2}}/></div></div>);})}
          </div>
        </div>)}

        {pg==="statement"&&(<div>
          <h2 style={{fontSize:16,fontWeight:700,margin:"0 0 2px",color:"#eee"}}>📑 マイ決算書</h2>
          <p style={{fontSize:10,color:"#666",margin:"0 0 14px"}}>あなた専用の損益計算書(P/L)と貸借対照表(B/S)</p>
          {tE===0&&tI===0&&<div style={cs({textAlign:"center",padding:"20px 16px"})}>
            <div style={{fontSize:26,marginBottom:6}}>📭</div>
            <p style={{fontSize:12,color:"#bbb",margin:"0 0 10px"}}>{cm} はまだデータがありません。<br/>明細を取り込むと決算書が自動で作られます。</p>
            <button onClick={()=>sShUp(true)} style={{background:"rgba(52,152,219,0.1)",border:"1px solid rgba(52,152,219,0.2)",color:"#3498DB",padding:"9px 20px",borderRadius:8,fontSize:12,cursor:"pointer",fontWeight:600}}>💳 明細を取り込む</button>
          </div>}

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
              {yD.mCount>1&&<SR l={`月平均支出（${yD.mCount}ヶ月）`} v={Math.round(yD.yE/yD.mCount)} c="#FFB347" sm/>}
              {yD.mCount>1&&yD.catTop.length>0&&<div style={{marginTop:6}}><div style={{fontSize:9,color:"#888",marginBottom:2}}>年間の支出トップ3</div>{yD.catTop.map(([c,v]:any)=><SR key={c} l={(EC[c]?.i||"")+" "+c} v={v} c={EC[c]?.c||"#888"} sm/>)}</div>}
              {yD.ch.length>1&&<div style={{marginTop:8}}><ResponsiveContainer width="100%" height={120}><BarChart data={yD.ch} margin={{top:8,right:4,left:-20,bottom:0}}><XAxis dataKey="name" tick={{fill:"#888",fontSize:9}} axisLine={false} tickLine={false}/><YAxis hide/><Tooltip content={<TT/>}/><Bar dataKey="income" fill="#2ECC71" radius={[3,3,0,0]} name="収入"/><Bar dataKey="expense" fill="#FF6B6B" radius={[3,3,0,0]} name="支出"/></BarChart></ResponsiveContainer></div>}
              {yD.ch.length>1&&<div style={{marginTop:8}}>
                <div style={{fontSize:9,color:"#888",marginBottom:2}}>収入・支出の累計推移</div>
                <ResponsiveContainer width="100%" height={110}><AreaChart data={yD.ch} margin={{top:6,right:8,left:-16,bottom:0}}>
                  <defs>
                    <linearGradient id="cig" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2ECC71" stopOpacity={0.25}/><stop offset="95%" stopColor="#2ECC71" stopOpacity={0}/></linearGradient>
                    <linearGradient id="ceg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.25}/><stop offset="95%" stopColor="#FF6B6B" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{fill:"#888",fontSize:9}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#666",fontSize:8}} tickFormatter={(v:number)=>v>=1e6?(v/1e6).toFixed(1)+"M":v>=1e3?Math.round(v/1e3)+"k":String(v)} axisLine={false} tickLine={false} width={40}/>
                  <Tooltip content={({active,payload}:any)=>active&&payload?.length?<div style={{background:"#1c1c30",border:"1px solid #333",borderRadius:8,padding:"6px 10px",fontSize:11,color:"#ddd"}}><div>{payload[0].payload.name}まで</div><div style={{color:"#2ECC71"}}>収入計 ¥{payload[0].payload.cumI.toLocaleString()}</div><div style={{color:"#FF6B6B"}}>支出計 ¥{payload[0].payload.cumE.toLocaleString()}</div></div>:null}/>
                  <Area type="monotone" dataKey="cumI" stroke="#2ECC71" fill="url(#cig)" strokeWidth={2} name="収入累計"/>
                  <Area type="monotone" dataKey="cumE" stroke="#FF6B6B" fill="url(#ceg)" strokeWidth={2} name="支出累計"/>
                </AreaChart></ResponsiveContainer>
                <div style={{display:"flex",gap:12,fontSize:9,color:"#888",justifyContent:"center"}}><span><span style={{color:"#2ECC71"}}>●</span> 収入の累計</span><span><span style={{color:"#FF6B6B"}}>●</span> 支出の累計</span></div>
              </div>}
              {yD.ch.filter((c:any)=>c.sr!=null).length>1&&<div style={{marginTop:8}}>
                <div style={{fontSize:9,color:"#888",marginBottom:2}}>貯蓄率の推移（%）</div>
                <ResponsiveContainer width="100%" height={90}><AreaChart data={yD.ch} margin={{top:6,right:8,left:-24,bottom:0}}>
                  <defs><linearGradient id="srg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3498DB" stopOpacity={0.3}/><stop offset="95%" stopColor="#3498DB" stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="name" tick={{fill:"#888",fontSize:9}} axisLine={false} tickLine={false}/><YAxis hide domain={[0,100]}/>
                  <Tooltip content={({active,payload}:any)=>active&&payload?.[0]?.payload?.sr!=null?<div style={{background:"#1c1c30",border:"1px solid #333",borderRadius:8,padding:"5px 9px",fontSize:11,color:"#ddd"}}>{payload[0].payload.name} 貯蓄率 <b style={{color:"#3498DB"}}>{payload[0].payload.sr}%</b></div>:null}/>
                  <Area type="monotone" dataKey="sr" stroke="#3498DB" fill="url(#srg)" strokeWidth={2} connectNulls/>
                </AreaChart></ResponsiveContainer>
              </div>}
            </div>
          </div>

          {/* ── 前月比（どこが増えた/減ったか）── */}
          {prev.tE>0&&catDelta.length>0&&<div style={cs()}>
            <h3 style={{fontSize:12,fontWeight:600,margin:"0 0 2px",color:"#bbb"}}>📊 前月比 <span style={{fontSize:9,color:"#777",fontWeight:400}}>{prevKey} → {cm}</span></h3>
            <p style={{fontSize:9,color:"#666",margin:"0 0 8px"}}>支出合計 {tE<=prev.tE?"−":"＋"}¥{Math.abs(tE-prev.tE).toLocaleString()}（¥{prev.tE.toLocaleString()} → ¥{tE.toLocaleString()}）</p>
            {catDelta.slice(0,6).map(([c,d])=>{const cfg=EC[c]||{i:"📦",c:"#888"};const w=Math.min(100,Math.abs(d)/Math.max(...catDelta.map(([,x])=>Math.abs(x)))*100);
              return(<div key={c} onClick={()=>{sFCat(c);sPg("list");}} style={{marginBottom:6,cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:2}}>
                  <span style={{color:"#ccc"}}>{cfg.i} {c} <span style={{color:"#555",fontSize:8}}>›</span></span>
                  <span style={{fontFamily:"monospace",fontWeight:600,color:d>0?"#FF6B6B":"#2ECC71"}}>{d>0?"＋":"−"}¥{Math.abs(d).toLocaleString()}</span>
                </div>
                <div style={{height:3,background:"rgba(255,255,255,0.05)",borderRadius:2}}><div style={{height:"100%",width:w+"%",background:d>0?"#FF6B6B":"#2ECC71",borderRadius:2}}/></div>
              </div>);})}
          </div>}

          {/* ── 月の比較（任意の2ヶ月・カテゴリ別）── */}
          {cmpData&&<div style={cs()}>
            <h3 style={{fontSize:12,fontWeight:600,margin:"0 0 2px",color:"#bbb"}}>🆚 月の比較（カテゴリ別）</h3>
            <p style={{fontSize:9,color:"#666",margin:"0 0 8px"}}>好きな2つの月を選んで、どこが変わったか見比べられます</p>
            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:8}}>
              <select value={cmpData.eA} onChange={(e:any)=>sCmpA(e.target.value)} style={{flex:1,padding:"8px 10px",background:"rgba(93,173,226,0.08)",border:"1px solid rgba(93,173,226,0.3)",borderRadius:8,color:"#5DADE2",fontSize:12,outline:"none",fontWeight:600}}>{monthKeys.map(k=><option key={k} value={k}>{k}</option>)}</select>
              <span style={{fontSize:11,color:"#888"}}>vs</span>
              <select value={cmpData.eB} onChange={(e:any)=>sCmpB(e.target.value)} style={{flex:1,padding:"8px 10px",background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.3)",borderRadius:8,color:"#FF6B6B",fontSize:12,outline:"none",fontWeight:600}}>{monthKeys.map(k=><option key={k} value={k}>{k}</option>)}</select>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:8,padding:"8px 10px",background:"rgba(255,255,255,0.03)",borderRadius:8}}>
              <span style={{color:"#5DADE2",fontFamily:"monospace",fontWeight:600}}>¥{cmpData.tA.toLocaleString()}</span>
              <span style={{color:cmpData.tB<=cmpData.tA?"#2ECC71":"#FF6B6B",fontWeight:700,fontSize:10}}>{cmpData.tB<=cmpData.tA?"▼":"▲"} {cmpData.tB<=cmpData.tA?"−":"＋"}¥{Math.abs(cmpData.tB-cmpData.tA).toLocaleString()}</span>
              <span style={{color:"#FF6B6B",fontFamily:"monospace",fontWeight:600}}>¥{cmpData.tB.toLocaleString()}</span>
            </div>
            <ResponsiveContainer width="100%" height={Math.max(180,cmpData.cats.length*38)}>
              <BarChart data={cmpData.cats.map(c=>({...c,label:(EC[c.name]?.i||"")+" "+c.name}))} layout="vertical" margin={{left:96,right:8,top:4,bottom:4}} barGap={1}>
                <XAxis type="number" hide/><YAxis type="category" dataKey="label" width={96} tick={{fill:"#aaa",fontSize:9}} axisLine={false} tickLine={false}/>
                <Tooltip content={({active,payload}:any)=>active&&payload?.length?<div style={{background:"#1c1c30",border:"1px solid #333",borderRadius:8,padding:"6px 10px",fontSize:11,color:"#ddd"}}><div>{payload[0].payload.name}</div><div style={{color:"#5DADE2"}}>{cmpData.eA}: ¥{payload[0].payload.a.toLocaleString()}</div><div style={{color:"#FF6B6B"}}>{cmpData.eB}: ¥{payload[0].payload.b.toLocaleString()}</div></div>:null}/>
                <Bar dataKey="a" fill="#5DADE2" radius={[0,3,3,0]} name={cmpData.eA} barSize={9}/>
                <Bar dataKey="b" fill="#FF6B6B" radius={[0,3,3,0]} name={cmpData.eB} barSize={9}/>
              </BarChart>
            </ResponsiveContainer>
            <div style={{display:"flex",gap:12,fontSize:9,color:"#888",justifyContent:"center",marginTop:2}}><span><span style={{color:"#5DADE2"}}>●</span> {cmpData.eA}</span><span><span style={{color:"#FF6B6B"}}>●</span> {cmpData.eB}</span></div>
          </div>}

          {/* ── 支出カレンダー ── */}
          {tE>0&&<div style={cs()}>
            <h3 style={{fontSize:12,fontWeight:600,margin:"0 0 2px",color:"#bbb"}}>🗓 支出カレンダー</h3>
            <p style={{fontSize:9,color:"#666",margin:"0 0 8px"}}>色が濃い日ほど支出が多い日。タップで内訳を表示</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
              {["日","月","火","水","木","金","土"].map(d=><div key={d} style={{textAlign:"center",fontSize:8,color:"#666",padding:"2px 0"}}>{d}</div>)}
              {Array.from({length:calData.off}).map((_,i)=><div key={"e"+i}/>)}
              {Array.from({length:calData.dim}).map((_,i)=>{const d=i+1;const v=calData.byDay[d];const a=v?0.12+0.55*(v.total/calData.max):0;const sel=selDay===d;
                return(<div key={d} onClick={()=>v&&sSelDay(sel?null:d)} style={{aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:6,cursor:v?"pointer":"default",background:v?`rgba(255,107,107,${a})`:"rgba(255,255,255,0.02)",border:sel?"1px solid #FF6B6B":"1px solid transparent"}}>
                  <span style={{fontSize:9,color:v?"#fff":"#555",fontWeight:v?700:400}}>{d}</span>
                  {v&&<span style={{fontSize:7,color:"rgba(255,255,255,0.85)",fontFamily:"monospace"}}>{v.total>=10000?Math.round(v.total/1000)+"k":v.total>=1000?(v.total/1000).toFixed(1)+"k":v.total}</span>}
                </div>);})}
            </div>
            {selDay&&calData.byDay[selDay]&&<div style={{marginTop:10,borderTop:"1px dashed rgba(255,255,255,0.1)",paddingTop:8}}>
              <div style={{fontSize:11,color:"#FFB347",fontWeight:600,marginBottom:4}}>{cm.slice(5)}/{String(selDay).padStart(2,"0")} の支出 ¥{calData.byDay[selDay].total.toLocaleString()}（{calData.byDay[selDay].items.length}件）</div>
              {calData.byDay[selDay].items.map((t:any)=><div key={t.id} style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#ccc",padding:"2px 0"}}><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginRight:8}}>{EC[t.category]?.i} {t.description}</span><span style={{fontFamily:"monospace",flexShrink:0}}>¥{t.amount.toLocaleString()}</span></div>)}
            </div>}
          </div>}

          {/* ── 固定費・サブスク一覧 ── */}
          {fixedList.length>0&&<div style={cs()}>
            <h3 style={{fontSize:12,fontWeight:600,margin:"0 0 2px",color:"#4ECDC4"}}>🔁 固定費・サブスク一覧</h3>
            <p style={{fontSize:9,color:"#666",margin:"0 0 8px"}}>毎月かかっているもの。年換算で見ると見直しの効果がわかります</p>
            {fixedList.map((f)=>{const cfg=EC[f.cat]||{i:"📦",c:"#888"};return(
              <div key={f.desc} onClick={()=>{sQ(f.desc);sFCat("");sPg("list");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.03)",fontSize:11,cursor:"pointer"}}>
                <span style={{color:"#ccc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginRight:8}}>{cfg.i} {f.desc}{f.count>1&&<span style={{color:"#666",fontSize:9}}> ×{f.count}</span>}</span>
                <span style={{flexShrink:0}}><span style={{fontFamily:"monospace",color:cfg.c,fontWeight:600}}>¥{f.total.toLocaleString()}</span><span style={{fontSize:8,color:"#777"}}> /月（年¥{(f.total*12).toLocaleString()}）</span></span>
              </div>);})}
            <div style={{display:"flex",justifyContent:"space-between",marginTop:8,paddingTop:6,borderTop:"1px solid rgba(78,205,196,0.2)",fontSize:11}}>
              <span style={{color:"#4ECDC4",fontWeight:700}}>月合計 ¥{fixedSum.toLocaleString()}</span>
              <span style={{color:"#FFB347",fontWeight:700,fontFamily:"monospace"}}>年換算 ¥{(fixedSum*12).toLocaleString()}</span>
            </div>
          </div>}

          {/* ── 費用の内訳（tE=0だとPieのpercentがNaNになるためガード）── */}
          {tE>0&&<div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 2px",color:"#bbb"}}>固定費 vs 変動費</h3><ResponsiveContainer width="100%" height={170}><PieChart><Pie data={[{name:"固定費",value:fxT,color:"#3498DB"},{name:"変動費",value:tE-fxT,color:"#F39C12"}]} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value" paddingAngle={4} stroke="none" label={({name,percent}:any)=>name+" "+(percent*100).toFixed(0)+"%"}><Cell fill="#3498DB"/><Cell fill="#F39C12"/></Pie><Tooltip content={<TT/>}/></PieChart></ResponsiveContainer></div>}
          {tE>0&&<div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 2px",color:"#bbb"}}>カテゴリ別支出</h3><ResponsiveContainer width="100%" height={Math.max(200,srt.length*28)}><BarChart data={srt.map(([c,v]:any)=>({name:(EC[c]?.i||"")+" "+c,value:v.total,color:EC[c]?.c||"#888"}))} layout="vertical" margin={{left:100,right:45,top:4,bottom:4}}><XAxis type="number" hide/><YAxis type="category" dataKey="name" width={100} tick={{fill:"#aaa",fontSize:9}} axisLine={false} tickLine={false}/><Tooltip content={<TT/>}/><Bar dataKey="value" radius={[0,4,4,0]} label={{position:"right",fill:"#888",fontSize:8,formatter:(v:number)=>"¥"+v.toLocaleString()}}>{srt.map(([c]:any,i:number)=><Cell key={i} fill={EC[c]?.c||"#888"}/>)}</Bar></BarChart></ResponsiveContainer></div>}

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
          {D.assetHist.length>1&&<div style={cs()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <h3 style={{fontSize:12,fontWeight:600,margin:0,color:"#bbb"}}>📈 純資産の推移</h3>
              <button onClick={()=>{const last=D.assetHist[D.assetHist.length-1];if(confirm(`直近の記録（${last?.date}）を取り消しますか？誤入力でグラフが崩れたときに使えます。`)){sD((p:any)=>({...p,assetHist:p.assetHist.slice(0,-1)}));showToast("↩ 直近の記録を取り消しました");}}} style={{background:"rgba(255,255,255,0.05)",border:"1px solid #333",color:"#888",padding:"2px 8px",borderRadius:5,fontSize:9,cursor:"pointer"}}>↩ 直近を取り消す</button>
            </div><ResponsiveContainer width="100%" height={130}><AreaChart data={D.assetHist.map((h:any)=>({name:h.date.slice(5),value:h.net??h.total}))} margin={{top:8,right:8,left:-20,bottom:0}}><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3498DB" stopOpacity={0.3}/><stop offset="95%" stopColor="#3498DB" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="name" tick={{fill:"#888",fontSize:9}} axisLine={false} tickLine={false}/><YAxis hide/><Tooltip content={<TT/>}/><Area type="monotone" dataKey="value" stroke="#3498DB" fill="url(#ag)" strokeWidth={2} name="純資産"/></AreaChart></ResponsiveContainer></div>}
          <div style={cs()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3 style={{fontSize:12,fontWeight:600,margin:0,color:"#FFB347"}}>🎯 貯金目標</h3><button onClick={()=>{sfGA(String(D.goal.target||""));sfGL(D.goal.label);sfNWA(String(D.goal.nw||""));sShG(true);}} style={{background:"rgba(255,179,71,0.1)",border:"1px solid rgba(255,179,71,0.2)",color:"#FFB347",padding:"3px 8px",borderRadius:5,fontSize:10,cursor:"pointer",fontWeight:600}}>{D.goal.target>0?"変更":"設定"}</button></div>{D.goal.target>0&&<div style={{marginTop:8}}><div style={{height:10,background:"rgba(255,255,255,0.06)",borderRadius:5,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:gP+"%",background:gP>=100?"#2ECC71":"linear-gradient(90deg,#3498DB,#2ECC71)",borderRadius:5}}/></div><div style={{fontSize:10,color:"#888"}}>{gP.toFixed(0)}%（¥{yD.yB.toLocaleString()} / ¥{D.goal.target.toLocaleString()}）</div></div>}</div>
        </div>)}

        {pg==="list"&&(<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"0 0 4px"}}>
            <h2 style={{fontSize:16,fontWeight:700,margin:0,color:"#eee"}}>📋 明細 ({cm})</h2>
            {allE.some((t:any)=>t.category==="その他")&&<button onClick={reCat} style={{background:"rgba(155,89,182,0.1)",border:"1px solid rgba(155,89,182,0.25)",color:"#9B59B6",padding:"4px 10px",borderRadius:6,fontSize:10,cursor:"pointer",fontWeight:600}}>🪄 その他を再仕分け</button>}
          </div>
          <p style={{fontSize:9,color:"#666",margin:"0 0 8px"}}>内容タップで編集 ・ カテゴリタップで変更（同じ店は次回から自動仕分け）</p>
          {/* 収入セクション */}
          <div style={cs({padding:"10px 14px"})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h3 style={{fontSize:11,fontWeight:600,margin:0,color:"#2ECC71"}}>💼 収入 <span style={{fontFamily:"monospace"}}>¥{tI.toLocaleString()}</span></h3>
              <button onClick={()=>openIn()} style={{background:"rgba(46,204,113,0.1)",border:"1px solid rgba(46,204,113,0.2)",color:"#2ECC71",padding:"3px 10px",borderRadius:5,fontSize:10,cursor:"pointer",fontWeight:600}}>＋追加</button>
            </div>
            {md.incomes.length>0&&<div style={{marginTop:6}}>{md.incomes.map((inc:any)=>{const t=IT.find(x=>x.id===inc.type)||IT[4];return(
              <div key={inc.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0",fontSize:11}}>
                <span onClick={()=>openIn(inc)} style={{color:"#ccc",cursor:"pointer",flex:1}}>{t.i} {t.l} {inc.note&&<span style={{color:"#666",fontSize:9}}>({inc.note})</span>} <span style={{color:"#555",fontSize:9}}>✎</span></span>
                <div style={{display:"flex",alignItems:"center",gap:6}}><span onClick={()=>openIn(inc)} style={{fontFamily:"monospace",color:t.c,fontWeight:600,cursor:"pointer"}}>¥{inc.amount.toLocaleString()}</span><button onClick={()=>uM((m:any)=>({...m,incomes:m.incomes.filter((i:any)=>i.id!==inc.id)}))} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:0}}>×</button></div>
              </div>);})}</div>}
          </div>
          {(D.months[prevKey]?.manualExp||[]).some((t:any)=>EC[t.category]?.t==="f")&&<button onClick={copyPrevManual} style={{background:"rgba(78,205,196,0.03)",border:"1px dashed rgba(78,205,196,0.3)",color:"#4ECDC4",padding:"8px 0",borderRadius:10,fontSize:11,cursor:"pointer",width:"100%",marginBottom:8,fontWeight:600}}>↩️ 前月の手入力固定費（家賃など）を今月にコピー</button>}
          {/* 検索・並び替え */}
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            <div style={{position:"relative",flex:1}}>
              <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"#666"}}>🔍</span>
              <input value={q} onChange={(e:any)=>sQ(e.target.value)} placeholder="店名で検索"
                style={{width:"100%",boxSizing:"border-box",padding:"8px 10px 8px 30px",background:"rgba(255,255,255,0.05)",border:"1px solid #333",borderRadius:10,color:"#eee",fontSize:12,outline:"none"}}/>
              {q&&<button onClick={()=>sQ("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#777",cursor:"pointer",fontSize:12}}>×</button>}
            </div>
            {q&&<button onClick={()=>sQAll(a=>!a)} style={{background:qAll?"rgba(93,173,226,0.12)":"rgba(255,255,255,0.05)",border:"1px solid "+(qAll?"rgba(93,173,226,0.4)":"#333"),color:qAll?"#5DADE2":"#aaa",padding:"0 10px",borderRadius:10,fontSize:10,cursor:"pointer",whiteSpace:"nowrap",fontWeight:600}}>{qAll?"🌐 全期間":"📆 今月"}</button>}
            <button onClick={()=>sSortBy(s=>s==="date"?"amount":"date")} style={{background:"rgba(255,255,255,0.05)",border:"1px solid #333",color:"#aaa",padding:"0 12px",borderRadius:10,fontSize:10,cursor:"pointer",whiteSpace:"nowrap"}}>{sortBy==="date"?"📅 日付順":"💰 金額順"}</button>
          </div>
          {/* カテゴリ絞り込みチップ */}
          {srt.length>1&&<div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:6,marginBottom:6,WebkitOverflowScrolling:"touch"}}>
            <button onClick={()=>sFCat("")} style={{flexShrink:0,padding:"4px 10px",borderRadius:999,fontSize:10,cursor:"pointer",background:!fCat?"rgba(255,107,107,0.15)":"rgba(255,255,255,0.04)",border:"1px solid "+(!fCat?"rgba(255,107,107,0.35)":"#333"),color:!fCat?"#FF6B6B":"#999",fontWeight:600}}>全て</button>
            {srt.map(([c]:any)=>{const cfg=EC[c]||{i:"📦",c:"#888"};const on=fCat===c;return(
              <button key={c} onClick={()=>sFCat(on?"":c)} style={{flexShrink:0,padding:"4px 10px",borderRadius:999,fontSize:10,cursor:"pointer",background:on?cfg.c+"22":"rgba(255,255,255,0.04)",border:"1px solid "+(on?cfg.c+"66":"#333"),color:on?cfg.c:"#999",fontWeight:600,whiteSpace:"nowrap"}}>{cfg.i}{c}</button>);})}
          </div>}
          <p style={{fontSize:10,color:"#888",margin:"0 0 8px"}}>{(q||fCat)?`${q&&qAll?"🌐全期間の":""}絞り込み結果: ${listView.length}件 ・ 合計 `:`💳${md.cardExp?.length||0} + ✏️${md.manualExp?.length||0} = ${allE.length}件 ・ 支出合計 `}<span style={{fontFamily:"monospace",color:"#FF6B6B",fontWeight:700}}>¥{listSum.toLocaleString()}</span>{q&&qAll&&<span style={{color:"#666"}}> ・ 行タップでその月へ移動</span>}</p>
          <div style={cs()}>
            {listView.length===0&&<p style={{fontSize:11,color:"#666",margin:0,textAlign:"center",padding:"12px 0"}}>{allE.length===0?"取引がありません。「明細取込」や「支出」から追加できます。":"条件に合う取引がありません。"}</p>}
            {listView.map((t:any)=>{const cfg=EC[t.category]||{i:"📦",c:"#888",t:"v"};const cross=!!t._m;return(
            <div key={cross?t._m+"-"+t.id:t.id} onClick={cross?()=>jumpMonth(t):undefined} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.03)",fontSize:11,cursor:cross?"pointer":"default"}}>
              {cross&&<span style={{fontSize:8,color:"#5DADE2",border:"1px solid rgba(93,173,226,0.3)",borderRadius:4,padding:"0 3px",flexShrink:0}}>{t._m.slice(2)}</span>}
              <span style={{flex:"0 0 34px",color:"#666",fontFamily:"monospace",fontSize:9}}>{t.date}</span>
              <span style={{fontSize:10}}>{t.source==="card"?"💳":"✏️"}</span>
              <span onClick={cross?undefined:()=>openTx(t)} style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#ddd",minWidth:0,cursor:"pointer"}}>{t.description}</span>
              <span onClick={cross?undefined:()=>openTx(t)} style={{fontFamily:"monospace",color:"#ddd",fontSize:10,cursor:"pointer"}}>¥{t.amount.toLocaleString()}</span>
              {!cross&&eI===t.id?<select value={t.category} onChange={(e:any)=>{hCC(t,e.target.value);sEI(null);}} onBlur={()=>sEI(null)} autoFocus style={{background:"#1a1a2e",color:"#ddd",border:"1px solid #444",borderRadius:6,padding:"2px 3px",fontSize:9,maxWidth:100}}>{Object.entries(EC).map(([c,v])=><option key={c} value={c}>{v.i} {c}</option>)}</select>
              :<span onClick={cross?undefined:()=>sEI(t.id)} style={{padding:"1px 5px",borderRadius:8,fontSize:8,cursor:"pointer",background:cfg.c+"18",color:cfg.c,whiteSpace:"nowrap"}}>{cfg.i}{t.category}</span>}
              {!cross&&<button onClick={()=>delTx(t)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:"0 2px"}}>×</button>}
            </div>);})}
          </div>
        </div>)}

        {pg==="more"&&(<div>
          <h2 style={{fontSize:16,fontWeight:700,margin:"0 0 14px",color:"#eee"}}>⚙️ 設定</h2>
          <div style={cs()}><button onClick={()=>sShIn(!shIn)} style={{background:"none",border:"none",color:"#3498DB",fontSize:13,fontWeight:600,cursor:"pointer",padding:0,width:"100%",textAlign:"left"}}>📲 ホーム画面に追加する方法 {shIn?"▲":"▼"}</button>
            {shIn&&<div style={{marginTop:10,fontSize:11,color:"#bbb",lineHeight:1.8}}><p style={{margin:"0 0 4px"}}><strong>iPhone:</strong> Safari → 共有（□↑）→ ホーム画面に追加</p><p style={{margin:0}}><strong>Android:</strong> Chrome → ⋮ → ホーム画面に追加</p></div>}
          </div>
          <div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 6px",color:"#ccc"}}>📅 月の管理</h3><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{Object.keys(D.months).sort().map(k=><button key={k} onClick={()=>sD((p:any)=>({...p,cur:k}))} style={{padding:"5px 10px",borderRadius:6,fontSize:10,cursor:"pointer",background:k===cm?"rgba(255,107,107,0.15)":"rgba(255,255,255,0.04)",border:"1px solid "+(k===cm?"rgba(255,107,107,0.3)":"#333"),color:k===cm?"#FF6B6B":"#aaa"}}>{k}</button>)}<button onClick={()=>sShM(true)} style={{padding:"5px 10px",borderRadius:6,fontSize:10,cursor:"pointer",background:"rgba(255,255,255,0.04)",border:"1px dashed #555",color:"#888"}}>+ 新規</button></div></div>
          <div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 6px",color:"#ccc"}}>💳 明細アップロード</h3><p style={{fontSize:11,color:"#999",margin:"0 0 8px"}}>カード会社の明細（CSV / PDF）をアップロードして取引を追加できます。重複は自動でスキップされ、何度でも蓄積できます。</p><button onClick={()=>sShUp(true)} style={{background:"rgba(52,152,219,0.1)",border:"1px solid rgba(52,152,219,0.2)",color:"#3498DB",padding:"8px 0",borderRadius:8,fontSize:12,cursor:"pointer",width:"100%",fontWeight:600}}>📄 明細をアップロード</button></div>
          <div style={cs()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h3 style={{fontSize:12,fontWeight:600,margin:0,color:"#4ECDC4"}}>🏷️ カテゴリの管理</h3>
              <button onClick={()=>openCat()} style={{background:"rgba(78,205,196,0.1)",border:"1px solid rgba(78,205,196,0.2)",color:"#4ECDC4",padding:"3px 10px",borderRadius:5,fontSize:10,cursor:"pointer",fontWeight:600}}>＋新規作成</button>
            </div>
            <p style={{fontSize:10,color:"#888",margin:"4px 0 8px"}}>自分のカテゴリを作れます。標準カテゴリも絵文字・色・固定/変動を変更OK（名前変更と削除は自作のみ）。</p>
            <div style={{maxHeight:240,overflow:"auto"}}>
              {Object.entries(EC).map(([name,v]:any)=>{const custom=!(name in ECB);return(
                <div key={name} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",fontSize:11,borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                  <span style={{width:10,height:10,borderRadius:5,background:v.c,flexShrink:0}}/>
                  <span style={{flex:1,color:"#ccc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.i} {name} {custom&&<span style={{fontSize:8,color:"#4ECDC4",border:"1px solid rgba(78,205,196,0.3)",borderRadius:4,padding:"0 4px",marginLeft:2}}>自作</span>}</span>
                  <span style={{fontSize:9,color:v.t==="f"?"#3498DB":"#F39C12",flexShrink:0}}>{v.t==="f"?"固定":"変動"}</span>
                  <button onClick={()=>openCat(name)} style={{background:"none",border:"none",color:"#888",cursor:"pointer",padding:"0 2px",fontSize:11}}>✎</button>
                  {custom?<button onClick={()=>delCat(name)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:0}}>×</button>:<span style={{width:10}}/>}
                </div>);})}
            </div>
          </div>
          {Object.keys(D.rules||{}).length>0&&<div style={cs()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h3 style={{fontSize:12,fontWeight:600,margin:0,color:"#9B59B6"}}>🧠 学習した仕分けルール（{Object.keys(D.rules).length}件）</h3>
              <button onClick={()=>{if(confirm("学習したルールを全て削除しますか？"))sD((p:any)=>({...p,rules:{}}));}} style={{background:"rgba(231,76,60,0.08)",border:"1px solid rgba(231,76,60,0.2)",color:"#E74C3C",padding:"3px 8px",borderRadius:5,fontSize:10,cursor:"pointer"}}>全削除</button>
            </div>
            <p style={{fontSize:10,color:"#888",margin:"4px 0 8px"}}>カテゴリを手で直したときに覚えた「店名→カテゴリ」。間違えて覚えたものは×で削除できます。</p>
            <div style={{maxHeight:200,overflow:"auto"}}>
              {Object.entries(D.rules).map(([k,v]:any)=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",fontSize:11,borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                  <span style={{color:"#ccc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginRight:8}}>{k}</span>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                    <span style={{fontSize:10,color:EC[v]?.c||"#888"}}>{EC[v]?.i}{v}</span>
                    <button onClick={()=>sD((p:any)=>{const r={...p.rules};delete r[k];return{...p,rules:r};})} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:0}}>×</button>
                  </div>
                </div>))}
            </div>
          </div>}
          <div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 6px",color:"#ccc"}}>💼 収入一覧 ({cm})</h3>{md.incomes.length===0&&<p style={{fontSize:10,color:"#666",margin:0}}>未登録</p>}{md.incomes.map((inc:any)=>{const t=IT.find(x=>x.id===inc.type)||IT[4];return(<div key={inc.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",fontSize:11}}><span onClick={()=>openIn(inc)} style={{color:"#ccc",cursor:"pointer",flex:1}}>{t.i} {t.l} {inc.note&&<span style={{color:"#666"}}>({inc.note})</span>} <span style={{color:"#555",fontSize:9}}>✎</span></span><div style={{display:"flex",alignItems:"center",gap:6}}><span onClick={()=>openIn(inc)} style={{fontFamily:"monospace",color:t.c,fontWeight:600,cursor:"pointer"}}>¥{inc.amount.toLocaleString()}</span><button onClick={()=>uM((m:any)=>({...m,incomes:m.incomes.filter((i:any)=>i.id!==inc.id)}))} style={{background:"none",border:"none",color:"#555",cursor:"pointer"}}>×</button></div></div>);})}</div>
          <div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 6px",color:"#ccc"}}>💾 データのバックアップ</h3><p style={{fontSize:11,color:"#999",margin:"0 0 10px",lineHeight:1.6}}>データはこの端末のブラウザ内にだけ保存されます。機種変更やキャッシュ削除で消えないよう、定期的にファイルへ書き出して保管してください。別の端末へ引っ越す時も使えます。</p><div style={{display:"flex",gap:8}}><button onClick={exportData} style={{flex:1,background:"rgba(46,204,113,0.1)",border:"1px solid rgba(46,204,113,0.2)",color:"#2ECC71",padding:"9px 0",borderRadius:8,fontSize:12,cursor:"pointer",fontWeight:600}}>⬇️ 書き出し</button><button onClick={()=>{const inp=document.createElement("input");inp.type="file";inp.accept=".json,application/json";inp.onchange=(e:any)=>e.target.files[0]&&importData(e.target.files[0]);inp.click();}} style={{flex:1,background:"rgba(52,152,219,0.1)",border:"1px solid rgba(52,152,219,0.2)",color:"#3498DB",padding:"9px 0",borderRadius:8,fontSize:12,cursor:"pointer",fontWeight:600}}>⬆️ 読み込み</button></div>
            {(D as any).lastBackup&&<p style={{fontSize:9,color:"#666",margin:"6px 0 0"}}>最終バックアップ: {(D as any).lastBackup}</p>}
            <button onClick={exportCSV} style={{marginTop:8,background:"rgba(255,179,71,0.08)",border:"1px solid rgba(255,179,71,0.2)",color:"#FFB347",padding:"9px 0",borderRadius:8,fontSize:12,cursor:"pointer",width:"100%",fontWeight:600}}>📊 明細をCSVで書き出し（Excel用・全期間）</button></div>
          <div style={cs()}><button onClick={()=>sShHow(!shHow)} style={{background:"none",border:"none",color:"#FFB347",fontSize:13,fontWeight:600,cursor:"pointer",padding:0,width:"100%",textAlign:"left"}}>📖 使い方ガイド {shHow?"▲":"▼"}</button>
            {shHow&&<div style={{marginTop:10,fontSize:11,color:"#bbb",lineHeight:1.9}}>
              <p style={{margin:"0 0 8px"}}><b style={{color:"#3498DB"}}>1. 明細を取り込む</b><br/>カード会社のサイトでCSVかPDFをダウンロード→「明細取込」でアップ。日付どおりの月へ自動で振り分けられ、重複は自動スキップ。毎月アップするだけでたまっていきます。</p>
              <p style={{margin:"0 0 8px"}}><b style={{color:"#2ECC71"}}>2. 仕分けを育てる</b><br/>「明細」タブでカテゴリをタップして直すと、同じ店は次回から自動で正しく仕分けされます。自分のカテゴリは「カテゴリの管理」で作成。</p>
              <p style={{margin:"0 0 8px"}}><b style={{color:"#4ECDC4"}}>3. 予算と目標を決める</b><br/>ホームで月の予算を設定→「1日あと¥◯使える」が見えます。「資産」タブで純資産の目標も設定できます。</p>
              <p style={{margin:"0 0 8px"}}><b style={{color:"#FF8E53"}}>4. 決算書で振り返る</b><br/>P/L＝その月の稼ぎと使い、B/S＝今の資産と借金。月の比較・カレンダー・固定費一覧でどこを直すか探せます。</p>
              <p style={{margin:0}}><b style={{color:"#9B59B6"}}>5. 月に1回バックアップ</b><br/>データは端末内だけ。下の「書き出し」でファイル保存しておけば機種変更も安心です。</p>
            </div>}
          </div>
          <div style={cs()}><button onClick={()=>sShPriv(!shPriv)} style={{background:"none",border:"none",color:"#9B59B6",fontSize:13,fontWeight:600,cursor:"pointer",padding:0,width:"100%",textAlign:"left"}}>🔒 プライバシーポリシー・免責事項 {shPriv?"▲":"▼"}</button>
            {shPriv&&<div style={{marginTop:10,fontSize:10,color:"#aaa",lineHeight:1.9}}>
              <p style={{margin:"0 0 8px"}}><b style={{color:"#ccc"}}>データの取り扱い</b><br/>
              ・入力・取込されたすべてのデータ（明細・収入・資産・負債・設定）は、お使いの端末のブラウザ内（localStorage）にのみ保存されます。<br/>
              ・開発者を含む第三者のサーバーへの送信・収集は一切行いません。アカウント登録も不要です。<br/>
              ・Cookie・アクセス解析ツール・広告は使用していません。<br/>
              ・サイトの配信基盤（Netlify）が標準的なアクセスログ（IPアドレス等）を記録する場合があります。<br/>
              ・ブラウザのキャッシュ削除・端末の初期化等でデータは消去されます。「バックアップの書き出し」をご利用ください。</p>
              <p style={{margin:0}}><b style={{color:"#ccc"}}>免責事項</b><br/>
              ・本アプリは家計管理の参考情報を提供するものであり、集計・分類・コメントの正確性や完全性を保証するものではありません。<br/>
              ・表示される内容は投資・税務・法律等の専門的助言ではありません。重要な判断は原資料（明細書等）をご確認ください。<br/>
              ・本アプリの利用によって生じたいかなる損害についても、開発者は責任を負いません。自己責任でご利用ください。</p>
            </div>}
          </div>
          <div style={cs()}><h3 style={{fontSize:12,fontWeight:600,margin:"0 0 6px",color:"#ccc"}}>ℹ️ このアプリについて</h3>
            <p style={{fontSize:11,color:"#999",margin:0,lineHeight:1.8}}>💰 マイ家計簿 — <b style={{color:"#bbb"}}>完全無料・広告なし・登録不要</b>。すべてのデータはこの端末のブラウザ内にのみ保存され、外部には一切送信されません。分析・コメントもすべて端末内で動きます。<br/>
            <span style={{color:"#777"}}>困ったとき：データが消えた→「バックアップの読み込み」で復元 ／ 仕分けが違う→明細でカテゴリをタップして修正（自動で学習）／ カテゴリを増やしたい→上の「カテゴリの管理」</span></p>
          </div>
          <button onClick={()=>{if(confirm("全データをリセット？（先にバックアップの書き出しをおすすめします）")) sD(freshState());}} style={{background:"rgba(231,76,60,0.08)",border:"1px solid rgba(231,76,60,0.2)",color:"#E74C3C",padding:"10px 0",borderRadius:10,fontSize:11,cursor:"pointer",width:"100%",marginTop:8}}>🗑️ リセット</button>
        </div>)}
      </div>

      {/* Toast */}
      {toast&&<div style={{position:"fixed",bottom:76,left:"50%",transform:"translateX(-50%)",background:"#1c1c30",border:"1px solid rgba(255,255,255,0.15)",color:"#eee",padding:"9px 18px",borderRadius:999,fontSize:12,zIndex:300,boxShadow:"0 4px 20px rgba(0,0,0,0.5)",whiteSpace:"nowrap",maxWidth:"90vw",overflow:"hidden",textOverflow:"ellipsis"}}>{toast}</div>}

      {/* Nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#0f0f22",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"center",paddingBottom:"env(safe-area-inset-bottom,0px)",zIndex:50}}>
        <div style={{display:"flex",maxWidth:480,width:"100%"}}>{[{id:"home",ic:"🏠",l:"ホーム"},{id:"statement",ic:"📑",l:"決算書"},{id:"assets",ic:"💎",l:"資産"},{id:"list",ic:"📋",l:"明細"},{id:"more",ic:"⚙️",l:"設定"}].map(n=><button key={n.id} onClick={()=>{sPg(n.id);sEI(null);}} style={{flex:1,background:"none",border:"none",padding:"8px 0 6px",cursor:"pointer",color:pg===n.id?"#FF6B6B":"#666",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}><span style={{fontSize:17}}>{n.ic}</span><span style={{fontSize:8,fontWeight:pg===n.id?600:400}}>{n.l}</span></button>)}</div>
      </div>

      {/* Modals */}
      <BS open={shI} onClose={()=>{sShI(false);sEInId(null);}} title={eInId!=null?"💼 収入を編集":"💼 収入を追加"}><div style={{marginBottom:12}}><label style={{fontSize:10,color:"#888",display:"block",marginBottom:5}}>種類</label><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{IT.map(t=><button key={t.id} onClick={()=>sfIT(t.id)} style={{padding:"7px 12px",borderRadius:8,fontSize:11,cursor:"pointer",fontFamily:"inherit",background:fIT===t.id?t.c+"20":"rgba(255,255,255,0.04)",border:"1px solid "+(fIT===t.id?t.c+"50":"#333"),color:fIT===t.id?t.c:"#aaa"}}>{t.i} {t.l}</button>)}</div></div><FI label="金額" type="amount" value={fIA} onChange={sfIA}/><FI label="メモ" value={fIN} onChange={sfIN} placeholder="例: フリーランス"/><button onClick={addI} style={B1}>{eInId!=null?"保存":"追加"}</button></BS>

      <BS open={shE} onClose={()=>sShE(false)} title="💸 支出を追加">
        <div style={{marginBottom:12}}>
          <label style={{fontSize:10,color:"#888",marginBottom:5,display:"block"}}>カテゴリ</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:5,maxHeight:150,overflow:"auto"}}>
            {Object.entries(EC).map(([c,v])=><button key={c} onClick={()=>sfEC(c)} style={{padding:"6px 10px",borderRadius:999,fontSize:10,cursor:"pointer",fontFamily:"inherit",background:fEC===c?v.c+"22":"rgba(255,255,255,0.04)",border:"1px solid "+(fEC===c?v.c+"66":"#333"),color:fEC===c?v.c:"#aaa",fontWeight:fEC===c?700:400}}>{v.i}{c}</button>)}
          </div>
        </div>
        <FI label="金額" type="amount" value={fEA} onChange={sfEA}/><FI label="日付（空欄で今日）" value={fED} onChange={sfED} placeholder="例: 03/15"/><FI label="内容" value={fEN} onChange={sfEN} placeholder="例: ランチ代"/>
        <button onClick={addE} style={B1}>追加（連続入力OK）</button>
        <button onClick={()=>sShE(false)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid #333",color:"#999",padding:"9px 0",borderRadius:10,fontSize:12,cursor:"pointer",width:"100%",marginTop:8}}>閉じる</button>
      </BS>

      <BS open={shUp} onClose={()=>sShUp(false)} title="💳 明細をアップロード">
        <p style={{fontSize:12,color:"#bbb",margin:"0 0 10px",lineHeight:1.6}}>カード会社からダウンロードした明細（CSV / PDF）を選択してください。</p>
        <div style={{marginBottom:10}}>
          <label style={{fontSize:10,color:"#888",marginBottom:5,display:"block"}}>取引の入れ先</label>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>sUpMode("auto")} style={{flex:1,padding:"8px 4px",borderRadius:8,fontSize:10,cursor:"pointer",background:upMode==="auto"?"rgba(46,204,113,0.15)":"rgba(255,255,255,0.04)",border:"1px solid "+(upMode==="auto"?"rgba(46,204,113,0.4)":"#333"),color:upMode==="auto"?"#2ECC71":"#999",fontWeight:600,lineHeight:1.5}}>📅 日付どおりの月へ<br/>自動振り分け（推奨）</button>
            <button onClick={()=>sUpMode("cur")} style={{flex:1,padding:"8px 4px",borderRadius:8,fontSize:10,cursor:"pointer",background:upMode==="cur"?"rgba(52,152,219,0.15)":"rgba(255,255,255,0.04)",border:"1px solid "+(upMode==="cur"?"rgba(52,152,219,0.4)":"#333"),color:upMode==="cur"?"#3498DB":"#999",fontWeight:600,lineHeight:1.5}}>📌 表示中の月へ<br/>（{cm}）</button>
          </div>
        </div>
        <p style={{fontSize:10,color:"#777",margin:"0 0 12px",lineHeight:1.6}}>※ 月をまたぐ明細も自動で正しい月に入ります。同じ取引（日付・金額・内容が一致）は自動スキップされるので、何度アップロードしても重複しません。PDFは文字情報のあるもののみ対応。</p>
        <div onClick={()=>{if(upL)return;const inp=document.createElement("input");inp.type="file";inp.accept=".csv,.tsv,.txt,.pdf,application/pdf";inp.onchange=(e:any)=>e.target.files[0]&&handleUpload(e.target.files[0]);inp.click();}}
          style={{border:"2px dashed #333",borderRadius:14,padding:"28px 16px",textAlign:"center",cursor:"pointer",background:"rgba(255,255,255,0.02)",marginBottom:12}}>
          {upL?<div><div style={{fontSize:28}}>⏳</div><p style={{color:"#999",fontSize:12,margin:"6px 0 0"}}>読み取り中...</p></div>
          :<div><div style={{fontSize:28}}>📄</div><p style={{color:"#ccc",fontSize:13,margin:"6px 0 4px",fontWeight:600}}>タップして選択</p><p style={{color:"#888",fontSize:11,margin:0}}>CSV / TSV / PDF</p></div>}
        </div>
        {upR&&<div style={{padding:10,borderRadius:8,background:/^[✅ℹ]/.test(upR)?"rgba(46,204,113,0.1)":"rgba(255,80,80,0.1)",color:upR.startsWith("✅")?"#2ECC71":upR.startsWith("ℹ️")?"#3498DB":"#FF6B6B",fontSize:12}}>{upR}</div>}
      </BS>

      <BS open={shA} onClose={()=>sShA(false)} title={eAsId?"💎 資産を編集":"💎 資産を追加"}><p style={{fontSize:10,color:"#888",margin:"0 0 12px"}}>{eAsId?"金額・メモを変更できます。":"同じ種類は最新の残高で上書きされます。"}</p><FI label="種類" type="select" value={fAT} onChange={sfAT}>{AT.map(t=><option key={t.id} value={t.id}>{t.i} {t.l}</option>)}</FI><FI label="残高" type="amount" value={fAA} onChange={sfAA}/><FI label="メモ" value={fAN} onChange={sfAN} placeholder="例: SBI証券"/><button onClick={addAs} style={B1}>{eAsId?"保存":"追加"}</button></BS>
      <BS open={shL} onClose={()=>sShL(false)} title={eLiId?"💳 負債を編集":"💳 負債を追加"}><p style={{fontSize:10,color:"#888",margin:"0 0 12px"}}>{eLiId?"金額・メモを変更できます。":"ローン残高やカード未払い分などを入力します。同じ種類は上書きされます。"}</p><FI label="種類" type="select" value={fLT} onChange={sfLT}>{LT.map(t=><option key={t.id} value={t.id}>{t.i} {t.l}</option>)}</FI><FI label="残高" type="amount" value={fLA} onChange={sfLA}/><FI label="メモ" value={fLN} onChange={sfLN} placeholder="例: 〇〇銀行 住宅ローン"/><button onClick={addLi} style={{...B1,background:"linear-gradient(135deg,#FF6B6B,#E74C3C)"}}>{eLiId?"保存":"追加"}</button></BS>
      <BS open={shCat} onClose={()=>{sShCat(false);sECat(null);}} title={eCat?"🏷️ カテゴリを編集":"🏷️ カテゴリを作成"}>
        {eCat&&(eCat in ECB)?<p style={{fontSize:11,color:"#999",margin:"0 0 12px"}}>標準カテゴリ <b style={{color:"#ddd"}}>{eCat}</b> の見た目と種別を変更します（名前は変更できません）。</p>
        :<FI label="カテゴリ名" value={fCN} onChange={sfCN} placeholder="例: ペット / 子ども / 交際費"/>}
        <div style={{marginBottom:8}}>
          <label style={{fontSize:10,color:"#888",marginBottom:5,display:"block"}}>よく使う絵文字（タップで選択）</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {["🐕","🐈","👶","🎁","✈️","🍺","☕","💊","📱","🎨","⚽","🎮","🎓","🛒","💼","🚗","🎵","📷","🌸","💐"].map(e=><button key={e} onClick={()=>sfCI(e)} style={{fontSize:15,padding:"4px 7px",borderRadius:8,cursor:"pointer",background:fCI===e?"rgba(78,205,196,0.2)":"rgba(255,255,255,0.04)",border:"1px solid "+(fCI===e?"rgba(78,205,196,0.5)":"#333")}}>{e}</button>)}
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginBottom:12}}>
          <div style={{flex:1}}>
            <label style={{fontSize:10,color:"#888",marginBottom:5,display:"block"}}>絵文字（自由入力も可）</label>
            <input value={fCI} onChange={(e:any)=>sfCI(e.target.value)} maxLength={2} style={{width:"100%",boxSizing:"border-box",padding:"10px 12px",background:"rgba(255,255,255,0.05)",border:"1px solid #333",borderRadius:10,color:"#eee",fontSize:16,outline:"none",textAlign:"center"}}/>
          </div>
          <div style={{flex:1}}>
            <label style={{fontSize:10,color:"#888",marginBottom:5,display:"block"}}>色</label>
            <input type="color" value={fCCo} onChange={(e:any)=>sfCCo(e.target.value)} style={{width:"100%",height:41,boxSizing:"border-box",padding:4,background:"rgba(255,255,255,0.05)",border:"1px solid #333",borderRadius:10,cursor:"pointer"}}/>
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:10,color:"#888",marginBottom:5,display:"block"}}>種別（固定費＝毎月ほぼ同額でかかるもの）</label>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>sfCT("v")} style={{flex:1,padding:"9px 0",borderRadius:8,fontSize:12,cursor:"pointer",background:fCT==="v"?"rgba(243,156,18,0.15)":"rgba(255,255,255,0.04)",border:"1px solid "+(fCT==="v"?"rgba(243,156,18,0.4)":"#333"),color:fCT==="v"?"#F39C12":"#999",fontWeight:600}}>変動費</button>
            <button onClick={()=>sfCT("f")} style={{flex:1,padding:"9px 0",borderRadius:8,fontSize:12,cursor:"pointer",background:fCT==="f"?"rgba(52,152,219,0.15)":"rgba(255,255,255,0.04)",border:"1px solid "+(fCT==="f"?"rgba(52,152,219,0.4)":"#333"),color:fCT==="f"?"#3498DB":"#999",fontWeight:600}}>固定費</button>
          </div>
        </div>
        <div style={{marginBottom:12,padding:"8px 12px",background:"rgba(255,255,255,0.03)",borderRadius:10,fontSize:11,color:"#ccc"}}>プレビュー: <span style={{padding:"2px 8px",borderRadius:8,background:fCCo+"22",color:fCCo}}>{fCI}{eCat&&(eCat in ECB)?eCat:(fCN||"カテゴリ名")}</span></div>
        <button onClick={saveCat} style={B1}>{eCat?"保存":"作成"}</button>
      </BS>
      <BS open={shT} onClose={()=>{sShT(false);sETx(null);}} title="✏️ 取引を編集">
        <FI label="日付" value={fTD} onChange={sfTD} placeholder="例: 07/15"/>
        <FI label="内容（店名）" value={fTN} onChange={sfTN} placeholder="例: スーパー〇〇"/>
        <FI label="金額" type="amount" value={fTA} onChange={sfTA}/>
        <FI label="カテゴリ" type="select" value={fTC} onChange={sfTC}>{Object.entries(EC).map(([c,v])=><option key={c} value={c}>{v.i} {c}</option>)}</FI>
        <button onClick={saveTx} style={B1}>保存</button>
        <button onClick={()=>delTx(eTx)} style={{background:"rgba(231,76,60,0.08)",border:"1px solid rgba(231,76,60,0.25)",color:"#E74C3C",padding:"10px 0",borderRadius:10,fontSize:12,cursor:"pointer",width:"100%",marginTop:8,fontWeight:600}}>🗑️ この取引を削除</button>
      </BS>
      <BS open={shB} onClose={()=>sShB(false)} title="📏 月の予算を設定">
        <FI label="全体の月予算（空欄で未設定）" type="amount" value={fBT} onChange={sfBT} placeholder="例: 250000"/>
        <p style={{fontSize:10,color:"#888",margin:"0 0 8px"}}>カテゴリ別予算（任意）。金額を入れたものだけホームに表示されます。</p>
        <div style={{maxHeight:280,overflow:"auto",marginBottom:12,paddingRight:4}}>
          {Object.entries(EC).filter(([c])=>c!=="その他").map(([c,v])=>(
            <div key={c} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{flex:1,fontSize:11,color:"#ccc"}}>{v.i} {c}</span>
              <div style={{position:"relative",width:120}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"#666",fontSize:11}}>¥</span>
                <input type="number" inputMode="numeric" value={fBC[c]||""} onChange={(e:any)=>sfBC(p=>({...p,[c]:e.target.value}))} placeholder="—"
                  style={{width:"100%",boxSizing:"border-box",padding:"7px 8px 7px 20px",background:"rgba(255,255,255,0.05)",border:"1px solid #333",borderRadius:8,color:"#eee",fontSize:12,outline:"none",fontFamily:"monospace"}}/>
              </div>
            </div>))}
        </div>
        <button onClick={()=>{sD((p:any)=>({...p,budget:{total:Number(fBT)||0,cat:Object.fromEntries(Object.entries(fBC).map(([k,v])=>[k,Number(v)||0]).filter(([,n]:any)=>n>0))}}));sShB(false);}} style={B1}>保存</button>
      </BS>
      <BS open={shG} onClose={()=>sShG(false)} title="🎯 目標を設定"><FI label="目標純資産額（資産−負債）" type="amount" value={fNWA} onChange={sfNWA} placeholder="例: 10000000"/><div style={{borderTop:"1px dashed rgba(255,255,255,0.1)",margin:"4px 0 12px"}}/><FI label="年間の貯蓄目標額" type="amount" value={fGA} onChange={sfGA} placeholder="例: 1000000"/><FI label="目標名（貯蓄）" value={fGL} onChange={sfGL} placeholder="例: 旅行資金"/><button onClick={()=>{sD((p:any)=>({...p,goal:{target:Number(fGA)||0,label:fGL,nw:Number(fNWA)||0}}));sShG(false);}} style={B1}>設定</button></BS>

      <BS open={shM} onClose={()=>sShM(false)} title="📅 月を選択・追加">
        {Object.keys(D.months).sort().map(k=>{const v=D.months[k];const i=(v.incomes||[]).reduce((s:number,x:any)=>s+x.amount,0);const e=[...(v.cardExp||[]),...(v.manualExp||[])].reduce((s:number,x:any)=>s+x.amount,0);const b=i-e;return(
        <button key={k} onClick={()=>{sD((p:any)=>({...p,cur:k}));sShM(false);}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",padding:"10px 12px",marginBottom:4,borderRadius:8,fontSize:13,cursor:"pointer",textAlign:"left",background:k===cm?"rgba(255,107,107,0.12)":"rgba(255,255,255,0.03)",border:"1px solid "+(k===cm?"rgba(255,107,107,0.25)":"#333"),color:k===cm?"#FF6B6B":"#ccc"}}>
          <span>📅 {k} {k===cm&&<span style={{fontSize:10}}>（表示中）</span>}</span>
          <span style={{fontFamily:"monospace",fontSize:10,color:(i===0&&e===0)?"#666":b>=0?"#2ECC71":"#E74C3C"}}>{(i===0&&e===0)?"データなし":`${b>=0?"+":"−"}¥${Math.abs(b).toLocaleString()}`}</span>
        </button>);})}
        <div style={{marginTop:12}}><FI label="新しい月（YYYY-MM）" value={fNM} onChange={sfNM} placeholder="例: 2026-04"/><button onClick={()=>{if(!fNM)return;sD((p:any)=>({...p,months:{...p.months,[fNM]:p.months[fNM]||{incomes:[],manualExp:[],cardExp:[]}},cur:fNM}));sfNM("");sShM(false);}} style={B1}>追加して切替</button></div>
      </BS>
    </div>
  );
}

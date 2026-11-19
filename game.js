/* =====================================================================
   game.js  —  게임 진행 코드.
   대사는 dialogue.js 에 있고, 여기는 "무슨 순서로 보여 주는가"만 있습니다.

   읽는 순서 추천:  1) CONFIG·ART  →  2) 맨 아래 main()  →  3) 각 scene... 함수
   각 장면 함수는 위에서 아래로 읽으면 그대로 게임 진행입니다.
     await say(...)      대사 한 줄을 보여 주고 클릭을 기다림
     await ask(...)      대사 + 선택지. 고른 번호(0부터)를 돌려줌
     addGood(1)          선함 +1
   ===================================================================== */

/* ---------------------------- 1) 설정 ---------------------------- */
const CONFIG = {
  typeMs: 30,          // 글자 한 개가 나오는 시간(ms). 작을수록 빠름
  showScore: true,     // 화면 오른쪽 위에 선함 점수 보이기 (발표 시연용. 끄려면 false)
  goodForC: 8,         // 이 점수 이상이면 엔딩 C
  clearTreat: 2,       // 차사 대접에서 이만큼 맞혀야 통과
};

/* ---------------------------- 그림 설정 ----------------------------
   그림은 assets/ 폴더에 "이름.png" 로 넣으면 자동으로 바뀝니다.
   파일이 없으면 색 네모(임시 도형)가 대신 나옵니다.
   크기는 640×360 화면 기준 px 입니다.
   ------------------------------------------------------------------ */
const ASSET_DIR = "assets/";
const EXT = ".png";

// 배경 (640×360 이상, 16:9). 값은 파일이 없을 때 쓸 임시 색
const BG_COLOR = {
  bg_title:  "#3b5b3f",   // 돌하르방 마을
  bg_market: "#2f5a6b",   // 바닷가 장터 (장삿길)
  bg_forest: "#10201a",   // 컷신(숲)  ← 그림 없어도 됨
  bg_chasa:  "#3d2a5c",   // 보라색 원형 광장
  bg_ledger: "#5a4a30",   // 펼친 책
  bg_house:  "#5a4630",   // 사만이 집 안
  bg_hell:   "#3a2a6a",   // 저승 궁전 (엔딩 B)
  bg_gameover: "#2a2040", // 저승 돌길 (게임 오버)
  end_a:     "#2a2420",   // 엔딩 A 그림 (선택) 빈 밥상
  end_c:     "#2a4a5a",   // 엔딩 C 그림 (선택)
};

// 캐릭터·아이콘 크기 (화면 안 px). 도트 그림은 원본의 정수배(1·2·3배)로만 쓰세요. 예) 16×32 NPC → 32×64
const SPRITE = {
  char_samani:          { w: 32,  h: 64,  label: "사만이" },
  char_wife:            { w: 32,  h: 64,  label: "아내" },
  char_osamani:         { w: 32,  h: 64,  label: "오사만이" },
  char_skull:           { w: 64,  h: 64,  label: "백년해골" },
  char_chasa_myeong:    { w: 192, h: 192, label: "명차지 차사" },
  char_chasa_bok:       { w: 192, h: 192, label: "복차지 차사" },
  char_chasa_nokmyeong: { w: 192, h: 192, label: "녹명차지 차사" },
  npc_child1:           { w: 32,  h: 64,  label: "아이" },
  npc_child2:           { w: 32,  h: 64,  label: "아이" },
  npc_elder1:           { w: 32,  h: 64,  label: "노인" },
  npc_elder2:           { w: 32,  h: 64,  label: "노인" },
  npc_osamani:          { w: 32,  h: 64,  label: "오사만이" },
  npc_merchant:         { w: 32,  h: 64,  label: "총 상인" },
  prop_table_food:      { w: 64,  h: 48,  label: "제사상" },
  prop_table_empty:     { w: 64,  h: 48,  label: "빈 밥상" },
  icon_horse:           { w: 32,  h: 32,  label: "말" },
  icon_shoes:           { w: 32,  h: 32,  label: "신" },
  icon_rice:            { w: 32,  h: 32,  label: "밥" },
};

// 장삿길(클릭 화면)에서 NPC가 서 있는 자리 (x, y = 왼쪽 위 모서리). y는 240 이하로.
const MARKET_POS = {
  child1:   { x: 245, y: 182 },
  child2:   { x: 290, y: 198 },
  elder1:   { x: 350, y: 182 },
  elder2:   { x: 395, y: 198 },
  osamani:  { x: 460, y: 186 },
  merchant: { x: 548, y: 190 },
};
const MARKET_SPRITE = {   // NPC id → 그림 이름
  child1: "npc_child1", child2: "npc_child2", elder1: "npc_elder1",
  elder2: "npc_elder2", osamani: "npc_osamani", merchant: "npc_merchant",
};
// 차사 3명 이름과 그림
const CHASA = [
  { key: "myeong",    art: "char_chasa_myeong" },
  { key: "bok",       art: "char_chasa_bok" },
  { key: "nokmyeong", art: "char_chasa_nokmyeong" },
];
const CHASA_X = [110, 320, 530];   // 차사 3명의 가로 중심 위치

/* ---------------------------- 2) 기본 도구 ---------------------------- */
const $ = (id) => document.getElementById(id);
const stage = $("stage");
const params = new URLSearchParams(location.search);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let good = 0;   // 선함 점수 (0~10)

/* 그림 한 장을 만들어 돌려준다. 파일이 없으면 임시 도형이 남는다. */
function makeArt(file, w, h, label) {
  const el = document.createElement("div");
  el.className = "art";
  el.style.width = w + "px";
  el.style.height = h + "px";
  const ph = document.createElement("div");
  ph.className = "ph";
  // 작은 그림은 글자가 넘치므로 파일명을 생략 (NPC는 머리 위 이름표가 따로 있음)
  ph.textContent = w >= 80 ? (label ? label + "\n" : "") + file + EXT : "";
  ph.style.whiteSpace = "pre-wrap";
  ph.style.overflow = "hidden";
  el.appendChild(ph);
  const img = new Image();
  img.onload = () => { ph.remove(); el.appendChild(img); };
  img.src = ASSET_DIR + file + EXT;      // 없으면 onerror 없이 그냥 임시 도형 유지
  img.draggable = false;
  return el;
}

function setBg(key, dim = false) {
  const bg = $("bg");
  bg.innerHTML = "";
  bg.classList.toggle("dim", dim);
  const el = makeArt(key, 640, 360, "");
  const ph = el.querySelector(".ph");
  ph.style.background = BG_COLOR[key] || "#222";
  ph.style.alignItems = "flex-start"; ph.style.justifyContent = "flex-start";
  ph.style.border = "none"; ph.style.textAlign = "left";
  ph.style.opacity = ".6";
  el.style.left = "0"; el.style.top = "0";
  bg.appendChild(el);
}

/* 캐릭터 한 명을 화면에 올린다. 중심 x, 아래쪽 y 를 주면 알아서 자리 잡음 */
function addSprite(key, opts = {}) {
  const def = SPRITE[key] || { w: 48, h: 64, label: key };
  const el = makeArt(key, def.w, def.h, def.label);
  const x = opts.cx !== undefined ? opts.cx - def.w / 2 : opts.x;
  const y = opts.bottom !== undefined ? opts.bottom - def.h : opts.y;
  el.style.left = x + "px";
  el.style.top = y + "px";
  $("sprites").appendChild(el);
  return el;
}
function clearSprites() { $("sprites").innerHTML = ""; }

function addGood(n) {
  good = Math.max(0, Math.min(10, good + n));
  updateHud();
  if (n > 0) toast("선함 +" + n);
}
function updateHud() { $("goodNum").textContent = good; }
function showHud(on) { $("hud").hidden = !(on && CONFIG.showScore); }
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 1200);
}
/* 대화창 틀: assets/ui_dialog.png 가 있으면 그 틀(모서리 6px를 늘려 씀)을 대화창·선택지에 씌운다 */
(function () {
  const img = new Image();
  img.onload = () => stage.classList.add("skin");   // style.css 의 #stage.skin 규칙이 켜짐
  img.src = ASSET_DIR + "ui_dialog" + EXT;
})();

function setHint(msg) { const h = $("hint"); h.hidden = !msg; h.textContent = msg || ""; }

/* ---------------------------- 3) 대화창·선택지 ---------------------------- */
let typing = false;      // 지금 글자가 나오는 중인가
let finishLine = null;   // 글자 나오는 중 클릭하면 즉시 완성
let advance = null;      // 다 나온 뒤 클릭하면 다음으로

function onAdvance() {
  if (typing && finishLine) finishLine();
  else if (advance) advance();
}
stage.addEventListener("click", onAdvance);
document.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); onAdvance(); }
  else if (e.key.toLowerCase() === "f") toggleFullscreen();
  else if (/^[1-9]$/.test(e.key) && pickByKey) pickByKey(Number(e.key) - 1);
});

/* 대사 한 줄. wait=false 면 글자만 다 나오면 바로 끝남 (선택지 앞에서 씀) */
function say(who, text, wait = true) {
  // dialogue.js 에서 ["@bg", "bg_house"] 처럼 쓰면 대사 대신 배경을 바꾼다
  if (who === "@bg") { setBg(text); return Promise.resolve(); }
  return new Promise((resolve) => {
    const dlg = $("dialog");
    dlg.hidden = false;
    dlg.classList.toggle("narr", !who);
    const nameEl = $("name");
    nameEl.textContent = who || "";
    nameEl.style.display = who ? "block" : "none";
    const textEl = $("text");
    const nextEl = $("next");
    textEl.textContent = "";
    nextEl.style.visibility = "hidden";

    let i = 0;
    typing = true;
    let timer = null;
    const done = () => {
      clearInterval(timer);
      typing = false; finishLine = null;
      textEl.textContent = text;
      if (!wait) return resolve();
      nextEl.style.visibility = "visible";
      advance = () => { advance = null; nextEl.style.visibility = "hidden"; resolve(); };
    };
    finishLine = done;
    if (CONFIG.typeMs <= 0) return done();
    timer = setInterval(() => {
      i++;
      textEl.textContent = text.slice(0, i);
      if (i >= text.length) done();
    }, CONFIG.typeMs);
  });
}

/* 선택지를 띄우고 고른 번호를 돌려준다.
   options: [{text, icon?}]    opts.center = true 면 화면 아래 가운데 */
let pickByKey = null;
function choose(options, opts = {}) {
  return new Promise((resolve) => {
    const box = $("choices");
    box.innerHTML = "";
    box.classList.toggle("center", !!opts.center);
    const pick = (i) => {
      pickByKey = null;
      box.innerHTML = "";
      resolve(i);
    };
    options.forEach((o, i) => {
      const b = document.createElement("div");
      b.className = "choice";
      if (o.icon) {
        const wrap = document.createElement("div");
        wrap.className = "icon";
        const d = SPRITE[o.icon] || { w: 24, h: 24, label: "" };
        const art = makeArt(o.icon, d.w, d.h, d.label);
        art.style.position = "absolute";
        wrap.appendChild(art);
        b.appendChild(wrap);
      }
      const k = document.createElement("span");
      k.className = "key"; k.textContent = i + 1;
      b.appendChild(k);
      b.appendChild(document.createTextNode(o.text));
      b.addEventListener("click", (e) => { e.stopPropagation(); pick(i); });
      box.appendChild(b);
    });
    pickByKey = (i) => { if (i < options.length) pick(i); };
  });
}

/* 대사 + 선택지 */
async function ask(who, text, options, opts) {
  await say(who, text, false);
  return choose(options, opts);
}

/* 대사 여러 줄. choices 를 주면 마지막 줄에서 선택지를 띄우고 번호를 돌려줌 */
async function sayLines(lines, choices) {
  for (let i = 0; i < lines.length; i++) {
    const [who, text] = lines[i];
    if (choices && i === lines.length - 1) return ask(who, text, choices);
    await say(who, text);
  }
}

function hideDialog() { $("dialog").hidden = true; $("choices").innerHTML = ""; }

/* ---------------------------- 4) 장면 전환 ---------------------------- */
async function transition(setup) {
  const f = $("fade");
  f.classList.add("on");
  await sleep(320);
  hideDialog();
  clearSprites();
  $("titleui").hidden = true;
  $("card").hidden = true;
  setHint("");
  setup();
  await sleep(60);
  f.classList.remove("on");
  await sleep(320);
}

/* 클릭할 때까지 기다림 (카드 화면용) */
function waitClick() {
  return new Promise((resolve) => {
    typing = false;
    advance = () => { advance = null; resolve(); };
  });
}

/* 차사 3명을 화면에 올린다. highlight 에 번호를 주면 그 차사만 밝게 */
function showChasa(highlight = -1, withTable = true) {
  clearSprites();
  CHASA.forEach((c, i) => {
    const el = addSprite(c.art, { cx: CHASA_X[i], bottom: 252 });
    if (highlight >= 0 && i !== highlight) el.classList.add("dimmed");
  });
  if (withTable) addSprite("prop_table_food", { cx: 320, bottom: 250 });   // 차사들 앞 제사상
}

/* ---------------------------- 5) 장면들 ---------------------------- */

/* 타이틀 */
async function sceneTitle() {
  await transition(() => {
    setBg("bg_title");
    showHud(false);
    const ui = $("titleui");
    ui.hidden = false;
    ui.innerHTML = "";
    const logo = new Image();
    logo.src = ASSET_DIR + "title_logo" + EXT;
    const text = document.createElement("div");
    text.innerHTML = `<div class="big">${SCRIPT.title.name}</div><div class="sub">${SCRIPT.title.sub}</div>`;
    ui.appendChild(text);
    logo.onload = () => { ui.innerHTML = ""; ui.appendChild(logo); };   // title_logo.png 가 있으면 그걸로 대체
  });
  await choose([{ text: SCRIPT.title.start }], { center: true });
}

/* 성격 질문 3개 */
async function sceneQuiz() {
  await transition(() => { setBg("bg_title", true); showHud(true); });
  await sayLines(SCRIPT.quizIntro);
  for (const q of SCRIPT.quiz) {
    const i = await ask("", q.question, q.choices);
    if (q.choices[i].good) addGood(1);
  }
  await sayLines(SCRIPT.quizOutro);
}

/* 장삿길 (클릭 화면) */
async function sceneMarket() {
  await transition(() => {
    setBg("bg_house");   // 도입은 집 안에서 시작, dialogue.js 의 "@bg" 줄에서 장터로 바뀜
    showHud(true);
    addSprite("char_wife", { cx: 320, bottom: 240 });
  });
  await sayLines(SCRIPT.marketIntro);
  clearSprites();

  // NPC 올리기
  const visited = new Set();
  let gaveMoney = false;   // 한 명이라도 도왔으면 돈이 없어 총을 외상으로 산다
  let clickedNpc = null;
  const els = {};
  for (const id of Object.keys(MARKET_POS)) {
    const key = MARKET_SPRITE[id];
    const el = addSprite(key, { x: MARKET_POS[id].x, y: MARKET_POS[id].y });
    el.classList.add("npc");
    const lab = document.createElement("div");
    lab.className = "lab";
    lab.textContent = (id === "merchant" ? SCRIPT.merchant : SCRIPT.npcs[id]).label;
    el.appendChild(lab);
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (clickedNpc === "wait") clickedNpc = id;   // 대화 중이 아닐 때만 받음
    });
    els[id] = el;
  }
  setHint(SCRIPT.marketHint);
  hideDialog();

  while (true) {
    // NPC 클릭 기다리기
    clickedNpc = "wait";
    const id = await new Promise((resolve) => {
      const t = setInterval(() => {
        if (clickedNpc !== "wait") { clearInterval(t); resolve(clickedNpc); }
      }, 30);
    });
    clickedNpc = null;
    if (id !== "merchant" && visited.has(id)) continue;   // 이미 말 건 사람

    setHint("");
    if (id === "merchant") {
      const i = await sayLines(SCRIPT.merchant.lines, SCRIPT.merchant.choices);
      if (SCRIPT.merchant.choices[i].next) {
        await sayLines(gaveMoney ? SCRIPT.merchant.credit : SCRIPT.merchant.paid);
        setHint("");
        return;
      }
    } else {
      const n = SCRIPT.npcs[id];
      const i = await sayLines(n.lines, n.choices);
      if (n.choices) {
        if (n.choices[i].help) { addGood(1); gaveMoney = true; await sayLines(n.helped); }
        else await sayLines(n.passed);
      }
      visited.add(id);
      els[id].classList.add("done");
    }
    hideDialog();
    setHint(SCRIPT.marketHint);
  }
}

/* 컷신 (숲 · 백년해골) */
async function sceneCutscene() {
  await transition(() => { setBg("bg_forest"); showHud(true); });
  let skullShown = false;
  for (const [who, text] of SCRIPT.cutscene) {
    if (who === NAMES.skull && !skullShown) {
      skullShown = true;
      addSprite("char_skull", { cx: 320, bottom: 240 });
    }
    await say(who, text);
  }
}

/* 저승사자 장면: 세 번 부름 → 대접 → (통과 / 게임 오버) */
async function sceneChasa() {
  const goodAtStart = good;   // 게임 오버 뒤 다시 할 때 대접 점수를 되돌리려고 기억
  while (true) {
    good = goodAtStart; updateHud();
    await transition(() => { setBg("bg_chasa"); showHud(true); showChasa(); });
    await sayLines(SCRIPT.chasaIntro);

    await callThreeTimes();
    const rightCount = await treatChasa();

    if (rightCount >= CONFIG.clearTreat) {
      await sayLines(SCRIPT.treatPass);
      return;
    }
    await sceneGameOver();   // 끝나면 반복문 처음으로 돌아가 다시 도전
  }
}

/* 세 번 부름: 1·2번째는 참고, 3번째에 대답해야 통과. 틀리면 처음부터 */
async function callThreeTimes() {
  while (true) {
    let ok = true;
    for (let n = 0; n < 3; n++) {
      const [who, text] = SCRIPT.calls[n];
      const picked = await ask(who, text, SCRIPT.callChoices.map((t) => ({ text: t })));
      const answered = picked === 0;               // 0 = 대답한다, 1 = 참는다
      const correct = n < 2 ? !answered : answered;
      if (!correct) {
        await sayLines(n < 2 ? SCRIPT.callWrongEarly : SCRIPT.callWrongLate);
        ok = false;
        break;
      }
      if (n < 2) await sayLines([SCRIPT.callIgnoreOk[n]]);
      else await sayLines(SCRIPT.callAnswerOk);
    }
    if (ok) return;
  }
}

/* 대접: 차사 셋에게 하나씩. 맞힌 수를 돌려줌 */
async function treatChasa() {
  let right = 0;
  const keys = Object.keys(SCRIPT.treatChoices);   // horse, shoes, rice
  const options = keys.map((k) => ({ text: SCRIPT.treatChoices[k], icon: "icon_" + k }));
  for (let i = 0; i < SCRIPT.treat.length; i++) {
    const t = SCRIPT.treat[i];
    showChasa(i);
    const picked = await sayLines(t.lines, options);
    if (keys[picked] === t.answer) {
      right++;
      addGood(1);
      await sayLines(t.right);
    } else {
      await sayLines(t.wrong);
    }
  }
  return right;
}

/* 게임 오버: 끌려가는 짧은 화면 */
async function sceneGameOver() {
  await transition(() => { setBg("bg_gameover", true); showHud(false); });
  const card = $("card");
  card.hidden = false;
  card.className = "over";
  card.innerHTML = `<div class="t">${SCRIPT.gameOver.title}</div>`;
  await sleep(500);
  await sayLines(SCRIPT.gameOver.lines);
  hideDialog();
  await choose([{ text: SCRIPT.gameOver.retry }], { center: true });
}

/* 명부 장면: 이름을 적을지 고른다. 엔딩 글자(A/B/C)를 돌려줌 */
async function sceneLedger() {
  await transition(() => { setBg("bg_ledger"); showHud(true); showChasa(-1, false); });
  const L = SCRIPT.ledger;
  await sayLines(L.slice(0, -1));
  const i = await sayLines([L[L.length - 1]], SCRIPT.ledgerChoices);
  if (SCRIPT.ledgerChoices[i].write) return "A";
  return good >= CONFIG.goodForC ? "C" : "B";
}

/* 엔딩 A / B / C + 크레딧 */
async function sceneEnding(code) {
  const E = SCRIPT.endings[code];
  const bgKey = code === "A" ? "end_a" : code === "B" ? "bg_hell" : "end_c";
  await transition(() => { setBg(bgKey, true); showHud(false); });

  // 엔딩 제목 카드
  const card = $("card");
  card.hidden = false;
  card.className = "";
  card.innerHTML = `<div class="t">${E.title}</div>`;
  await waitClick();
  card.hidden = true;

  // 엔딩 글 (엔딩 A에는 빈 밥상, 엔딩 B·C에는 인물 그림)
  if (code === "A") addSprite("prop_table_empty", { cx: 320, bottom: 244 });
  if (code === "B") addSprite("char_samani", { cx: 320, bottom: 240 });
  if (code === "C") {
    addSprite("char_samani", { cx: 250, bottom: 240 });
    addSprite("char_osamani", { cx: 390, bottom: 240 });
    addSprite("char_skull", { cx: 100, bottom: 240 });
  }
  await sayLines(E.lines);

  // 크레딧
  await transition(() => { setBg("bg_forest", true); });
  hideDialog();
  card.hidden = false;
  card.className = "solid";
  const C = SCRIPT.credits;
  card.innerHTML =
    `<div class="t">${C.title}</div><div class="b">${C.text}</div>` +
    `<div class="s">엔딩 ${code} · 선함 ${good} / 10</div>`;
  await choose([{ text: C.again }], { center: true });
  location.href = location.pathname;   // 처음부터 다시
}

/* ---------------------------- 6) 전체 흐름 ---------------------------- */
/* 테스트용 주소 옵션:
     ?scene=quiz | market | cutscene | chasa | ledger | ending_a | ending_b | ending_c | gameover
     ?good=8      선함 점수를 미리 정해 둠
     ?fast=1      글자를 한 번에 표시 (빠른 테스트)                           */
async function main() {
  if (params.has("fast")) CONFIG.typeMs = 0;
  if (params.has("good")) good = Number(params.get("good")) || 0;
  updateHud();

  const start = params.get("scene") || "title";
  if (start.startsWith("ending_")) return sceneEnding(start.slice(7).toUpperCase());
  if (start === "gameover") { await sceneGameOver(); }

  // 장면 순서: 이 배열 순서대로 플레이된다. 마지막 명부 장면이 엔딩을 정한다.
  const order = [
    ["title", sceneTitle], ["quiz", sceneQuiz], ["market", sceneMarket],
    ["cutscene", sceneCutscene], ["chasa", sceneChasa],
  ];
  const from = start === "gameover" ? "chasa" : start;
  // from 이 "ledger" 면 해당 이름이 없어 -1 → 전부 건너뛰고 바로 명부 장면
  const found = order.findIndex(([name]) => name === from);
  const startIdx = from === "ledger" ? order.length : Math.max(0, found);
  for (let i = startIdx; i < order.length; i++) await order[i][1]();

  const code = await sceneLedger();
  await sceneEnding(code);
}

/* ---------------------------- 7) 화면 크기 맞추기 ---------------------------- */
/* 640×360 을 정수 배율(2·3·4·6배…)로만 키운다. 고해상도(레티나)에서도 선명하게. */
function fit() {
  const dpr = window.devicePixelRatio || 1;
  const fx = (window.innerWidth * dpr) / 640;
  const fy = (window.innerHeight * dpr) / 360;
  let s = Math.floor(Math.min(fx, fy));
  if (s < 1) s = Math.min(fx, fy);   // 아주 작은 창은 어쩔 수 없이 축소
  stage.style.transform = `scale(${s / dpr})`;
}
window.addEventListener("resize", fit);
fit();

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
}
$("fsBtn").addEventListener("click", toggleFullscreen);

// 폰트가 준비된 뒤 시작 (글자 깨짐 방지)
Promise.all([
  document.fonts.load('14px "Galmuri14"'),
  document.fonts.load('11px "Galmuri11"'),
]).catch(() => {}).then(main);

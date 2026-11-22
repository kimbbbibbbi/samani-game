/* =====================================================================
   game.js  —  게임 진행 코드.
   대사는 dialogue.js 에 있고, 여기는 "무슨 순서로 보여 주는가"만 있습니다.

   읽는 순서 추천:  1) CONFIG·ART  →  2) 맨 아래 main()  →  3) 각 scene... 함수
   각 장면 함수는 위에서 아래로 읽으면 그대로 게임 진행입니다.
     await say(...)      대사 한 줄을 보여 주고 클릭을 기다림
     await ask(...)      대사 + 선택지. 고른 번호(0부터)를 돌려줌
     addGood(1)          선함 +1  (addGood(-1) = 선함 -1)
   ===================================================================== */

/* ---------------------------- 1) 설정 ---------------------------- */
const CONFIG = {
  typeMs: 30,          // 글자 한 개가 나오는 시간(ms). 작을수록 빠름
  showScore: true,     // 화면 오른쪽 위에 선함 점수 보이기 (발표 시연용. 끄려면 false)
  goodForC: 6,         // 명부에서 이름을 안 적었을 때 이 점수 이상이면 엔딩 C, 아니면 B
                       // 선함 최고 7 (질문 4 + 부인 1 + 아이들 1 + 노인들 1), 최저 -6 (질문 -3, 부인·아이들·노인들 각 -1)
                       // 대접을 통과했을 때 선함 0 이하면 명부 없이 엔딩 D
  // 세 번 부름 미니게임
  mgVolleyMs: 1800,    // 차사들이 "사만아!"를 쏘는 간격. 한 번 쏠 때마다 부른 횟수 +1, 모두 3번
  mgFallMs: 800,       // 글자가 위에서 사만이까지 날아오는 시간 (작을수록 빠름)
  // 소리
  sfxVolume: 0.6,      // 효과음 전체 크기 (0~1)
  typeVolume: 0.25,    // 글자 타이핑 소리 크기 (0~1). 시끄러우면 줄이기
  typeEveryMs: 70,     // 타이핑 소리 최소 간격(ms). 클수록 덜 자주 남
  bgmVolume: 0.3,      // 배경 음악 크기 (0~1)
  bgmDuck: 0.35,       // 미니게임 중 배경 음악을 이 배율로 줄임 (0.35 = 35% 크기)
  bgmFadeMs: 600,      // 장면이 바뀔 때 음악이 줄어들고 커지는 시간(ms)
  creditsSpeed: 50,    // 크레딧이 올라가는 속도 (1초에 몇 px). 클수록 빠름
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
  bg_house_rich: "#6a4a2a", // 부자가 된 기와집 (해골을 모신 뒤)
  bg_hell:   "#3a2a6a",   // 저승 궁전 (엔딩 B)
  bg_gameover: "#2a2040", // 저승 돌길 (게임 오버)
  end_a:     "#2a2420",   // 엔딩 A 그림 (선택) 빈 밥상
  end_c:     "#2a4a5a",   // 엔딩 C 그림 (선택)
};

// 캐릭터·아이콘 크기 (화면 안 px). 도트 그림은 원본의 정수배(1·2·3배)로만 쓰세요. 예) 16×32 NPC → 48×96 (3배)
// 새 그림(아이들·노인들·총포상·사만이 아이 둘·깨끗한 해골)은 원본 그대로(1배)
// 차사(96×96 원본)는 3배(288)로 키우면 화면 높이(360)를 넘고 셋이 겹쳐서 2배(192) 그대로 둠
const SPRITE = {
  char_samani:          { w: 48,  h: 96,  label: "사만이" },   // 16×32 원본을 3배
  char_wife:            { w: 48,  h: 96,  label: "아내" },     // 3배
  char_samani_child1:   { w: 32,  h: 48,  label: "사만이 딸" },   // 32×48 원본 그대로 (어른 절반 키)
  char_samani_child2:   { w: 32,  h: 48,  label: "사만이 아들" },
  // 상반신 일러스트 (96×96 원본을 2배). 파일이 없으면 화면에 안 나옴
  portrait_samani:      { w: 192, h: 192, label: "사만이", optional: true },
  portrait_wife:        { w: 104, h: 157, label: "부인", optional: true },   // 원본 1배 (assets/src/portrait_wife_1254.png 를 줄인 것)
  char_osamani:         { w: 48,  h: 96,  label: "오사만이" },
  char_skull:           { w: 96,  h: 96,  label: "백년해골" },   // 덩굴 해골: 숲에서만
  char_skull_clean:     { w: 64,  h: 64,  label: "백년해골" },   // 깨끗한 해골: 기와집·엔딩 C (32×32 원본을 2배)
  char_chasa_myeong:    { w: 192, h: 192, label: "명차지 차사" },
  char_chasa_bok:       { w: 192, h: 192, label: "복차지 차사" },
  char_chasa_nokmyeong: { w: 192, h: 192, label: "녹명차지 차사" },
  npc_child1:           { w: 64,  h: 96,  label: "아이" },
  npc_child2:           { w: 64,  h: 96,  label: "아이" },
  npc_elder1:           { w: 64,  h: 96,  label: "노인" },
  npc_elder2:           { w: 64,  h: 96,  label: "노인" },
  npc_osamani:          { w: 48,  h: 96,  label: "오사만이" },
  npc_merchant:         { w: 64,  h: 96,  label: "총포상" },
  prop_table_food:      { w: 64,  h: 48,  label: "제사상" },
  prop_table_empty:     { w: 64,  h: 48,  label: "빈 밥상" },
  face_chasa_myeong:    { w: 64,  h: 64,  label: "명차지" },
  face_chasa_bok:       { w: 64,  h: 64,  label: "복차지" },
  face_chasa_nokmyeong: { w: 64,  h: 64,  label: "녹명차지" },
  icon_horse:           { w: 32,  h: 32,  label: "말" },
  icon_shoes:           { w: 32,  h: 32,  label: "신" },
  icon_rice:            { w: 32,  h: 32,  label: "밥" },
};

// 1스테이지 집 배경(bg_house.png)에서 문이 있는 자리. 이 네모를 누르면 장터로 나간다 (640×360 기준)
const HOUSE_DOOR = { x: 302, y: 52, w: 110, h: 136 };

// 장삿길(클릭 화면)의 NPC: 대화 상대 하나에 그림 여러 개 가능 (아이 둘, 노인 둘이 함께 나옴)
// [그림 이름, x, y]  (x, y = 왼쪽 위 모서리, 640×360 기준)
const MARKET_NPCS = {
  children: [["npc_child1", 109, 162], ["npc_child2", 137, 162]],   // 왼쪽 앞 귤 좌판 앞 (둘 간격 28)
  elders:   [["npc_elder1", 211, 92], ["npc_elder2", 241, 92]],     // 왼쪽 뒤 좌판 앞 (둘 간격 30)
  osamani:  [["npc_osamani", 431, 82]],                             // 오른쪽 뒤 좌판 앞
  merchant: [["npc_merchant", 501, 140]],                           // 오른쪽 앞 좌판 앞
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
  if (key === "black") return;
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
  el.dataset.key = key;
  if (opts.optional || def.optional) el.classList.add("optional");
  $("sprites").appendChild(el);
  return el;
}
function clearSprites() { $("sprites").innerHTML = ""; }

/* ---------------------------- 효과음 ----------------------------
   assets/audio/이름.mp3 를 재생. 파일이 없으면 조용히 넘어감.
   M 키나 화면 오른쪽 아래 버튼으로 소리 끄기/켜기
   보통(사이트·서버)은 배경 음악과 같은 Web Audio 로 튼다: 미리 한 번 읽어 두고
   소리마다 <audio> 를 새로 만들지 않아 가볍다 (아이패드 사파리 끊김 방지).
   파일로 바로 열었을 때(file://)만 <audio> 로 튼다.                  */
const AUDIO_DIR = ASSET_DIR + "audio/";
const FILE_MODE = location.protocol === "file:";
const SFX_NAMES = ["type", "select", "next", "heart", "coin", "transition", "skull",
  "good_up", "good_down", "silent", "correct", "wrong", "gameover", "saman"];
const SFX = {};       // 파일로 열었을 때 쓰는 <audio>
const SFX_BUF = {};   // Web Audio 로 미리 읽어 둔 효과음 (bgmSetup 에서 채움)
if (FILE_MODE) SFX_NAMES.forEach((n) => { const a = new Audio(AUDIO_DIR + "sfx_" + n + ".mp3"); a.preload = "auto"; SFX[n] = a; });
let muted = false;
let lastType = 0;
function sfx(name, volume = 1) {
  if (muted || BGM.away) return;
  const v = Math.min(1, CONFIG.sfxVolume * volume);
  if (SFX_BUF[name] && BGM.ctx) {
    const src = BGM.ctx.createBufferSource();
    src.buffer = SFX_BUF[name];
    const g = BGM.ctx.createGain();
    g.gain.value = v;
    src.connect(g).connect(BGM.ctx.destination);
    src.start();
    return;
  }
  if (!SFX[name]) return;
  try {
    const a = SFX[name].cloneNode();          // 겹쳐서 나도 되게 복사해서 재생
    a.volume = v;
    a.play().catch(() => {});
  } catch (e) {}
}
function toggleMute() {
  muted = !muted;
  $("muteBtn").textContent = muted ? "소리 켜기 (M)" : "소리 끄기 (M)";
  bgmVolumeNow();
}

/* ---------------------------- 배경 음악 ----------------------------
   assets/audio/bgm_이름.mp3 를 장면마다 끝없이 반복 재생.
   Web Audio 로 틀어서 반복할 때 이음새가 끊기지 않음. 파일이 없으면 조용히 넘어감.
   브라우저는 첫 클릭·키 입력 전에는 소리를 막으므로, 그때부터 들린다.
     bgm("title")  → 그 곡으로 바꿈 (이미 그 곡이면 그대로 둠)
     bgm(null)     → 음악 끔
     bgmDuck(true) → 잠깐 작게 (미니게임)
   메모리를 아끼려고 처음엔 mp3 파일만 받아 두고, 곡을 풀어서(decode) 메모리에 올리는 건
   그 곡이 필요할 때만 한다. 다 쓴 곡은 다시 버린다 (6곡을 다 풀면 140MB 가 넘음).
   index.html 을 파일로 바로 열면(file://) 브라우저가 fetch 를 막아서 Web Audio 를 못 씀.
   그때는 <audio> 로 대신 튼다 (반복되는 순간 아주 짧게 끊길 수 있음).              */
const BGM_NAMES = ["title", "village", "eerie", "tense", "ending_happy", "ending_sad"];
const BGM = { ctx: null, master: null, raw: {}, loading: {}, buffers: {}, now: null, want: null, ducked: false, away: false,
  fileMode: FILE_MODE, els: {} };
(function bgmSetup() {
  if (BGM.fileMode) {                                     // 파일로 열었을 때: <audio> 로 재생
    BGM_NAMES.forEach((n) => {
      const el = new Audio(AUDIO_DIR + "bgm_" + n + ".mp3");
      el.loop = true; el.preload = "auto"; el._fade = 1;
      BGM.els[n] = el;
    });
    const unlock = () => { if (BGM.now && BGM.now.el.paused) BGM.now.el.play().catch(() => {}); };
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  BGM.ctx = new AC();
  BGM.master = BGM.ctx.createGain();
  BGM.master.connect(BGM.ctx.destination);
  BGM.master.gain.value = CONFIG.bgmVolume;
  const getFile = (url) => fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).catch(() => null);
  BGM_NAMES.forEach((n) => { BGM.raw[n] = getFile(AUDIO_DIR + "bgm_" + n + ".mp3"); });   // 파일만 받아 둠
  SFX_NAMES.forEach((n) => {                              // 효과음은 짧아서 미리 다 풀어 둠
    getFile(AUDIO_DIR + "sfx_" + n + ".mp3")
      .then((ab) => ab && new Promise((ok, no) => BGM.ctx.decodeAudioData(ab, ok, no)))
      .then((buf) => { if (buf) SFX_BUF[n] = buf; })
      .catch(() => {});
  });
  // 첫 터치·클릭·키 입력 때 소리를 깨움. 아이폰·아이패드는 pointerdown 만으로는 안 깨어나서 touchend·click 도 받음
  let woke = false;
  const unlock = () => {
    if (BGM.ctx.state !== "running") BGM.ctx.resume().catch(() => {});   // suspended, interrupted(전화·앱 전환 뒤)
    if (woke) return;
    woke = true;
    const b = BGM.ctx.createBufferSource();               // 빈 소리를 한 번 틀어 오디오를 확실히 깨움
    b.buffer = BGM.ctx.createBuffer(1, 1, 22050);
    b.connect(BGM.ctx.destination);
    b.start(0);
    // 아이폰·아이패드 무음 모드에서도 들리게: Web Audio 는 무음 모드면 꺼지는데, "playback" 으로 두면 들림
    if (navigator.audioSession) { try { navigator.audioSession.type = "playback"; } catch (e) {} }
    else if (/iP(hone|ad|od)|Macintosh/.test(navigator.userAgent) && "ontouchend" in document) {
      const quiet = new Audio(silentWav());                // 옛 iOS: 소리 없는 <audio> 를 하나 반복해 두면 같은 효과
      quiet.loop = true;
      quiet.play().catch(() => {});
      BGM.quiet = quiet;
    }
  };
  ["pointerdown", "pointerup", "touchend", "click", "keydown"].forEach((ev) => document.addEventListener(ev, unlock, true));
})();

/* 화면을 끄거나 홈으로 나가거나 다른 앱·탭으로 가면 소리를 멈추고, 돌아오면 이어서 튼다.
   무음 모드에서도 들리게 "playback" 으로 두면 화면을 꺼도 소리가 계속 나서,
   나갈 때는 ① 음악 크기를 바로 0 ② "playback" 해제 ③ 오디오 멈춤 을 모두 한다.          */
function soundAway(hide) {
  if (BGM.away === hide) return;
  BGM.away = hide;
  if (navigator.audioSession) { try { navigator.audioSession.type = hide ? "auto" : "playback"; } catch (e) {} }
  if (BGM.ctx) {
    if (hide) {
      BGM.master.gain.cancelScheduledValues(BGM.ctx.currentTime);
      BGM.master.gain.value = 0;                          // 바로 0 (오디오가 멈춰도 적용되게)
      BGM.ctx.suspend().catch(() => {});
    } else {
      BGM.ctx.resume().catch(() => {});
      bgmVolumeNow();
    }
  }
  if (BGM.quiet) { if (hide) BGM.quiet.pause(); else BGM.quiet.play().catch(() => {}); }
  if (BGM.fileMode && BGM.now) { if (hide) BGM.now.el.pause(); else BGM.now.el.play().catch(() => {}); }
}   // 돌아왔을 때 브라우저가 막으면, 화면을 한 번 누를 때 위 unlock 이 다시 켬
document.addEventListener("visibilitychange", () => soundAway(document.hidden));
window.addEventListener("pagehide", () => soundAway(true));     // 홈으로 나가기·탭 닫기 (아이폰·아이패드)
window.addEventListener("pageshow", () => soundAway(document.hidden));

function silentWav() {                                    // 0.1초짜리 소리 없는 wav (위 unlock 에서 씀)
  const n = 800, buf = new ArrayBuffer(44 + n), d = new DataView(buf);
  const str = (o, t) => { for (let i = 0; i < t.length; i++) d.setUint8(o + i, t.charCodeAt(i)); };
  str(0, "RIFF"); d.setUint32(4, 36 + n, true); str(8, "WAVEfmt "); d.setUint32(16, 16, true);
  d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, 8000, true); d.setUint32(28, 8000, true);
  d.setUint16(32, 1, true); d.setUint16(34, 8, true); str(36, "data"); d.setUint32(40, n, true);
  for (let i = 0; i < n; i++) d.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

function bgmVolumeNow() {
  if (BGM.fileMode) { if (BGM.now) BGM.now.el.volume = bgmElVolume(BGM.now.el); return; }
  if (!BGM || !BGM.master) return;
  const v = (muted || BGM.away) ? 0 : CONFIG.bgmVolume * (BGM.ducked ? CONFIG.bgmDuck : 1);
  BGM.master.gain.setTargetAtTime(v, BGM.ctx.currentTime, 0.08);
}
function bgmDuck(on) { BGM.ducked = on; bgmVolumeNow(); }

/* 곡을 풀어서(decode) 메모리에 올림. 이미 올라가 있으면 그대로 */
function bgmLoad(name) {
  if (BGM.buffers[name]) return Promise.resolve(BGM.buffers[name]);
  if (!BGM.loading[name]) {
    BGM.loading[name] = BGM.raw[name]
      .then((ab) => ab && new Promise((ok, no) => BGM.ctx.decodeAudioData(ab.slice(0), ok, no)))
      .then((buf) => { if (buf) BGM.buffers[name] = buf; return buf; })
      .catch(() => null)
      .finally(() => { delete BGM.loading[name]; });
  }
  return BGM.loading[name];
}
function bgmForget(name) {                                // 다 쓴 곡은 메모리에서 버림
  if (BGM.want !== name && !(BGM.now && BGM.now.name === name)) delete BGM.buffers[name];
}

function bgm(name) {
  BGM.want = name;
  if (BGM.fileMode) return bgmFile(name);
  if (!BGM.ctx) return;
  if (BGM.now && BGM.now.name === name) return;          // 같은 곡이면 이어서 재생
  const t = BGM.ctx.currentTime, fade = CONFIG.bgmFadeMs / 1000;
  const crossfade = !!BGM.now;                            // 다른 곡에서 넘어올 때만 서서히 커짐
  if (BGM.now) {                                          // 지금 곡은 천천히 줄이고 멈춤
    const old = BGM.now;
    old.gain.gain.cancelScheduledValues(t);
    old.gain.gain.setValueAtTime(old.gain.gain.value, t);
    old.gain.gain.linearRampToValueAtTime(0, t + fade);
    old.src.stop(t + fade + 0.05);
    BGM.now = null;
    setTimeout(() => bgmForget(old.name), CONFIG.bgmFadeMs + 200);
  }
  if (!name) return;                                      // 끄기
  bgmLoad(name).then((buf) => {                           // 처음 쓰는 곡이면 푸는 동안 잠깐 기다림
    if (!buf) return;
    if (BGM.want !== name) return bgmForget(name);        // 그 사이에 다른 곡으로 바뀜
    if (BGM.now) return;
    bgmStart(name, buf, crossfade);
  });
}
function bgmStart(name, buf, crossfade) {
  const t = BGM.ctx.currentTime, fade = CONFIG.bgmFadeMs / 1000;
  const src = BGM.ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const gain = BGM.ctx.createGain();
  gain.gain.setValueAtTime(crossfade ? 0 : 1, t);
  if (crossfade) gain.gain.linearRampToValueAtTime(1, t + fade);
  src.connect(gain).connect(BGM.master);
  src.start(t);
  BGM.now = { name, src, gain };
}

/* 파일로 열었을 때(file://) 쓰는 <audio> 재생. 하는 일은 위 bgm() 과 같음 */
function bgmElVolume(el) {
  return ((muted || BGM.away) ? 0 : CONFIG.bgmVolume * (BGM.ducked ? CONFIG.bgmDuck : 1)) * el._fade;
}
function bgmRamp(el, to, done) {                          // el._fade 를 bgmFadeMs 동안 to 로
  clearInterval(el._ramp);
  const from = el._fade, t0 = performance.now();
  el._ramp = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / CONFIG.bgmFadeMs);
    el._fade = from + (to - from) * k;
    el.volume = bgmElVolume(el);
    if (k >= 1) { clearInterval(el._ramp); if (done) done(); }
  }, 30);
}
function bgmFile(name) {
  if (BGM.now && BGM.now.name === name) return;          // 같은 곡이면 이어서 재생
  const crossfade = !!BGM.now;
  if (BGM.now) { const old = BGM.now.el; bgmRamp(old, 0, () => old.pause()); BGM.now = null; }
  const el = name && BGM.els[name];
  if (!el) return;                                        // 끄기
  clearInterval(el._ramp);
  el.currentTime = 0;
  el._fade = crossfade ? 0 : 1;
  el.volume = bgmElVolume(el);
  el.play().catch(() => {});                              // 첫 클릭 전이면 막힘 → 클릭 때 다시 재생
  BGM.now = { name, el };
  if (crossfade) bgmRamp(el, 1);
}

function addGood(n, quiet = false) {
  if (!n) return;
  good += n;            // 마이너스도 허용
  updateHud();
  if (!quiet) sfx(n > 0 ? "good_up" : "good_down");
  toast("선함 " + (n > 0 ? "+" : "") + n, n < 0);
}
function updateHud() { $("goodNum").textContent = good; }
function showHud(on) { $("hud").hidden = !(on && CONFIG.showScore); }
function toast(msg, bad = false) {
  const t = $("toast");
  t.textContent = msg;
  t.style.color = bad ? "#ff8a8a" : "#9fe39f";
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
  else if (e.key.toLowerCase() === "m") toggleMute();
  else if (/^[1-9]$/.test(e.key) && pickByKey) pickByKey(Number(e.key) - 1);
  else if (MG.active && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    e.preventDefault();
    mgMove(MG.lane + (e.key === "ArrowLeft" ? -1 : 1));
  }
});

/* 대사 한 줄. wait=false 면 글자만 다 나오면 바로 끝남 (선택지 앞에서 씀) */
function say(who, text, wait = true) {
  // dialogue.js 의 연출 명령 (대사 대신 화면을 바꾼다). 자세한 쓰는 법은 dialogue.js 맨 위
  if (who && who[0] === "@") return direct(who, text, wait);
  highlightSpeaker(who);
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
      advance = () => { advance = null; nextEl.style.visibility = "hidden"; sfx("next"); resolve(); };
    };
    finishLine = done;
    if (CONFIG.typeMs <= 0) return done();
    timer = setInterval(() => {
      i++;
      textEl.textContent = text.slice(0, i);
      const now = performance.now();
      if (text[i - 1] && text[i - 1].trim() && now - lastType >= CONFIG.typeEveryMs) {   // 빈칸·줄바꿈은 소리 없음
        lastType = now;
        sfx("type", CONFIG.typeVolume / CONFIG.sfxVolume);
      }
      if (i >= text.length) done();
    }, CONFIG.typeMs);
  });
}

/* 연출 명령 실행.  ["@bg", 배경]  ["@show", 그림, 가로중심]  ["@fx", 글자, 가로, 세로]  ["@wait", 밀리초] */
async function direct(cmd, a, b, c) {
  const args = Array.isArray(a) ? a : [a];
  if (cmd === "@bg") {                       // 배경을 부드럽게 바꿈
    const f = $("fade");
    f.classList.add("on"); sfx("transition"); await sleep(320);
    setBg(args[0]);
    f.classList.remove("on");   // 밝아지는 동안 기다리지 않음: 바로 뒤의 @clear·@show 가 아직 검은 화면일 때 실행되게
  } else if (cmd === "@show") {              // 인물·소품을 화면에 올림 (그림이 없으면 아무것도 안 보임)
    addSprite(args[0], { cx: Number(args[1] ?? 320), bottom: Number(args[2] ?? 240) });
  } else if (cmd === "@fx") {                // 머리 위 효과 글자 (♥, $, ; 등)
    const fx = document.createElement("div");
    fx.className = "fx";
    fx.textContent = args[0];
    if (args[0] === "♥") sfx("heart");
    if (args[0] === "$") sfx("coin");
    if (args[0] === "$") fx.style.color = "#ffd34d";      // 돈은 금색
    if (args[0].includes(";")) fx.style.color = "#9fd0ff"; // 곤란함은 하늘색
    fx.style.left = (args[1] ?? 320) + "px";
    fx.style.top = (args[2] ?? 150) + "px";
    $("sprites").appendChild(fx);
    setTimeout(() => fx.remove(), 1800);   // 잠깐 보였다가 사라짐
    await sleep(900);
  } else if (cmd === "@clear") {             // 화면의 인물·소품을 모두 치움
    clearSprites();
  } else if (cmd === "@wait") {
    await sleep(Number(args[0]) || 400);
  }
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
      sfx("select");
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
      if (!opts.noKey) {   // opts.noKey = true 면 앞의 번호(1, 2...)를 숨김. 숫자키로 고르기는 그대로 됨
        const k = document.createElement("span");
        k.className = "key"; k.textContent = i + 1;
        b.appendChild(k);
      }
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
    if (who && who[0] === "@") { await direct(who, lines[i].slice(1)); continue; }
    if (choices && i === lines.length - 1) return ask(who, text, choices);
    await say(who, text);
  }
}

function hideDialog() { $("dialog").hidden = true; $("choices").innerHTML = ""; }

/* ---------------------------- 4) 장면 전환 ---------------------------- */
async function transition(setup) {
  const f = $("fade");
  f.classList.add("on");
  sfx("transition");
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

/* 화면에 차사 그림이 있으면, 지금 말하는 차사만 밝게 하고 나머지 둘은 흐리게.
   말하는 사람이 차사가 아니면(사만이, 저승차사, 해설) 셋 다 밝게 */
function highlightSpeaker(who) {
  const els = document.querySelectorAll('#sprites [data-key^="char_chasa_"]');
  if (!els.length) return;
  const c = CHASA.find((c) => NAMES[c.key] === who);
  els.forEach((el) => el.classList.toggle("dimmed", !!c && el.dataset.key !== c.art));
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
  bgm("title");
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
  bgm("title");
  await transition(() => { setBg("bg_title", true); showHud(true); });
  await sayLines(SCRIPT.quizIntro);
  for (const q of SCRIPT.quiz) {
    const i = await ask("", q.question, q.choices);
    addGood(q.choices[i].score || 0);
  }
  await sayLines(SCRIPT.quizOutro);
}

/* 1스테이지: 사만이 집. 검은 화면 나레이션 → 집 → 부인에게 말 걸기(선택) */
async function sceneHouse() {
  bgm("village");
  const H = SCRIPT.house;
  await transition(() => { setBg("black"); showHud(true); });
  await sayLines(H.intro);                 // 이 안의 "@bg", "@show", "@fx" 가 화면을 바꾼다
  hideDialog();

  // 부인을 눌러 말 걸기
  const wife = [...$("sprites").children].find((el) => el.dataset.key === "char_wife");
  setHint(H.hint);
  await new Promise((resolve) => {
    if (!wife) return resolve();
    wife.classList.add("npc");
    wife.addEventListener("click", (e) => { e.stopPropagation(); wife.classList.remove("npc"); resolve(); }, { once: true });
  });
  setHint("");
  const p1 = addSprite("portrait_samani", { cx: 510, bottom: 252 });
  const p2 = addSprite("portrait_wife", { cx: 126, bottom: 248 });    // 대화창 왼쪽 위, 이름표 바로 위
  const i = await sayLines(H.wife, H.wifeChoices);
  const c = H.wifeChoices[i];
  addGood(c.score);
  await sayLines(c.reply);
  p1.remove(); p2.remove();
  hideDialog();

  // 문을 눌러 장터로 나가기
  const door = document.createElement("div");
  door.className = "door npc";
  Object.assign(door.style, {
    left: HOUSE_DOOR.x + "px", top: HOUSE_DOOR.y + "px",
    width: HOUSE_DOOR.w + "px", height: HOUSE_DOOR.h + "px",
  });
  const lab = document.createElement("div");
  lab.className = "lab";
  lab.textContent = H.doorLabel;
  door.appendChild(lab);
  $("sprites").appendChild(door);
  setHint(H.doorHint);
  await new Promise((resolve) => {
    door.addEventListener("click", (e) => { e.stopPropagation(); resolve(); }, { once: true });
  });
  setHint("");
  door.remove();
  await sayLines(H.outro);
}

/* 2스테이지: 장삿길 (클릭 화면) */
async function sceneMarket() {
  bgm("village");
  await transition(() => { setBg("bg_market"); showHud(true); });
  await sayLines(SCRIPT.marketIntro);
  clearSprites();

  // NPC 올리기
  const visited = new Set();
  let gaveMoney = false;   // 한 명이라도 도왔으면 돈이 없어 총을 외상으로 산다
  let clickedNpc = null;
  const els = {};
  for (const id of Object.keys(MARKET_NPCS)) {
    els[id] = MARKET_NPCS[id].map(([key, x, y], n) => {
      const el = addSprite(key, { x, y });
      el.classList.add("npc");
      if (n === 0) {   // 이름표는 첫 그림 위에만
        const lab = document.createElement("div");
        lab.className = "lab";
        lab.textContent = (id === "merchant" ? SCRIPT.merchant : SCRIPT.npcs[id]).label;
        el.appendChild(lab);
      }
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (clickedNpc === "wait") clickedNpc = id;   // 대화 중이 아닐 때만 받음
      });
      return el;
    });
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
      if (!visited.has("children") || !visited.has("elders")) {   // 아이들·노인들을 둘 다 만나야 총을 판다
        await sayLines(SCRIPT.merchant.notYet);
        hideDialog();
        setHint(SCRIPT.marketHint);
        continue;
      }
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
        if (n.choices[i].help) { sfx("coin"); addGood(1); gaveMoney = true; await sayLines(n.helped); }
        else { addGood(-1); await sayLines(n.passed); }   // 거절하면 선함 -1
      }
      visited.add(id);
      els[id].forEach((el) => el.classList.add("done"));
    }
    hideDialog();
    setHint(SCRIPT.marketHint);
  }
}

/* 컷신 (숲 · 백년해골) */
async function sceneCutscene() {
  bgm("eerie");
  await transition(() => { setBg("bg_forest"); showHud(true); });
  let skullShown = false;
  for (const line of SCRIPT.cutscene) {
    const [who, text] = line;
    if (who && who[0] === "@") { await direct(who, line.slice(1)); continue; }   // 연출 명령
    if (who === NAMES.skull && !skullShown) {
      skullShown = true;
      addSprite("char_skull", { cx: 320, bottom: 240 });
      sfx("skull");
    }
    await say(who, text);
  }
}

/* 저승사자 장면: 세 번 부름 → 대접 → (통과 / 게임 오버)
   통과하면 선함 0 이하 → "D" (엔딩 D, 명부 없음), 1 이상 → 명부 장면으로 */
async function sceneChasa() {
  const goodAtStart = good;   // 게임 오버 뒤 다시 할 때 점수를 장면 시작 때로 되돌리려고 기억
  while (true) {
    good = goodAtStart; updateHud();
    bgm("tense");                                // 게임 오버 뒤 다시 할 때도 처음부터
    await transition(() => { setBg("bg_chasa"); showHud(true); showChasa(); });
    await sayLines(SCRIPT.chasaIntro);

    const result = await callMinigame();          // "ok" / "early" / "late"
    if (result !== "ok") {
      await sceneGameOver(result === "early" ? SCRIPT.minigame.failEarly : SCRIPT.minigame.failLate);
      continue;                                   // 저승사자 장면 처음부터 다시
    }
    showChasa();
    const passed = await treatChasa();           // 하나라도 틀리면 false

    if (passed) {
      await sayLines(SCRIPT.treatPass);
      if (good <= 0) {                           // 인정 없는 사만이 → 엔딩 D
        await sayLines(SCRIPT.treatFail);
        return "D";
      }
      await sayLines(SCRIPT.treatToLedger);
      return;
    }
    await sceneGameOver();   // 끝나면 반복문 처음으로 돌아가 저승사자 장면부터 다시
  }
}

/* 세 번 부름: 1·2번째는 참고, 3번째에 대답해야 통과. 틀리면 처음부터 */
/* ---------------- 세 번 부름 미니게임 ----------------
   차사 셋이 CONFIG.mgVolleyMs 마다 각자 레인으로 "사만아!"를 쏜다 (빨강 1, 파랑 2).
   파란 글자 = 묵언 "..." (맞아도 안전), 빨간 글자 = 대답 "네!".
   글자가 한 번 내려올 때마다 카운트(차사가 부른 횟수) +1. 글자는 모두 3번 내려온다.
   3번째 빨간 글자에 맞으면 성공. 1·2번째 빨간 글자에 맞으면 "early" 실패,
   3번째 빨간 글자까지 피하면(대답을 안 하면) "late" 실패.  */
const MG = { active: false, lane: 1, count: 0, words: [] };   // 테스트에서도 읽을 수 있게 밖에 둠
const MG_LANE_X = [160, 320, 480];      // 레인 세 줄의 가로 중심
const MG_FEET = 346;                     // 사만이 발 높이
const MG_TOP = 96, MG_HIT = MG_FEET - SPRITE.char_samani.h;   // 글자가 출발하는 높이, 사만이에게 닿는 높이(머리)

function mgMove(lane) {
  MG.lane = Math.max(0, Math.min(2, lane));
  if (MG.player) MG.player.style.left = (MG_LANE_X[MG.lane] - SPRITE.char_samani.w / 2) + "px";
}

function mgBubble(text, color) {          // 사만이 머리 위 말풍선
  const b = document.createElement("div");
  b.className = "mg-bubble";
  b.textContent = text;
  b.style.color = color;
  b.style.left = MG_LANE_X[MG.lane] + "px";
  b.style.top = (MG_HIT - 24) + "px";      // 머리 바로 위
  $("sprites").appendChild(b);
  setTimeout(() => b.remove(), 700);
}

async function callMinigame() {
  const M = SCRIPT.minigame;
  clearSprites();
  await sayLines(M.intro);
  hideDialog();

  // 화면 꾸미기: 레인 3줄, 위에 차사 얼굴, 아래에 사만이
  const box = $("sprites");
  MG_LANE_X.forEach((x, i) => {
    const lane = document.createElement("div");
    lane.className = "mg-lane";
    lane.style.left = (x - 70) + "px";
    lane.addEventListener("click", (e) => { e.stopPropagation(); if (MG.active) mgMove(i); });   // 레인을 눌러 이동
    box.appendChild(lane);
    addSprite("face_" + CHASA[i].art.replace("char_", ""), { cx: x, bottom: 90 });
  });
  MG.player = addSprite("char_samani", { cx: MG_LANE_X[1], bottom: MG_FEET });
  MG.player.classList.add("mg-player");
  const counter = document.createElement("div");
  counter.className = "mg-counter";
  counter.textContent = M.counterLabel + " : 0";
  box.appendChild(counter);
  setHint(M.hint);

  Object.assign(MG, { active: true, lane: 1, count: 0, words: [] });
  bgmDuck(true);                           // 미니게임 동안 음악 작게
  mgMove(1);

  const start = performance.now();
  let nextVolley = 800;   // 첫 발사는 1초 뒤
  const result = await new Promise((resolve) => {
    function frame(now) {
      const t = now - start;

      if (MG.count < 3 && t >= nextVolley) {       // 세 레인에 동시에 발사 (모두 3번)
        nextVolley += CONFIG.mgVolleyMs;
        MG.count++;                                // 부를 때마다 횟수 +1
        counter.textContent = M.counterLabel + " : " + MG.count;
        const red = Math.floor(Math.random() * 3);
        for (let i = 0; i < 3; i++) {
          const w = document.createElement("div");
          w.className = "mg-word " + (i === red ? "red" : "blue");
          w.textContent = M.call;
          w.style.left = MG_LANE_X[i] + "px";
          box.appendChild(w);
          MG.words.push({ el: w, lane: i, red: i === red, born: t });
        }
        sfx("saman");
      }

      for (const w of MG.words.slice()) {           // 글자 이동과 충돌
        const p = (t - w.born) / CONFIG.mgFallMs;
        w.el.style.top = (MG_TOP + (MG_HIT - MG_TOP) * Math.min(p, 1) - 70) + "px";
        if (p < 1) continue;
        w.el.remove();
        MG.words.splice(MG.words.indexOf(w), 1);
        if (w.lane !== MG.lane) continue;          // 다른 레인이면 빗나감
        if (!w.red) { mgBubble(M.silent, "#9fd0ff"); sfx("silent"); continue; }
        mgBubble(M.answer, "#ff8a8a");
        sfx(MG.count === 3 ? "correct" : "wrong");
        return resolve(MG.count === 3 ? "ok" : "early");
      }
      if (MG.count === 3 && MG.words.length === 0) return resolve("late");   // 세 번째 부름까지 대답 안 함
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });

  MG.active = false;
  bgmDuck(false);
  MG.words.forEach((w) => w.el.remove());
  MG.words = [];
  setHint("");
  await sleep(700);
  clearSprites();
  if (result === "ok") await sayLines(M.success);
  return result;
}

/* 대접: 차사 셋에게 하나씩. 셋 다 맞히면 true, 하나라도 틀리면 그 자리에서 false */
async function treatChasa() {
  const keys = Object.keys(SCRIPT.treatChoices);   // horse, shoes, rice
  const options = keys.map((k) => ({ text: SCRIPT.treatChoices[k], icon: "icon_" + k }));
  for (let i = 0; i < SCRIPT.treat.length; i++) {
    const t = SCRIPT.treat[i];
    showChasa(i);
    const picked = await sayLines(t.lines, options);
    if (keys[picked] !== t.answer) {
      sfx("wrong");
      await sayLines(t.wrong);     // 틀린 차사가 화내고 → 게임 오버
      return false;
    }
    sfx("correct");              // 정답이어도 선함 점수는 없음
    await sayLines(t.right);
  }
  return true;
}

/* 게임 오버: 끌려가는 짧은 화면 */
async function sceneGameOver(lines = SCRIPT.gameOver.lines) {
  bgm(null);                               // 게임 오버: 음악 끄고 효과음만
  await transition(() => { setBg("bg_gameover", true); showHud(false); });
  const card = $("card");
  card.hidden = false;
  card.className = "over";
  card.innerHTML = `<div class="t">${SCRIPT.gameOver.title}</div>`;
  sfx("gameover");
  await sleep(500);
  await sayLines(lines);
  hideDialog();
  await choose([{ text: SCRIPT.gameOver.retry }], { center: true });
}

/* 명부 장면: 이름을 적을지 고른다. 엔딩 글자(A/B/C)를 돌려줌 */
async function sceneLedger() {
  bgm("eerie");
  await transition(() => { setBg("bg_ledger"); showHud(true); showChasa(-1, false); });
  const L = SCRIPT.ledger;
  await sayLines(L.slice(0, -1));
  const i = await sayLines([L[L.length - 1]], SCRIPT.ledgerChoices);
  if (SCRIPT.ledgerChoices[i].write) return "A";
  return good >= CONFIG.goodForC ? "C" : "B";
}

/* 크레딧을 화면 아래에서 위로 올린다. 글 끝이 버튼 위에 오면 멈춤.
   클릭(누르고 있기)이나 스페이스·엔터를 누르고 있으면 빨리 감기 */
function rollCredits(el) {
  return new Promise((resolve) => {
    const stopY = 250 - el.offsetHeight;            // 글 맨 아래가 y=250 (버튼 위)에 오면 멈춤
    let y = 360, fast = false, last = performance.now();
    const down = () => { fast = true; }, up = () => { fast = false; };
    const keyDown = (e) => { if (e.key === " " || e.key === "Enter") fast = true; };
    const keyUp = (e) => { if (e.key === " " || e.key === "Enter") fast = false; };
    stage.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.addEventListener("keydown", keyDown);
    document.addEventListener("keyup", keyUp);
    function frame(now) {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      y -= CONFIG.creditsSpeed * (fast ? 6 : 1) * dt;
      if (y <= stopY) y = stopY;
      el.style.transform = `translateY(${Math.round(y)}px)`;
      if (y > stopY) return requestAnimationFrame(frame);
      stage.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.removeEventListener("keydown", keyDown);
      document.removeEventListener("keyup", keyUp);
      resolve();
    }
    el.style.transform = `translateY(${y}px)`;
    requestAnimationFrame(frame);
  });
}

/* 엔딩 A / B / C / D + 크레딧 */
const ENDING_BG = { A: "end_a", B: "bg_hell", C: "end_c", D: "bg_gameover" };
async function sceneEnding(code) {
  const E = SCRIPT.endings[code];
  const bgKey = ENDING_BG[code];
  bgm(code === "A" || code === "C" ? "ending_happy" : "ending_sad");   // 크레딧까지 이어짐
  await transition(() => { setBg(bgKey, true); showHud(false); });

  // 엔딩 제목 카드
  const card = $("card");
  card.hidden = false;
  card.className = "";
  card.innerHTML = `<div class="t">${E.title}</div>`;
  await waitClick();
  card.hidden = true;

  // 엔딩 글 (엔딩 B·C에는 인물 그림. 엔딩 A의 빈 밥상은 배경 end_a.png 에 그려져 있음)
  if (code === "B") addSprite("char_samani", { cx: 320, bottom: 240 });
  if (code === "C") {
    addSprite("char_samani", { cx: 250, bottom: 240 });
    addSprite("char_osamani", { cx: 390, bottom: 240 });
    addSprite("char_skull_clean", { cx: 100, bottom: 240 });
  }
  await sayLines(E.lines);

  // 대화창을 치우고 마지막 그림을 보여 준다 (엔딩 A: 오사만이 집의 빈 밥상). 클릭하면 크레딧
  hideDialog();
  await waitClick();

  // 크레딧 (타이틀 곡으로 바꿈)
  bgm("title");
  await transition(() => { setBg("bg_forest", true); });
  hideDialog();
  card.hidden = false;
  card.className = "solid roll";
  const C = SCRIPT.credits;
  const body = C.text.split("\n")
    .map((l) => (/^\[.+\]$/.test(l) ? `<span class="h">${l.slice(1, -1)}</span>` : l)).join("\n");
  card.innerHTML =
    `<div class="roll-inner"><div class="t">${C.title}</div><div class="b">${body}</div>` +
    `<div class="s">엔딩 ${code} · 선함 ${good}</div></div>`;
  await rollCredits(card.querySelector(".roll-inner"));
  await choose([{ text: C.again }], { center: true });
  location.href = location.pathname;   // 처음부터 다시
}

/* ---------------------------- 6) 전체 흐름 ---------------------------- */
/* 테스트용 주소 옵션:
     ?scene=quiz | market | cutscene | chasa | ledger | ending_a | ending_b | ending_c | ending_d | gameover
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
  // (저승사자 장면이 "D" 를 돌려주면 명부 없이 바로 엔딩 D)
  const order = [
    ["title", sceneTitle], ["quiz", sceneQuiz], ["house", sceneHouse], ["market", sceneMarket],
    ["cutscene", sceneCutscene], ["chasa", sceneChasa],
  ];
  const from = start === "gameover" ? "chasa" : start;
  // from 이 "ledger" 면 해당 이름이 없어 -1 → 전부 건너뛰고 바로 명부 장면
  const found = order.findIndex(([name]) => name === from);
  const startIdx = from === "ledger" ? order.length : Math.max(0, found);
  let last;
  for (let i = startIdx; i < order.length; i++) last = await order[i][1]();

  const code = last === "D" ? "D" : await sceneLedger();
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
$("muteBtn").addEventListener("click", toggleMute);

// 폰트가 준비된 뒤 시작 (글자 깨짐 방지)
Promise.all([
  document.fonts.load('14px "Galmuri14"'),
  document.fonts.load('11px "Galmuri11"'),
]).catch(() => {}).then(main);

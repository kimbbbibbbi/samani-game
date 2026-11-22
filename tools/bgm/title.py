# bgm_title — 8비트 칩튠 + 제주 〈맹감본풀이〉(사만이 본풀이) 액막이 굿 모티브 (타이틀·퀴즈)
# 곡 구성 = 액막이 굿 순서
#   ① 날과 국섬김(4마디): 징·요령으로 굿판을 열고 북이 점점 몰아침
#   ② 집안연유 닦음(8마디): 심방 혼자 굿하는 사유를 당당하게 고함
#   ③ 맹감본풀이(8마디): 본 이야기 – 주제 선율을 모두 함께 크게
#   ④ 차사 대접(4마디): 설쇠가 몰아치며 절정 → 다시 ①로
# 선법: 솔라도레미 (D 솔) / 장단: 3소박 4박
import numpy as np
from chip import *

BPM = 76; TICK = 60 / BPM / 3; BAR = 12
D4, E4, G4, A4, B4, D5, E5, G5, A5 = 62, 64, 67, 69, 71, 74, 76, 79, 81
_ = None
INTRO = [[(_, 12, "")]] * 4
YEONYU = [
    [(A4,6,"s"),(B4,3,""),(A4,3,"")], [(G4,3,""),(A4,3,""),(D5,6,"v")],
    [(B4,3,""),(A4,2,""),(G4,1,""),(E4,6,"v")], [(G4,3,""),(A4,2,""),(G4,1,""),(D4,6,"t")],
    [(D5,6,"s"),(E5,3,""),(D5,3,"")], [(B4,3,""),(D5,3,""),(E5,6,"v")],
    [(D5,3,""),(B4,2,""),(A4,1,""),(B4,3,""),(A4,3,"")], [(G4,3,""),(E4,3,""),(D4,6,"v")],
]
BONPURI = [
    [(D5,3,""),(D5,2,""),(E5,1,""),(G5,6,"s")], [(E5,3,""),(D5,3,""),(B4,6,"v")],
    [(A4,3,""),(B4,2,""),(D5,1,""),(E5,3,""),(G5,3,"")], [(A5,9,"v"),(G5,3,"")],
    [(E5,3,""),(G5,2,""),(A5,1,""),(G5,3,""),(E5,3,"")], [(D5,3,""),(E5,2,""),(D5,1,""),(B4,6,"v")],
    [(A4,3,""),(B4,3,""),(D5,3,""),(E5,3,"")], [(D5,12,"v")],
]
DAEJEOP = [
    [(A5,6,"s"),(G5,3,""),(E5,3,"")], [(G5,3,""),(E5,2,""),(D5,1,""),(E5,6,"v")],
    [(D5,3,""),(E5,3,""),(G5,3,""),(A5,3,"")], [(G5,3,""),(E5,2,""),(D5,1,""),(D5,6,"t")],
]
form = ([("intro", b) for b in INTRO] + [("solo", b) for b in YEONYU] +
        [("full", b) for b in BONPURI] + [("climax", b) for b in DAEJEOP])
for _r, b in form: assert sum(d for _m, d, _o in b) == 12
BARS = len(form)
# 마디별 근음: D=솔 E=라 G=도 A=레
R = {"D": 38, "E": 40, "G": 43, "A": 45}
roots = [R[c] for c in "DDDD" "DGED" "DEAD" "DEAD" "EGAD" "DEAD"]

M = Mix(BARS * BAR * TICK, ["mel", "pad", "bass", "perc", "bell", "jing"])

# ---------------- 선율 ----------------
tick = 0
for role, bar in form:
    for m, d, orn in bar:
        if m is not None:
            n = int(d * TICK * SR * 0.94); at = tick * TICK * SR
            f = curve(m, n, orn, vib_rate=5.0, vib_depth=0.5, fall=2.0, fall_len=0.35)
            if role == "solo":       # 심방 혼자: 가늘고 또렷하게
                s = pulse(f, 0.125) * 0.9 + pulse(f * 1.003, 0.25) * 0.3
                M.add("mel", at, s * env(n, r=0.06) * 0.27)
            else:                    # 다 같이: 옥타브 아래로 겹쳐 웅장하게
                s = pulse(f, 0.25) * 0.75 + pulse(f * 0.5 * 1.004, 0.5) * 0.5 + pulse(f * 0.998, 0.125) * 0.25
                M.add("mel", at, s * env(n, r=0.06) * (0.25 if role == "full" else 0.27))
        tick += d
dry = M.t["mel"].copy()
M.t["mel"] += np.roll(dry, int(0.42 * SR)) * 0.25     # 넓은 공간감

# ---------------- 웅장한 화음 패드 (근음+5도+옥타브, 천천히 부풂) + 베이스 ----------------
for b in range(BARS):
    role = form[b][0]
    r = roots[b]
    n = int(BAR * TICK * SR); t = np.arange(n) / SR
    level = {"intro": 0.05 + 0.03 * b, "solo": 0.07, "full": 0.12, "climax": 0.13}[role]
    s = sum(pulse(np.full(n, hz(m) * dt), 0.5) * w for m, dt, w in [(r + 12, 1.0, .5), (r + 19, 1.003, .35), (r + 24, 0.997, .25)])
    M.add("pad", b * BAR * TICK * SR, s * env(n, a=0.35, r=0.3) * level)
    pat = [(0, r, 5), (6, r + 7, 5)] if role in ("intro", "solo") else [(0, r, 3), (3, r, 2), (6, r + 7, 3), (9, r, 2)]
    for k, m, d in pat:
        nn = int(d * TICK * SR * 0.9)
        M.add("bass", (b * BAR + k) * TICK * SR, tri(np.full(nn, hz(m))) * env(nn, r=0.05) * 0.42)

# ---------------- 연물 ----------------
def bell_hit(vol):
    n = int(0.45 * SR); t = np.arange(n) / SR
    s = sum(pulse(np.full(n, fr), 0.5) * w for fr, w in [(2349, .5), (3322, .3), (4186, .2), (5274, .12)])
    return s * np.exp(-t / 0.09) * 0.09 * vol

def yoryeong(at, dur, vol):
    t = 0.0
    while t < dur:
        M.add("bell", at + t * SR, bell_hit(vol * (1 - t / dur) ** 1.5 * rng.uniform(0.6, 1.0)))
        t += rng.uniform(0.05, 0.08)

JANG = {0: "dung", 2: "gi", 3: "deok", 5: "kung", 7: "deok", 8: "kung", 10: "deok"}   # 굿거리
for b in range(BARS):
    role = form[b][0]
    T = lambda k: (b * BAR + k) * TICK * SR
    if role == "intro":
        if b == 0: yoryeong(T(0), 1.6, 1.0)
        hits = {0: [0], 1: [0, 6], 2: [0, 3, 6, 9], 3: list(range(12))}[b]    # 북이 점점 촘촘하게 몰아침
        for k in hits:
            M.add("perc", T(k), buk(0.5 + 0.5 * (b * 12 + k) / 48, f0=100, base=48, dur=0.35))
        if b == 3:
            for k in range(24): M.add("perc", T(k / 2), noise(0.06, 0.02, 2, 0.12 + 0.012 * k))
        continue
    vol = {"solo": 0.6, "full": 1.0, "climax": 1.0}[role]
    for k, kind in JANG.items():
        j = rng.uniform(-0.004, 0.004) * SR
        if kind == "dung":
            M.add("perc", T(k), buk(vol, f0=100, base=50, dur=0.35)); M.add("perc", T(k), noise(0.08, 0.025, 2, 0.35 * vol))
        elif kind == "kung": M.add("perc", T(k) + j, buk(0.5 * vol, f0=140, base=80, dur=0.18))
        elif kind == "deok": M.add("perc", T(k) + j, noise(0.08, 0.022, 2, 0.3 * vol))
        elif kind == "gi": M.add("perc", T(k) + j, noise(0.05, 0.012, 1, 0.18 * vol))
    if role == "full":
        for k in (0, 3, 6, 9): M.add("perc", T(k), seolsoe(0.8 if k == 0 else 0.45))
    if role == "climax":                         # 차사 대접: 설쇠 몰아치기
        for k in range(12): M.add("perc", T(k), seolsoe(0.9 if k % 3 == 0 else 0.45))
        if b == BARS - 1:
            for k in range(6, 12): M.add("perc", T(k), buk(0.7, f0=100, base=48, dur=0.25))
    if role == "solo" and b % 2 == 0:
        M.add("bell", T(0), bell_hit(0.6))
for b, v in [(0, 1.2), (4, 0.8), (12, 1.1), (20, 1.0)]:      # 마당이 바뀔 때마다 징
    M.add("jing", b * BAR * TICK * SR, jing(v, f=82, length=5.0, decay=1.6))

export(M.t["mel"] + M.t["pad"] + M.t["bass"] + M.t["perc"] * 0.75 + M.t["bell"] + M.t["jing"], "bgm_title")

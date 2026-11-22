# bgm_ending_happy — 8비트 칩튠 + 제주 민요 〈오돌또기〉 모티브 (엔딩 A·C)
# 형식: 8마디 선소리 + 8마디 뒷소리 메기고 받기 / 장단: 굿거리(3소박 4박) / 선법: 도레미솔라 (G 도)
# 분위기: 유유하면서도 흥청거리는 잔치 소리. 마지막 8마디는 뒷소리를 다 같이 크게 한 번 더.
import numpy as np
from chip import *

BPM = 84; TICK = 60 / BPM / 3; BAR = 12
# 도=G4 레=A4 미=B4 솔=D5 라=E5 도'=G5 레'=A5 / 낮은 솔=D4 낮은 라=E4
D4, E4, G4, A4, B4, D5, E5, G5, A5 = 62, 64, 67, 69, 71, 74, 76, 79, 81
SEON = [  # 선소리 (혼자 메김)
    [(D5,6,"s"),(E5,3,""),(D5,3,"")], [(B4,3,""),(D5,2,""),(E5,1,""),(D5,6,"v")],
    [(G5,6,"s"),(E5,3,""),(D5,3,"")], [(E5,3,""),(D5,2,""),(B4,1,""),(A4,6,"v")],
    [(B4,3,""),(D5,3,""),(E5,3,""),(G5,3,"")], [(E5,2,""),(D5,1,""),(B4,3,""),(D5,6,"")],
    [(B4,3,""),(A4,2,""),(G4,1,""),(A4,3,""),(B4,3,"")], [(B4,2,""),(A4,1,""),(G4,3,""),(A4,6,"v")],
]
DWIT = [  # 뒷소리 (여럿이 받음) – 통통 튀는 '긴-짧' 리듬
    [(G5,2,""),(G5,1,""),(E5,2,""),(G5,1,""),(A5,3,""),(G5,3,"")], [(E5,2,""),(D5,1,""),(E5,3,""),(D5,6,"v")],
    [(B4,2,""),(D5,1,""),(E5,2,""),(G5,1,""),(E5,3,""),(D5,3,"")], [(B4,2,""),(A4,1,""),(B4,3,""),(D5,6,"")],
    [(G5,2,""),(G5,1,""),(E5,2,""),(G5,1,""),(A5,3,""),(G5,3,"")], [(E5,2,""),(D5,1,""),(E5,2,""),(G5,1,""),(A5,6,"s")],
    [(G5,3,""),(E5,2,""),(D5,1,""),(B4,3,""),(A4,3,"")], [(A4,3,""),(B4,2,""),(A4,1,""),(G4,6,"v")],
]
for b in SEON + DWIT: assert sum(d for _m, d, _o in b) == 12
form = [("seon", b) for b in SEON] + [("dwit", b) for b in DWIT] + [("all", b) for b in DWIT]
BARS = len(form)
ROOTS = [43,43,40,38, 43,40,45,38,  43,40,43,38, 43,45,38,43,  43,40,43,38, 43,45,38,43]   # G2 E2 D2 A2

M = Mix(BARS * BAR * TICK, ["mel", "pluck", "bass", "perc", "jing"])
tick = 0
for role, bar in form:
    for m, d, orn in bar:
        n = int(d * TICK * SR * 0.93); at = tick * TICK * SR
        f = curve(m, n, orn, vib_rate=4.5, vib_depth=0.5)
        if role == "seon":
            s = pulse(f, 0.125) * 0.9 + pulse(f * 1.003, 0.25) * 0.25
            M.add("mel", at, s * env(n) * 0.28)
        else:
            s = pulse(f, 0.25) * 0.8 + pulse(f * 0.5 * 1.004, 0.5) * 0.45
            if role == "all":                                  # 다 같이: 옥타브 위 겹침 + 더 크게
                s = s + pulse(f * 2 * 0.997, 0.125) * 0.25
            M.add("mel", at, s * env(n) * (0.22 if role == "dwit" else 0.25))
        tick += d

# 가야금 뜯듯 짧게 퉁기는 반주 (뒷소리부터 등장)
for b in range(BARS):
    r = ROOTS[b] + 24
    base = b * BAR
    if form[b][0] == "seon":
        pat = [(0, r), (6, r + 7)]
    else:
        pat = [(0, r), (2, r + 7), (3, r + 12), (6, r + 9), (8, r + 7), (9, r + 12)]
    for k, m in pat:
        n = int(0.25 * SR); t = np.arange(n) / SR
        M.add("pluck", (base + k) * TICK * SR, pulse(np.full(n, hz(m)), 0.25) * np.exp(-t / 0.07) * 0.09)
    for k, m, d in [(0, ROOTS[b], 3), (5, ROOTS[b] + 7, 1), (6, ROOTS[b], 3), (9, ROOTS[b] + 7, 2)]:
        n = int(d * TICK * SR * 0.85)
        M.add("bass", (base + k) * TICK * SR, tri(np.full(n, hz(m))) * env(n) * 0.4)

# 굿거리 장구: 덩 . 기 덕 . 쿵 . 따 쿵 . 덕 .
JANG = {0: "dung", 2: "gi", 3: "deok", 5: "kung", 7: "deok", 8: "kung", 10: "deok"}
for b in range(BARS):
    T = lambda k: (b * BAR + k) * TICK * SR
    big = form[b][0] == "all"
    for k, kind in JANG.items():
        j = rng.uniform(-0.004, 0.004) * SR
        if kind == "dung": M.add("perc", T(k), buk(1.0)); M.add("perc", T(k), noise(0.08, 0.025, 2, 0.4))
        elif kind == "kung": M.add("perc", T(k) + j, buk(0.55, f0=150, base=85, dur=0.18))
        elif kind == "deok": M.add("perc", T(k) + j, noise(0.08, 0.022, 2, 0.32))
        elif kind == "gi": M.add("perc", T(k) + j, noise(0.05, 0.012, 1, 0.2))
    for k in ((0, 6) if not big else (0, 3, 6, 9)):            # 설쇠는 가볍게, 마지막엔 박마다
        M.add("perc", T(k), seolsoe(0.8 if k == 0 else 0.5))
    if b % 8 == 0:
        M.add("jing", T(0), jing(0.9))

export(M.t["mel"] + M.t["pluck"] + M.t["bass"] + M.t["perc"] * 0.75 + M.t["jing"], "bgm_ending_happy")

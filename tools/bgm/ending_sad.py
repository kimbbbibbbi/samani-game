# bgm_ending_sad — 8비트 칩튠 + 제주 장례 민요 〈진토굿노래〉 모티브 (엔딩 B·D)
# 무덤 흙을 파며 부르던 소리: 선소리꾼이 이별·인생무상을 메기고 여럿이 받음
# 세요성(잘게 떠는 소리)과 퇴성(끌어내리는 소리)을 크게 / 악기 반주 대신 흙 파는 '툭' 소리
# 선법: 솔라도레미 (C 솔) / 아주 느린 3소박 4박
import numpy as np
from chip import *

BPM = 52; TICK = 60 / BPM / 3; BAR = 12
# 솔=C4 라=D4 도=F4 레=G4 미=A4 솔'=C5 라'=D5 / 낮은 미=A3
A3, C4, D4, F4, G4, A4, C5, D5 = 57, 60, 62, 65, 67, 69, 72, 74
CALLS = [
    [(C5,6,"s"),(A4,3,""),(G4,3,""),   (A4,3,""),(G4,2,""),(F4,1,""),(G4,6,"t")],
    [(G4,3,""),(A4,3,""),(C5,3,""),(D5,3,""),   (C5,6,"v"),(A4,6,"t")],
    [(F4,3,""),(G4,3,""),(A4,6,"v"),   (G4,3,""),(F4,2,""),(D4,1,""),(C4,6,"t")],
    [(D5,6,"s"),(C5,3,""),(A4,3,""),   (G4,3,""),(A4,2,""),(G4,1,""),(F4,6,"t")],
]
RESP = [(F4,3,""),(G4,3,""),(F4,2,""),(D4,1,""),(C4,3,""),   (D4,3,""),(C4,2,""),(A3,1,""),(C4,6,"t")]
for p in CALLS + [RESP]: assert sum(d for _m, d, _o in p) == 24
form = []
for c in CALLS: form += [("call", c), ("resp", RESP)]
BARS = len(form) * 2

M = Mix(BARS * BAR * TICK, ["mel", "drone", "perc"])
tick = 0
for role, phrase in form:
    for m, d, orn in phrase:
        n = int(d * TICK * SR * 0.96); at = tick * TICK * SR
        f = curve(m, n, orn, vib_rate=6.5, vib_depth=0.55, fall=3.0, fall_len=0.6)
        amp = env(n, a=0.04, r=0.2)
        if orn == "t": amp *= np.linspace(1, 0.5, n)
        if role == "call":   # 선소리꾼: 가늘고 떨리는 소리
            s = pulse(f, 0.125) * 0.8 + tri(f) * 0.5
            M.add("mel", at, s * amp * 0.24)
        else:                # 여럿이 받는 소리: 낮게, 조금씩 어긋난 음정으로 겹침
            s = pulse(f, 0.5) * 0.45 + pulse(f * 1.006, 0.25) * 0.35 + tri(f * 0.5) * 0.6
            M.add("mel", at, s * amp * 0.22)
        tick += d
dry = M.t["mel"].copy()
for k, g in [(1, 0.32), (2, 0.14)]:
    M.t["mel"] += np.roll(dry, int(k * 0.6 * SR)) * g

# 낮게 깔리는 지속음 (솔-레)
seg = 4 * BAR * TICK
for b in range(0, BARS, 4):
    n = int(seg * SR)
    s = tri(np.full(n, hz(36))) * 0.6 + tri(np.full(n, hz(43) * 1.002)) * 0.25
    M.add("drone", b * BAR * TICK * SR, s * env(n, a=0.8, r=0.8) * 0.26)

# 흙 파는 소리(둔탁한 '툭') + 아주 가끔 먼 북, 8마디마다 낮은 징
for b in range(BARS):
    T = lambda k: (b * BAR + k) * TICK * SR
    M.add("perc", T(0), buk(0.7, f0=70, base=40, dur=0.5))
    M.add("perc", T(6) + rng.uniform(-0.02, 0.02) * SR, noise(0.12, 0.04, 6, 0.22) + buk(0.3, f0=60, base=45, dur=0.12)[:int(0.12*SR)])
    if b % 8 == 0:
        M.add("perc", T(0), jing(0.7, f=82, length=5.0, decay=1.8))

export(M.t["mel"] + M.t["drone"] + M.t["perc"], "bgm_ending_sad")

# bgm_village — 8비트 칩튠 + 제주 민요(서우젯소리) 스타일
# 선법: 도레미솔라 (F 도) / 장단: 3소박 4박 (12/8) / 형식: 메기고(앞소리) 받기(뒷소리)
import numpy as np, subprocess, sys

SR = 44100
BPM = 92                    # 점4분음표(한 박) 기준
TICK = 60 / BPM / 3         # 1소박
BAR = 12
rng = np.random.default_rng(7)

def hz(m): return 440 * 2 ** ((m - 69) / 12)

# ---------------- 악보 (MIDI 번호, 소박 수, 꾸밈) ----------------
# 도=F4(65) 레=G(67) 미=A(69) 솔=C5(72) 라=D5(74) 도'=F5(77) 레'=G5(79)
F4, G4, A4, C5, D5, F5, G5 = 65, 67, 69, 72, 74, 77, 79
# 꾸밈: "s"=아래서 밀어 올림, "v"=농현(떠는 소리), "k"=끝을 꺾어 내림
C1 = [(C5,6,"s"),(D5,3,""),(C5,3,""),  (A4,2,""),(C5,1,""),(D5,3,""),(C5,3,""),(A4,3,"")]
C2 = [(A4,3,""),(C5,3,""),(D5,2,""),(F5,1,""),(D5,3,""),  (C5,3,""),(A4,2,""),(G4,1,""),(A4,6,"v")]
C3 = [(F5,6,"s"),(D5,3,""),(F5,2,""),(G5,1,""),  (F5,3,""),(D5,3,""),(C5,6,"v")]
C4 = [(D5,3,""),(C5,2,""),(A4,1,""),(C5,3,""),(D5,3,""),  (C5,2,""),(A4,1,""),(G4,3,""),(A4,2,""),(G4,1,""),(F4,3,"k")]
C5_ = [(G5,3,"s"),(F5,2,""),(D5,1,""),(F5,6,"v"),  (D5,3,""),(C5,3,""),(D5,2,""),(C5,1,""),(A4,3,"")]
R  = [(C5,3,""),(D5,2,""),(C5,1,""),(A4,3,""),(G4,3,""),  (A4,3,""),(G4,3,""),(F4,6,"v")]   # 뒷소리(후렴) → 도로 끝남
R2 = [(D5,3,""),(F5,2,""),(D5,1,""),(C5,3,""),(A4,3,""),  (C5,2,""),(D5,1,""),(A4,3,""),(C5,6,"v")]  # 솔로 끝남(B부분)

form = [("call",C1),("resp",R),("call",C2),("resp",R),
        ("call",C3),("resp",R2),("call",C5_),("resp",R2),
        ("call",C4),("resp",R),("call",C2),("resp",R)]
# 마디별 베이스 근음 (24마디)
roots = [41,41,48,41, 41,38,48,41,   48,50,48,48, 50,48,46,48,   50,48,43,41, 41,38,48,41]
# F2=41 C3=48 D3=50 G2=43 Bb2=46? (Bb는 음계 밖이라 쓰지 않음) → 46은 D2로 대체
roots = [38 if r == 46 else r for r in roots]

TOTAL_TICKS = 24 * BAR
N = int(round(TOTAL_TICKS * TICK * SR))
mix = {k: np.zeros(N) for k in ["lead", "resp", "bass", "perc", "jing"]}

def add(track, start, sig):
    """루프 끝을 넘친 소리는 앞으로 감아서 이음새 없이"""
    i = int(start) % N
    n = len(sig)
    end = i + n
    if end <= N:
        mix[track][i:end] += sig
    else:
        k = N - i
        mix[track][i:] += sig[:k]
        rest = sig[k:]
        while len(rest):
            m = min(len(rest), N)
            mix[track][:m] += rest[:m]
            rest = rest[m:]

def pulse(freq_curve, duty):
    ph = np.cumsum(freq_curve / SR) % 1.0
    return np.where(ph < duty, 1.0, -1.0)

def tri(freq_curve):
    ph = np.cumsum(freq_curve / SR) % 1.0
    t = 4 * np.abs(ph - 0.5) - 1
    return np.round(t * 7) / 7        # 4비트 계단 삼각파(패미컴 느낌)

def env(n, a=0.005, r=0.04, sus=1.0, decay=None):
    t = np.arange(n) / SR
    e = np.ones(n) * sus
    if decay: e = sus * np.exp(-t / decay)
    na = max(1, int(a * SR)); e[:na] *= np.linspace(0, 1, na)
    nr = min(n, int(r * SR)); e[-nr:] *= np.linspace(1, 0, nr)
    return e

def note_curve(m, n, orn):
    f = np.full(n, hz(m))
    t = np.arange(n) / SR
    if orn == "s":       # 아래(온음)에서 밀어 올리기
        k = min(n, int(0.07 * SR))
        f[:k] = hz(m) * 2 ** (np.linspace(-2, 0, k) / 12)
    if orn in ("v", "s") and n > SR * 0.6 or orn == "v":   # 농현: 늦게 시작해 점점 깊게
        start = 0.35 * t[-1]
        depth = np.clip((t - start) / (t[-1] - start + 1e-9), 0, 1) * 0.6   # 반음의 60%까지
        f *= 2 ** (depth * np.sin(2 * np.pi * 4.5 * t) / 12)
    if orn == "k":       # 끝을 꺾어 내림
        k = min(n, int(0.12 * SR))
        f[-k:] *= 2 ** (np.linspace(0, -1.5, k) / 12)
    return f

# ---------------- 멜로디 ----------------
tick = 0
for role, phrase in form:
    for m, d, orn in phrase:
        n = int(d * TICK * SR * 0.94)
        start = tick * TICK * SR
        f = note_curve(m, n, orn)
        if role == "call":     # 앞소리: 혼자 부르는 얇은 목소리
            s = pulse(f, 0.125) * 0.9 + pulse(f * 1.003, 0.25) * 0.25
            add("lead", start, s * env(n, r=0.05) * 0.30)
        else:                  # 뒷소리: 여럿이 받는 두꺼운 소리 (옥타브 겹침)
            s = pulse(f, 0.25) * 0.8 + pulse(f * 0.5 * 1.004, 0.5) * 0.45 + pulse(f * 0.997, 0.25) * 0.3
            add("resp", start, s * env(n, r=0.05) * 0.24)
        tick += d

# ---------------- 베이스 (삼각파) : 덩 . . 쿵 . . | 덕 . . 쿵 . ----------------
for b in range(24):
    r = roots[b]
    for t0, d, m in [(0, 3, r), (6, 2, r + 7), (9, 2, r)]:
        n = int(d * TICK * SR * 0.9)
        f = np.full(n, hz(m))
        add("bass", (b * BAR + t0) * TICK * SR, tri(f) * env(n, r=0.03) * 0.42)

# ---------------- 타악 (연물) ----------------
def buk(vol=1.0):            # 북: 음정이 떨어지는 낮은 소리
    n = int(0.28 * SR); t = np.arange(n) / SR
    f = 110 * np.exp(-t * 9) + 55
    return tri(f) * np.exp(-t * 14) * vol

def janggu_kung(vol=1.0):    # 장구 북편 '쿵'
    n = int(0.18 * SR); t = np.arange(n) / SR
    f = 160 * np.exp(-t * 18) + 90
    return tri(f) * np.exp(-t * 20) * vol

def noise_burst(dur, decay, step, vol):   # 패미컴식 노이즈 (샘플 홀드 간격으로 음색 조절)
    n = int(dur * SR)
    raw = rng.choice([-1.0, 1.0], size=n // step + 1)
    s = np.repeat(raw, step)[:n]
    return s * np.exp(-np.arange(n) / SR / decay) * vol

def deok(vol=1.0):           # 장구 채편 '덕'
    return noise_burst(0.09, 0.025, 2, 0.5 * vol)

def gi(vol=1.0):             # 잔가락 '기'
    return noise_burst(0.05, 0.012, 1, 0.28 * vol)

def seolsoe(vol=1.0):        # 설쇠: 작은 놋쇠 그릇 – 비조화 배음의 짧은 쇳소리
    n = int(0.16 * SR); t = np.arange(n) / SR
    s = sum(pulse(np.full(n, fr), 0.5) * w for fr, w in [(1480, .5), (2093, .35), (2794, .25), (3517, .18)])
    s = s + noise_burst(0.16, 0.03, 1, 0.3)
    return s * np.exp(-t / 0.045) * 0.22 * vol

def jing(vol=1.0):           # 대영(징): 길게 우는 쇳소리, 살짝 맥놀이
    n = int(3.2 * SR); t = np.arange(n) / SR
    f0 = 98 * (1 + 0.02 * np.exp(-t * 3))
    s = (np.sin(2*np.pi*np.cumsum(f0)/SR) + 0.6*np.sin(2*np.pi*np.cumsum(f0*1.006)/SR)
         + 0.35*np.sin(2*np.pi*np.cumsum(f0*2.71)/SR) + 0.2*np.sin(2*np.pi*np.cumsum(f0*4.13)/SR))
    s = np.round(s * 6) / 6                       # 거칠게 양자화 → 8비트 질감
    a = np.minimum(1, t / 0.03)
    return s * a * np.exp(-t / 1.1) * 0.16 * vol

# 3소박 4박 장구 가락 (소박 위치: 종류)
JANGGU = {0: "dung", 3: "gi", 5: "deok", 6: "kung", 8: "deok", 9: "kung", 10: "gi", 11: "deok"}
for b in range(24):
    base = b * BAR
    for t0, kind in JANGGU.items():
        at = (base + t0) * TICK * SR
        jit = rng.uniform(-0.004, 0.004) * SR        # 사람 손 느낌
        if kind == "dung":
            add("perc", at, buk(1.0)); add("perc", at, deok(0.9))
        elif kind == "kung": add("perc", at + jit, janggu_kung(0.8))
        elif kind == "deok": add("perc", at + jit, deok(0.7))
        elif kind == "gi":   add("perc", at + jit, gi(0.8))
    for t0 in (0, 3, 6, 9):                          # 설쇠는 박마다, 첫 박에 힘
        add("perc", (base + t0) * TICK * SR, seolsoe(1.0 if t0 == 0 else 0.55))
    if b % 4 == 0:                                   # 4마디(메기고 받기 한 바퀴)마다 징
        add("jing", base * TICK * SR, jing(1.0 if b % 8 == 0 else 0.7))

out = mix["lead"] + mix["resp"] + mix["bass"] + mix["perc"] * 0.8 + mix["jing"]
out = np.tanh(out * 1.1)                             # 살짝 눌러 뭉치게
# (전체 8비트 양자화는 잡음이 커서 뺌 — 음색 자체로 8비트 느낌)
out *= 10 ** (-3 / 20) / np.max(np.abs(out))
pcm = (out * 32767).astype("<i2").tobytes()
name = sys.argv[1] if len(sys.argv) > 1 else "bgm_village"
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1",
                "-i", "-", "-b:a", "128k", f"{name}.mp3"], input=pcm, check=True)
print(f"{name}.mp3  {N/SR:.1f}s")

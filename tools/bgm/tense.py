# bgm_tense — 8비트 칩튠 + 제주 시왕맞이 굿(차사영맞이) 모티브
# 선법: 솔라도레미 (E 솔) / 장단: 빠른 2소박 4박 / 악기: 설쇠·북·장구·대영(징)
# 굿판이 무르익어 연물이 몰아칠 때의 느낌: 설쇠가 쉬지 않고 쪼고, 북이 밀고, 심방이 소리를 메김
import numpy as np, subprocess, sys

SR = 44100
BPM = 150                     # 4분음표 기준
TICK = 60 / BPM / 2           # 8분음표 = 1소박
BAR = 8
rng = np.random.default_rng(23)
def hz(m): return 440 * 2 ** ((m - 69) / 12)

# 솔=E4(64) 라=F#4(66) 도=A4(69) 레=B4(71) 미=C#5(73) 솔'=E5(76) 라'=F#5(78) 도'=A5(81) 레'=B5(83)
E4, Fs4, A4, B4, Cs5, E5, Fs5, A5, B5 = 64, 66, 69, 71, 73, 76, 78, 81, 83
_ = None
M1 = [(E5,2,""),(E5,1,""),(Fs5,1,""),(E5,2,""),(Cs5,2,""),  (B4,2,""),(Cs5,1,""),(B4,1,""),(A4,2,""),(B4,2,"")]
M2 = [(B4,2,""),(A4,1,""),(B4,1,""),(Cs5,2,""),(E5,2,""),   (Cs5,4,"v"),(B4,2,""),(A4,2,"")]
M3 = [(A4,1,""),(B4,1,""),(Cs5,1,""),(E5,1,""),(Fs5,4,"s"), (E5,2,""),(Cs5,2,""),(E5,4,"v")]
M4 = [(Fs5,2,""),(E5,1,""),(Cs5,1,""),(B4,2,""),(A4,2,""),  (B4,2,""),(A4,1,""),(Fs4,1,""),(E4,4,"k")]
M5 = [(A5,4,"s"),(Fs5,2,""),(E5,2,""),                       (Fs5,2,""),(A5,2,""),(Fs5,2,""),(E5,2,"")]
M6 = [(E5,2,""),(Fs5,2,""),(A5,2,""),(B5,2,""),              (A5,4,"v"),(Fs5,2,""),(E5,2,"")]
CALL = [(E5,1,""),(E5,1,""),(_,1,""),(Cs5,1,""),(E5,2,""),(_,2,"")]
RESP = [(B4,1,""),(B4,1,""),(_,1,""),(A4,1,""),(B4,2,""),(_,2,"")]
CR = [("lead", n) for n in CALL] + [("resp", n) for n in RESP]

def L(p): return [("lead", n) for n in p]
sections = [
    L(M1), L(M2), L(M1), L(M4),        # A
    L(M3), L(M2), L(M3), L(M4),        # B
    L(M5), L(M6), L(M5), L(M4),        # C (높게)
    CR, CR, CR, CR,                    # D (메기고 받기, 타악이 앞으로)
    L(M1), L(M2), L(M3), L(M4),        # E
]
for s in sections: assert sum(d for _v, (_m, d, _o) in s) == 16
BARS = len(sections) * 2
# 마디별 근음 (E=솔, A=도, B=레)
ROOT = {"E": 40, "A": 45, "B": 47}
roots = ("EEEB" "EEEB" "EAEB" "EAEB" "AAEB" "AAEB" "EEEE" "EEEE" "EAEB" "EAEB")
assert len(roots) == BARS

N = int(round(BARS * BAR * TICK * SR))
mix = {k: np.zeros(N) for k in ["lead", "ost", "bass", "perc", "jing"]}

def add(track, start, sig):
    i = int(start) % N
    while len(sig):
        k = min(len(sig), N - i)
        mix[track][i:i+k] += sig[:k]
        sig = sig[k:]; i = 0

def pulse(f, duty):
    ph = np.cumsum(f / SR) % 1.0
    return np.where(ph < duty, 1.0, -1.0)

def tri(f):
    ph = np.cumsum(f / SR) % 1.0
    return np.round((4 * np.abs(ph - 0.5) - 1) * 7) / 7

def env(n, a=0.004, r=0.03):
    e = np.ones(n)
    na = max(1, int(a * SR)); e[:na] *= np.linspace(0, 1, na)
    nr = min(n, int(r * SR)); e[-nr:] *= np.linspace(1, 0, nr)
    return e

def curve(m, n, orn):
    t = np.arange(n) / SR
    f = np.full(n, hz(m))
    if orn == "s":
        k = min(n, int(0.05 * SR)); f[:k] = hz(m) * 2 ** (np.linspace(-2, 0, k) / 12)
    if orn == "v":
        depth = np.clip((t - 0.3 * t[-1]) / (0.7 * t[-1] + 1e-9), 0, 1) * 0.5
        f *= 2 ** (depth * np.sin(2 * np.pi * 7 * t) / 12)
    if orn == "k":
        k = min(n, int(0.15 * SR)); f[-k:] *= 2 ** (np.linspace(0, -2, k) / 12)
    return f

# ---------------- 선율 ----------------
tick = 0
for sec in sections:
    for voice, (m, d, orn) in sec:
        if m is not None:
            n = int(d * TICK * SR * 0.9)
            f = curve(m, n, orn)
            if voice == "lead":   # 심방의 메기는 소리: 날카로운 25% 펄스
                s = pulse(f, 0.25) * 0.8 + pulse(f * 1.005, 0.125) * 0.3
                add("lead", tick * TICK * SR, s * env(n) * 0.24)
            else:                 # 소미들의 받는 소리: 낮고 두껍게
                s = pulse(f, 0.5) * 0.6 + pulse(f * 0.5, 0.25) * 0.5
                add("lead", tick * TICK * SR, s * env(n) * 0.22)
        tick += d

# ---------------- 반복 음형 (오스티나토) + 베이스 ----------------
for b in range(BARS):
    r = ROOT[roots[b]]
    base = b * BAR
    pat = [r + 12, r + 19, r + 17, r + 19, r + 12, r + 19, r + 21, r + 19]   # 솔-레-도-레 ... 굴리는 음형
    for k, m in enumerate(pat):
        n = int(TICK * SR * 0.6)
        add("ost", (base + k) * TICK * SR, pulse(np.full(n, hz(m)), 0.125) * env(n, r=0.02) * 0.10)
    for k in range(8):                                                         # 8분음표로 미는 베이스
        n = int(TICK * SR * 0.7)
        m = r if k % 4 != 3 else r + 7
        add("bass", (base + k) * TICK * SR, tri(np.full(n, hz(m))) * env(n, r=0.02) * (0.45 if k % 4 == 0 else 0.33))

# ---------------- 연물 (타악) ----------------
def noise(dur, decay, step, vol):
    n = int(dur * SR)
    s = np.repeat(rng.choice([-1.0, 1.0], size=n // step + 1), step)[:n]
    return s * np.exp(-np.arange(n) / SR / decay) * vol

def buk(vol):
    n = int(0.22 * SR); t = np.arange(n) / SR
    return tri(130 * np.exp(-t * 14) + 55) * np.exp(-t * 16) * vol

def deok(vol): return noise(0.07, 0.02, 2, 0.45 * vol)
def gi(vol):   return noise(0.04, 0.01, 1, 0.25 * vol)

def seolsoe(vol):            # 설쇠: 놋쇠 그릇을 두 채로 쪼는 소리
    n = int(0.09 * SR); t = np.arange(n) / SR
    s = sum(pulse(np.full(n, fr), 0.5) * w for fr, w in [(1568, .5), (2217, .35), (2960, .25), (3729, .18)])
    s = s + noise(0.09, 0.02, 1, 0.3)
    return s * np.exp(-t / 0.03) * 0.16 * vol

def jing(vol):
    n = int(3.0 * SR); t = np.arange(n) / SR
    f0 = 98 * (1 + 0.02 * np.exp(-t * 3))
    s = (np.sin(2*np.pi*np.cumsum(f0)/SR) + 0.6*np.sin(2*np.pi*np.cumsum(f0*1.006)/SR)
         + 0.35*np.sin(2*np.pi*np.cumsum(f0*2.71)/SR))
    s = np.round(s * 6) / 6
    return s * np.minimum(1, t / 0.02) * np.exp(-t / 1.0) * 0.17 * vol

for b in range(BARS):
    T = lambda k: (b * BAR + k) * TICK * SR
    sec_d = 24 <= b < 32                       # D 부분: 타악을 더 몰아침
    last = b == BARS - 1
    for k, v in [(0, 1.0), (3, 0.6), (4, 0.9), (6, 0.6)]:
        add("perc", T(k), buk(v))
    for k in (2, 5, 7):
        add("perc", T(k) + rng.uniform(-0.003, 0.003) * SR, deok(0.8))
    for k in range(8):                         # 설쇠: 8분음표마다 쉬지 않고, 박에 힘
        add("perc", T(k), seolsoe(1.0 if k % 2 == 0 else 0.5))
        if sec_d or last:                      # 16분음표로 쪼개 몰아치기
            add("perc", T(k + 0.5), seolsoe(0.35))
            add("perc", T(k + 0.5), gi(0.6))
    if last:                                   # 처음으로 돌아가기 전 장구 몰아치기
        for k in range(16):
            add("perc", T(k / 2), deok(0.4 + k * 0.04))
    if b % 4 == 0:
        add("jing", T(0), jing(1.0 if b % 8 == 0 else 0.7))

out = mix["lead"] + mix["ost"] + mix["bass"] + mix["perc"] * 0.75 + mix["jing"]
out = np.tanh(out * 1.2)
out *= 10 ** (-3 / 20) / np.max(np.abs(out))
name = sys.argv[1] if len(sys.argv) > 1 else "bgm_tense"
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1",
                "-i", "-", "-b:a", "128k", f"{name}.mp3"], input=(out * 32767).astype("<i2").tobytes(), check=True)
print(f"{name}.mp3  {N/SR:.1f}s")

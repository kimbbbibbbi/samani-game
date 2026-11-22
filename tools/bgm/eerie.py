# bgm_eerie — 8비트 칩튠 + 제주 귀양풀이(죽은 이를 저승으로 보내는 굿) 모티브
# 선법: 솔라도레미 (D 솔) / 장단: 느린 3소박 4박 / 악기: 요령(방울)·북·장구·징
# 선율: 심방이 본풀이를 읊듯 좁은 음역에서 같은 음을 되뇌다 끝을 끌어내림(퇴성), 잘게 떠는 소리(세요성)
import numpy as np, subprocess, sys

SR = 44100
BPM = 60
TICK = 60 / BPM / 3
BAR = 12
BARS = 16
rng = np.random.default_rng(11)
def hz(m): return 440 * 2 ** ((m - 69) / 12)

# 솔=D4(62) 라=E4(64) 도=G4(67) 레=A4(69) 미=B4(71) / 낮은 미=B3(59) 낮은 레=A3(57) / 높은 솔=D5(74)
A3, B3, D4, E4, G4, A4, B4, D5 = 57, 59, 62, 64, 67, 69, 71, 74
_ = None  # 쉼표
# 꾸밈: s=밀어올림  v=세요성(잘게 떠는 소리)  t=퇴성(끝을 끌어내림)
P = [
 [(A4,6,"s"),(A4,2,""),(G4,1,""),(A4,3,""),   (G4,3,""),(E4,3,""),(D4,6,"t")],
 [(_,3,""),(D4,2,""),(E4,1,""),(G4,3,""),(A4,3,""),   (B4,6,"v"),(A4,3,""),(G4,3,"")],
 [(A4,3,""),(A4,2,""),(B4,1,""),(A4,3,""),(G4,3,""),   (E4,3,""),(G4,2,""),(E4,1,""),(D4,6,"t")],
 [(_,6,""),(B3,3,""),(D4,3,""),   (E4,12,"v")],
 [(D5,6,"s"),(B4,3,""),(A4,3,""),   (B4,3,""),(A4,2,""),(G4,1,""),(A4,6,"v")],
 [(G4,3,""),(A4,3,""),(B4,2,""),(D5,1,""),(B4,3,""),   (A4,6,"t"),(_,6,"")],
 [(A4,3,""),(G4,3,""),(E4,3,""),(G4,3,""),   (E4,3,""),(D4,3,""),(B3,6,"t")],
 [(D4,3,""),(E4,3,""),(D4,2,""),(B3,1,""),(A3,3,""),   (D4,12,"v")],
]
for p in P: assert sum(d for _m, d, _o in p) == 24

N = int(round(BARS * BAR * TICK * SR))
mix = {k: np.zeros(N) for k in ["lead", "drone", "perc", "bell", "jing", "wind"]}

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

def env(n, a=0.01, r=0.08):
    e = np.ones(n)
    na = max(1, int(a * SR)); e[:na] *= np.linspace(0, 1, na)
    nr = min(n, int(r * SR)); e[-nr:] *= np.linspace(1, 0, nr)
    return e

def curve(m, n, orn):
    t = np.arange(n) / SR
    f = np.full(n, hz(m))
    if orn == "s":
        k = min(n, int(0.12 * SR)); f[:k] = hz(m) * 2 ** (np.linspace(-2, 0, k) / 12)
    if orn == "v" or n > SR * 1.5:      # 세요성: 빠르고 잘게, 뒤로 갈수록 깊게
        start = 0.25 * t[-1]
        depth = np.clip((t - start) / (t[-1] - start + 1e-9), 0, 1) * 0.45
        f *= 2 ** (depth * np.sin(2 * np.pi * 6.5 * t) / 12)
    if orn == "t":                      # 퇴성: 끝을 길게 끌어내림
        k = min(n, int(0.45 * SR))
        f[-k:] *= 2 ** (np.linspace(0, -2.5, k) ** 1 / 12)
    return f

# ---------------- 선율 (심방의 소리) ----------------
tick = 0
for b in range(BARS // 2):
    for m, d, orn in P[b]:
        if m is not None:
            n = int(d * TICK * SR * 0.95)
            f = curve(m, n, orn)
            s = pulse(f, 0.5) * 0.55 + pulse(f * 1.004, 0.125) * 0.35 + tri(f * 0.5) * 0.5
            amp = env(n, a=0.03, r=0.15)
            if orn == "t": amp *= np.linspace(1, 0.55, n)    # 끌어내리며 사그라짐
            add("lead", tick * TICK * SR, s * amp * 0.22)
        tick += d
# 메아리 (원형 지연 → 이음새 없음)
dry = mix["lead"].copy()
for k, g in [(1, 0.38), (2, 0.18), (3, 0.08)]:
    mix["lead"] += np.roll(dry, int(k * 0.5 * SR)) * g

# ---------------- 낮은 지속음 (솔-레, 삼각파) ----------------
for b in range(0, BARS, 2):
    n = int(2 * BAR * TICK * SR)
    t = np.arange(n) / SR
    root = 38 if (b // 2) % 4 != 3 else 45          # D2, 4번째마다 A2
    amp = (0.6 + 0.4 * np.sin(2 * np.pi * t / (2 * BAR * TICK) - np.pi / 2) * -1) * env(n, a=0.4, r=0.4)
    s = tri(np.full(n, hz(root))) * 0.6 + tri(np.full(n, hz(root + 7) * 1.002)) * 0.25
    add("drone", b * BAR * TICK * SR, s * amp * 0.30)

# ---------------- 타악 ----------------
def noise(dur, decay, step, vol):
    n = int(dur * SR)
    s = np.repeat(rng.choice([-1.0, 1.0], size=n // step + 1), step)[:n]
    return s * np.exp(-np.arange(n) / SR / decay) * vol

def buk(vol):                       # 북: 낮고 둔하게 (심장 소리처럼)
    n = int(0.5 * SR); t = np.arange(n) / SR
    return tri(80 * np.exp(-t * 7) + 42) * np.exp(-t * 8) * vol

def deok(vol): return noise(0.08, 0.02, 3, 0.35 * vol)
def gi(vol):   return noise(0.05, 0.01, 1, 0.2 * vol)

def bell_hit(vol):                  # 요령 한 번: 비조화 배음 방울 소리
    n = int(0.5 * SR); t = np.arange(n) / SR
    s = sum(pulse(np.full(n, fr), 0.5) * w for fr, w in [(2349, .5), (3322, .3), (4186, .2), (5274, .12)])
    return s * np.exp(-t / 0.09) * 0.10 * vol

def yoryeong(add_at, dur, vol):     # 요령 흔들기: 잘게 연달아 울림
    t = 0.0
    while t < dur:
        g = vol * (1 - t / dur) ** 1.5 * rng.uniform(0.6, 1.0)
        add("bell", add_at + t * SR, bell_hit(g))
        t += rng.uniform(0.05, 0.08)

def jing(vol):
    n = int(5.0 * SR); t = np.arange(n) / SR
    f0 = 82 * (1 + 0.02 * np.exp(-t * 2))
    s = (np.sin(2*np.pi*np.cumsum(f0)/SR) + 0.6*np.sin(2*np.pi*np.cumsum(f0*1.007)/SR)
         + 0.3*np.sin(2*np.pi*np.cumsum(f0*2.71)/SR))
    s = np.round(s * 6) / 6
    return s * np.minimum(1, t / 0.04) * np.exp(-t / 1.8) * 0.2 * vol

for b in range(BARS):
    base = b * BAR * TICK * SR
    T = lambda k: base + k * TICK * SR
    add("perc", T(0), buk(1.0))
    add("perc", T(0) + 0.28 * SR, buk(0.45))      # 쿵-쿵 (심장 박동)
    add("perc", T(6), buk(0.6))
    add("perc", T(9), deok(0.8))
    add("perc", T(11), gi(0.7))
    if b % 2 == 0:                                  # 소리 한 줄 시작마다 요령을 흔듦
        yoryeong(T(0), 0.9, 1.0)
    else:
        add("bell", T(6), bell_hit(0.5))
    if b % 8 == 0:
        add("jing", T(0), jing(1.0 if b == 0 else 0.75))

# ---------------- 바람 소리 (저음 노이즈가 천천히 일렁임) ----------------
t = np.arange(N) / SR
step = 40
raw = np.repeat(rng.uniform(-1, 1, N // step + 1), step)[:N]
k = 300; raw = np.convolve(np.concatenate([raw[-k:], raw]), np.ones(k) / k, "valid")[:N]   # 원형으로 부드럽게
lfo = 0.5 + 0.5 * np.sin(2 * np.pi * t / (N / SR / 4))          # 루프 안에 4번 일렁임 (이음새 맞음)
mix["wind"] = raw / (np.max(np.abs(raw)) + 1e-9) * lfo * 0.10

out = mix["lead"] + mix["drone"] + mix["perc"] + mix["bell"] + mix["jing"] + mix["wind"]
out = np.tanh(out * 1.1)
out *= 10 ** (-3 / 20) / np.max(np.abs(out))
name = sys.argv[1] if len(sys.argv) > 1 else "bgm_eerie"
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1",
                "-i", "-", "-b:a", "128k", f"{name}.mp3"], input=(out * 32767).astype("<i2").tobytes(), check=True)
print(f"{name}.mp3  {N/SR:.1f}s")

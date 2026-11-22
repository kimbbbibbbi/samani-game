# 엔딩 곡 2개가 같이 쓰는 8비트 소리 도구
import numpy as np, subprocess

SR = 44100
rng = np.random.default_rng(5)
def hz(m): return 440 * 2 ** ((m - 69) / 12)

class Mix:
    def __init__(self, seconds, tracks):
        self.N = int(round(seconds * SR))
        self.t = {k: np.zeros(self.N) for k in tracks}
    def add(self, track, start, sig):          # 루프 끝을 넘으면 앞으로 감음 → 이음새 없음
        i = int(start) % self.N
        while len(sig):
            k = min(len(sig), self.N - i)
            self.t[track][i:i+k] += sig[:k]
            sig = sig[k:]; i = 0

def pulse(f, duty):
    ph = np.cumsum(f / SR) % 1.0
    return np.where(ph < duty, 1.0, -1.0)

def tri(f):
    ph = np.cumsum(f / SR) % 1.0
    return np.round((4 * np.abs(ph - 0.5) - 1) * 7) / 7

def env(n, a=0.005, r=0.05):
    e = np.ones(n)
    na = max(1, int(a * SR)); e[:na] *= np.linspace(0, 1, na)
    nr = min(n, int(r * SR)); e[-nr:] *= np.linspace(1, 0, nr)
    return e

def curve(m, n, orn, vib_rate=5.0, vib_depth=0.5, fall=2.0, fall_len=0.3):
    t = np.arange(n) / SR
    f = np.full(n, hz(m))
    if orn == "s":
        k = min(n, int(0.08 * SR)); f[:k] = hz(m) * 2 ** (np.linspace(-2, 0, k) / 12)
    if orn in ("v", "t") and n > SR * 0.5:
        d = np.clip((t - 0.3 * t[-1]) / (0.7 * t[-1] + 1e-9), 0, 1) * vib_depth
        f *= 2 ** (d * np.sin(2 * np.pi * vib_rate * t) / 12)
    if orn == "t":
        k = min(n, int(fall_len * SR)); f[-k:] *= 2 ** (np.linspace(0, -fall, k) / 12)
    return f

def noise(dur, decay, step, vol):
    n = int(dur * SR)
    s = np.repeat(rng.choice([-1.0, 1.0], size=n // step + 1), step)[:n]
    return s * np.exp(-np.arange(n) / SR / decay) * vol

def buk(vol, f0=110, base=55, dur=0.28):
    n = int(dur * SR); t = np.arange(n) / SR
    return tri(f0 * np.exp(-t * 10) + base) * np.exp(-t * 13) * vol

def seolsoe(vol, dur=0.14):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(pulse(np.full(n, fr), 0.5) * w for fr, w in [(1480, .5), (2093, .35), (2794, .25), (3517, .18)])
    return (s + noise(dur, 0.03, 1, 0.3)) * np.exp(-t / 0.04) * 0.2 * vol

def jing(vol, f=98, length=3.0, decay=1.1):
    n = int(length * SR); t = np.arange(n) / SR
    f0 = f * (1 + 0.02 * np.exp(-t * 3))
    s = (np.sin(2*np.pi*np.cumsum(f0)/SR) + 0.6*np.sin(2*np.pi*np.cumsum(f0*1.006)/SR)
         + 0.35*np.sin(2*np.pi*np.cumsum(f0*2.71)/SR))
    s = np.round(s * 6) / 6
    return s * np.minimum(1, t / 0.03) * np.exp(-t / decay) * 0.16 * vol

def export(sig, name, drive=1.1):
    out = np.tanh(sig * drive)
    out *= 10 ** (-3 / 20) / np.max(np.abs(out))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1",
                    "-i", "-", "-b:a", "128k", f"{name}.mp3"], input=(out * 32767).astype("<i2").tobytes(), check=True)
    print(f"{name}.mp3  {len(sig)/SR:.1f}s")

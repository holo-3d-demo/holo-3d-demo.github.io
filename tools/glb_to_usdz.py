"""
GLB → USDZ Dönüştürücü
-----------------------
Kullanım:
  python tools/glb_to_usdz.py

models/ klasöründeki tüm .glb dosyalarını .usdz'ye dönüştürür.
"""

import subprocess
import sys
from pathlib import Path

MODELS_DIR = Path(__file__).parent.parent / "models"

def glb_to_usdz(glb_path: Path) -> Path:
    usdz_path = glb_path.with_suffix(".usdz")
    try:
        # usd-core paketi ile gelen usdzconvert / usdzip aracını dene
        result = subprocess.run(
            ["usdzconvert", str(glb_path), str(usdz_path)],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            return usdz_path
        else:
            print(f"  [HATA] usdzconvert: {result.stderr.strip()}")
    except FileNotFoundError:
        pass

    # usd-core Python API'si ile dene
    try:
        from pxr import Usd, UsdUtils
        stage = Usd.Stage.Open(str(glb_path))
        UsdUtils.CreateNewUsdzPackage(glb_path.as_posix(), str(usdz_path))
        return usdz_path
    except Exception as e:
        print(f"  [HATA] Python API: {e}")

    return None

def main():
    glb_files = list(MODELS_DIR.glob("*.glb"))
    if not glb_files:
        print("models/ klasöründe .glb dosyası bulunamadı.")
        return

    print(f"{len(glb_files)} GLB dosyası bulundu:\n")
    success = []
    fail = []

    for glb in glb_files:
        print(f"  Dönüştürülüyor: {glb.name} ...", end=" ", flush=True)
        usdz = glb_to_usdz(glb)
        if usdz and usdz.exists():
            kb = usdz.stat().st_size // 1024
            print(f"✅  ({kb} KB) → {usdz.name}")
            success.append(usdz)
        else:
            print("❌  Başarısız")
            fail.append(glb)

    print(f"\nSonuç: {len(success)} başarılı, {len(fail)} başarısız.")

    if success:
        print("\nmenu.js için usdz alanları:")
        for usdz in success:
            stem = usdz.stem
            print(f'  usdz: \'models/{stem}.usdz\',')

if __name__ == "__main__":
    main()

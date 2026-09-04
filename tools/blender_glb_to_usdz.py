"""
Blender GLB → USDZ Dönüştürücü (GitHub Actions için)
-------------------------------------------------------
Kullanım (Blender headless):
  blender --background --python tools/blender_glb_to_usdz.py

models/ klasöründeki tüm .glb dosyalarını .usdz'ye dönüştürür.
Blender 3.6+ gerektirir.
"""

import bpy
import sys
from pathlib import Path

# Blender'ın kendi obje listesini temizle
def sahneyi_temizle():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    # Orphan data'yı temizle
    for block in bpy.data.meshes:
        bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        bpy.data.materials.remove(block)
    for block in bpy.data.textures:
        bpy.data.textures.remove(block)
    for block in bpy.data.images:
        bpy.data.images.remove(block)

MODELS_DIR = Path(__file__).parent.parent / "models"
glb_files = list(MODELS_DIR.glob("*.glb"))

if not glb_files:
    print("models/ klasöründe .glb dosyası bulunamadı.")
    sys.exit(0)

print(f"\n{len(glb_files)} GLB dosyası bulundu:\n")
basarili = []
basarisiz = []

for glb in glb_files:
    usdz = glb.with_suffix(".usdz")
    print(f"  Dönüştürülüyor: {glb.name} ...", end=" ", flush=True)
    try:
        sahneyi_temizle()

        # GLB'yi içe aktar
        bpy.ops.import_scene.gltf(filepath=str(glb))

        # USDZ olarak dışa aktar
        bpy.ops.wm.usd_export(
            filepath=str(usdz),
            export_textures=True,
            relative_paths=False,
            export_materials=True,
            export_mesh_colors=True,
            export_normals=True,
        )

        if usdz.exists():
            kb = usdz.stat().st_size // 1024
            print(f"✅  ({kb} KB) → {usdz.name}")
            basarili.append(usdz)
        else:
            print("❌  Dosya oluşturulamadı")
            basarisiz.append(glb)
    except Exception as e:
        print(f"❌  Hata: {e}")
        basarisiz.append(glb)

print(f"\nSonuç: {len(basarili)} başarılı, {len(basarisiz)} başarısız.")
if basarisiz:
    print("Başarısız:", [f.name for f in basarisiz])

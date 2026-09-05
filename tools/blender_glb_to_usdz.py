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

def tabani_sifira_hizala():
    """
    Modelin en alt noktasını (tabanını) Z=0 (zemin) seviyesine çeker.
    Bu işlem, LiDAR olmayan telefonlarda masa yüzeyine tutunmayı belirgin şekilde hızlandırır.
    """
    min_z = float('inf')
    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            for vertex in obj.data.vertices:
                world_coord = obj.matrix_world @ vertex.co
                if world_coord.z < min_z:
                    min_z = world_coord.z
                    
    if min_z != float('inf') and abs(min_z) > 0.0001:
        for obj in bpy.data.objects:
            if obj.type == 'MESH':
                obj.location.z -= min_z

def materyalleri_duzelt():
    """
    KHR_materials_unlit → USDZ dönüşümünde iPhone RealityKit rengi soluklaştırıyor.
    Neden: Blender'ın USDZ exporter'ı unlit materyali Principled BSDF olarak yazıyor,
    Apple RealityKit bunu PBR olarak yorumlayıp ortam ışığını DOKRUNUN ÜZERİNE bindirir.
    
    Çözüm: Principled BSDF yerine Emission shader kullan.
    Emission shader USDZ'de emissive=1 olarak işaretlenir; RealityKit bu durumda
    ortam ışığı hesabını devre dışı bırakır → renkler orijinal tarama dokusu gibi çıkar.
    """
    for mat in bpy.data.materials:
        mat.use_nodes = True
        mat.use_backface_culling = False
        if hasattr(mat, 'blend_mode'):
            mat.blend_mode = 'OPAQUE'
        if hasattr(mat, 'shadow_mode'):
            mat.shadow_mode = 'OPAQUE'
            
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        
        # Mevcut doku düğümünü bul
        tex_node = None
        for node in nodes:
            if node.type == 'TEX_IMAGE' and node.image:
                tex_node = node
                break
        
        if not tex_node:
            continue

        # Tüm mevcut düğümleri temizle (Principled BSDF dahil)
        nodes.clear()

        # Doku düğümünü yeniden oluştur
        new_tex = nodes.new(type='ShaderNodeTexImage')
        new_tex.image = tex_node.image

        # Emission shader: dokuyu olduğu gibi çıkarır, ışık hesabı yapmaz
        emission_node = nodes.new(type='ShaderNodeEmission')
        emission_node.inputs['Strength'].default_value = 1.0

        # Material Output
        output_node = nodes.new(type='ShaderNodeOutputMaterial')

        # Bağlantılar: Doku → Emission rengi → Output
        links.new(new_tex.outputs['Color'], emission_node.inputs['Color'])
        links.new(emission_node.outputs['Emission'], output_node.inputs['Surface'])

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

        # Tabanı tam sıfır noktasına oturt
        tabani_sifira_hizala()

        # Materyalleri düzenle - USDZ'de renk ve saydamlık kaybını önlemek için
        materyalleri_duzelt()

        # Tüm texture'ları belleğe al — USDZ'ye gömmek için şart
        bpy.ops.file.pack_all()

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

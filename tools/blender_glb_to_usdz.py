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

def materyalleri_duzelt():
    """
    Blender'ın glTF importçusu unlit veya saydamlık ayarlı materyalleri USDZ export
    sırasında gri/şeffaf gösterebilecek şekilde import edebilir.
    Bu fonksiyon her materyali temiz, opak (opaque) ve iki taraflı (double-sided) bir Principled BSDF düğümüne bağlar.
    """
    for mat in bpy.data.materials:
        mat.use_nodes = True
        mat.use_backface_culling = False  # Arka yüzlerin saydam görünmesini engelle
        if hasattr(mat, 'blend_mode'):
            mat.blend_mode = 'OPAQUE'
        if hasattr(mat, 'shadow_mode'):
            mat.shadow_mode = 'OPAQUE'
            
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        
        # Resim dokularını bul
        tex_node = None
        for node in nodes:
            if node.type == 'TEX_IMAGE' and node.image:
                tex_node = node
                break
        
        if not tex_node:
            continue

        # Principled BSDF düğümünü bul veya oluştur
        bsdf_node = None
        for node in nodes:
            if node.type == 'BSDF_PRINCIPLED':
                bsdf_node = node
                break
        
        if not bsdf_node:
            bsdf_node = nodes.new(type='ShaderNodeBsdfPrincipled')
        
        # Output düğümünü bul veya oluştur
        output_node = None
        for node in nodes:
            if node.type == 'OUTPUT_MATERIAL':
                output_node = node
                break
        
        if not output_node:
            output_node = nodes.new(type='ShaderNodeOutputMaterial')

        # Doku -> Principled BSDF Base Color bağlantısı yap
        base_color_input = bsdf_node.inputs.get('Base Color')
        if base_color_input:
            for link in list(base_color_input.links):
                links.remove(link)
            links.new(tex_node.outputs['Color'], base_color_input)

        # Alpha (saydamlık) bağlantısını tamamen temizle ve %100 Opak (1.0) yap
        alpha_input = bsdf_node.inputs.get('Alpha')
        if alpha_input:
            for link in list(alpha_input.links):
                links.remove(link)
            alpha_input.default_value = 1.0

        # Metallic & Roughness değerlerini ayarla
        if 'Metallic' in bsdf_node.inputs:
            bsdf_node.inputs['Metallic'].default_value = 0.0
        if 'Roughness' in bsdf_node.inputs:
            bsdf_node.inputs['Roughness'].default_value = 0.7

        # Principled BSDF -> Material Output Surface
        surface_input = output_node.inputs.get('Surface')
        if surface_input:
            for link in list(surface_input.links):
                links.remove(link)
            links.new(bsdf_node.outputs['BSDF'], surface_input)

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

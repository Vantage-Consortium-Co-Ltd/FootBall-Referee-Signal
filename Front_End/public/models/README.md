# 3D Humanoid Models (`Front_End/public/models/`)

## Default Bundled Model (`referee.glb`)
- **Source:** Khronos glTF Sample Assets — `CesiumMan.glb`
- **License:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (© 2017 Cesium / Khronos Group)
- **Size:** ~428 KB

## Replacing with a Custom MakeHuman / MPFB2 (CC0) Referee Model
The `GLB_Rig_Adapter.ts` engine uses **world-space quaternion delta retargeting**, so you can replace `Front_End/public/models/referee.glb` (or upload a `.glb` directly in the `/signals` viewer HUD) with any standard rigged humanoid `.glb` without modifying pose code:

1. Open **Blender** with the **MPFB2 (MakeHuman Plugin for Blender)** addon installed.
2. Generate an athletic adult humanoid mesh (MakeHuman exported meshes are **CC0**).
3. Dress the character in referee attire (jersey, shorts, socks, cleats) and add the **Game Engine Rig** (standard 53-bone MakeHuman rig) or Mixamo/VRM humanoid rig.
4. Ensure textures are resized to **1024×1024** (WebP/PNG) for fast web loading (< 2 MB).
5. Export as **glTF Binary (`.glb`)** with:
   - `+Y Up` enabled
   - `Apply Modifiers` enabled
   - `Skinning` enabled
6. Save as `Front_End/public/models/referee.glb` (or test immediately using the **นำเข้า .glb** button in `/signals`).

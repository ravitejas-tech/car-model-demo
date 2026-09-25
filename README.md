# Velocity GT — Interactive 3D Showroom

A single-page, interactive car showroom built with React Router 7, React Three Fiber and Tailwind CSS 4.

## What you can do

- **Orbit the car.** Drag to rotate and scroll or pinch to zoom. It auto-rotates when idle and pauses while you interact.
- **Change the paint.** Seven finishes blend smoothly on the car, and the whole UI accent (buttons, rim light, turntable glow) follows the paint.
- **Jump between camera angles.** 360°, Front, Side, Rear and Top, each with a smooth camera flight.
- **Customise the garage.** Open the Garage tab to choose a room (Hex Garage, Neon Night, Concrete Loft, Carbon Studio), a floor (gloss epoxy, polished concrete, checker tiles) and the lighting level. Every room is low-key: a pool of light on the car, accent rim lighting, and walls that fade into darkness, so the paint stands out. The room is procedural geometry, and the paint reflects it.
- **View specs.** A side sheet on desktop or a bottom sheet on mobile, with animated performance bars.
- **Reserve or book a test drive.** A dialog shows your configuration summary and price. Demo only; nothing is sent anywhere.
- **Use keyboard shortcuts.** `←` / `→` cycle paint, `1`–`5` switch camera angles, `Esc` closes panels.

## Performance notes

- `public/models/car.glb` is compressed with [glTF-Transform](https://gltf-transform.dev) (Meshopt + WebP textures): **27.6 MB → 5.9 MB**. Material names are preserved, since the configurator targets the `carpaint` material.
- **The paint has no normal map.** The source model tiled a noise normal map over the body, which showed up as spots in the reflections. The encode script below removes it, and `car-model.tsx` also clears it at runtime.
- **Normals are stored at 14 bits, not the default 8.** With 8-bit normals, clearcoat reflections break up into blocks.
- Reflections come from an unlit copy of the garage baked into a cube map once per theme or paint change. The brightness slider only changes `environmentIntensity`, so dragging it never re-bakes.
- `PerformanceMonitor` lowers the pixel ratio on slower GPUs and falls back to a plain floor without bloom or real-time shadows if the frame rate stays low. Add `?quality=low` to the URL to force this mode.

To re-encode a new model (run from a folder with `@gltf-transform/core`, `@gltf-transform/extensions`, `@gltf-transform/functions`, `meshoptimizer` and `sharp` installed):

```js
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { dedup, flatten, join, prune, quantize, reorder, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
const doc = await io.read("input.glb");
for (const m of doc.getRoot().listMaterials()) if (m.getName() === "carpaint") m.setNormalTexture(null);
await doc.transform(
  dedup(), flatten(), join(), weld(), prune(),
  textureCompress({ encoder: sharp, targetFormat: "webp" }),
  reorder({ encoder: MeshoptEncoder }),
  quantize({ quantizePosition: 16, quantizeNormal: 14, quantizeTexcoord: 14 }),
);
doc.createExtension(EXTMeshoptCompression).setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await io.write("public/models/car.glb", doc);
```

Don't merge materials (no `palette()`), or the paint can no longer be targeted.

## Project structure

```
app/
  lib/showroom.ts            paints, camera views, specs data
  lib/garage.ts              garage themes, floor finishes, room size
  components/scene/          everything inside the <Canvas>
    showroom-stage.tsx       canvas, lights, floor finishes, bloom, reflections, view offset
    garage-room.tsx          procedural garage: walls, ceiling fixtures, slats, neon, sign
    camera-rig.tsx           camera controls, view transitions, auto-rotate, stays inside the room
    car-model.tsx            model loading, sizing, paint blending
  components/ui/             DOM overlay: header, hero, dock, specs, dialog, loader
  routes/home.tsx            state and wiring
```

## Getting started

```bash
yarn install
yarn dev          # http://localhost:5173
yarn typecheck
yarn build && yarn start
```

A `Dockerfile` is included for container deployments:

```bash
docker build -t car-model-demo .
docker run -p 3000:3000 car-model-demo
```

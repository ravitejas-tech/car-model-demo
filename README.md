# Velocity GT — Interactive 3D Showroom

A single-page, interactive car showroom built with React Router 7, React Three Fiber and Tailwind CSS 4. The concept is **a private garage after dark**: you start the car, the room wakes up around it, and the car is the brightest thing in it. The UI stays quiet so the car does the talking.

## The entry

1. **Black screen, thin loading line.**
2. **The gate.** Letterbox bars and a silhouette of the car, edged by a rim light while the camera drifts slowly. The only control is a push-to-start button ("Enter silently" skips the sound; `Enter` also works).
3. **Ignition.** The starter cranks and the frame judders. The engine catches with a rev, and the headlights and taillights double-flash on.
4. **Lights.** The ceiling lights strike one after another, rippling out from the car with a switch clunk each. A shaft of light and drifting dust fill the bay, and a thin ring draws itself around the car.
5. **Reveal.** The camera makes a long, slow pull-back to the hero shot while a title card plays. The letterbox bars retract and the UI rises in.

## What you can do

- **Rev it.** Tap **REV** or press `Space` for a throttle blip. You get the sound, the needle, and the body squats and rolls with the V8's torque. `E` stops or restarts the engine.
- **Change the paint.** Seven lacquered dots, bottom right. A scanner gantry sweeps nose to tail and repaints the car as it passes, with a glowing seam on the bodywork and a laser line on the floor.
- **Customize.** The popover next to the paints holds the garage (Hex, Neon, Concrete, Carbon), the floor (gloss epoxy, polished concrete, checker tiles), the light level and camera angles. The paint reflects the room.
- **Orbit.** Drag to rotate and scroll or pinch to zoom. Once you let go it slowly orbits again.
- **Specs, test drive, reserve.** Demo only; nothing is sent anywhere.

## Sound

All audio is synthesized with WebAudio in `app/lib/engine-audio.ts`, with no audio files. It includes the V8 start-up and lumpy idle, throttle blips, light-switch clunks and a scanner whoosh. The engine sound, rev counter, headlights, body motion and camera shake all read one rpm curve from `app/lib/experience.ts`, so they stay in sync. A header toggle mutes it.

## How the scene is orchestrated

`app/lib/stage-state.ts` holds a small mutable store (gate/intro times, room power, engine level, rpm, paint-scan time) that scene components read inside `useFrame`. Per-frame animation therefore never goes through React state. `INTRO` in that file and `ENTRY` in `routes/home.tsx` set the choreography.

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
  lib/stage-state.ts         shared animation state and intro timeline
  components/scene/          everything inside the <Canvas>
    showroom-stage.tsx       canvas, lights, floor finishes, bloom, reflections, view offset
    garage-room.tsx          procedural garage: walls, ceiling fixtures (ripple power-on), slats, neon
    effects.tsx              intro director, light cones, dust, paint-scanner gantry, stage ring
    car-lights.tsx           headlights, beams, taillights, engine idle motion
    camera-rig.tsx           camera controls, view transitions, auto-rotate, stays inside the room
    car-model.tsx            model loading, sizing, paint-scanner shader
  components/ui/             DOM overlay: entry, header, title, paint bar + customize, ignition, specs, dialog, loader
  lib/experience.ts          engine state and the shared rpm timeline
  lib/engine-audio.ts        WebAudio engine, switch and scanner sounds
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

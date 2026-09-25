# Velocity GT — Interactive 3D Showroom

A single-page, interactive car showroom built with React Router 7, React Three Fiber and Tailwind CSS 4.

## What you can do

- **Orbit the car.** Drag to rotate and scroll or pinch to zoom. It auto-rotates when idle and pauses while you interact.
- **Change the paint.** Seven finishes blend smoothly on the car, and the whole UI accent (buttons, rim light, turntable glow) follows the paint.
- **Jump between camera angles.** 360°, Front, Side, Rear and Top, each with a smooth camera flight.
- **Explore hotspots.** Glowing points on the car open detail cards and fly the camera to that feature. Markers fade out when they face away from you.
- **View specs.** A side sheet on desktop or a bottom sheet on mobile, with animated performance bars.
- **Reserve or book a test drive.** A dialog shows your configuration summary and price. Demo only; nothing is sent anywhere.
- **Use keyboard shortcuts.** `←` / `→` cycle paint, `1`–`5` switch camera angles, `Esc` closes panels.

## Performance notes

- `public/models/car.glb` is compressed with [glTF-Transform](https://gltf-transform.dev) (Meshopt geometry + WebP textures): **27.6 MB → 4.3 MB**. Material names are preserved, since the configurator targets the `carpaint` material.
- Studio lighting uses drei `Lightformer`s instead of a downloaded HDRI, so there's no extra network request.
- `PerformanceMonitor` lowers the pixel ratio on slower GPUs and falls back to a plain floor without real-time shadows if the frame rate stays low. Add `?quality=low` to the URL to force this mode.

To re-optimise a new model:

```bash
npx @gltf-transform/cli optimize input.glb public/models/car.glb \
  --compress meshopt --texture-compress webp --simplify false --palette false
```

(`--palette false` keeps materials separate so the paint can still be targeted.)

## Project structure

```
app/
  lib/showroom.ts            paints, camera views, hotspots, specs data
  components/scene/          everything inside the <Canvas>
    showroom-stage.tsx       canvas, lighting, reflective floor, turntable, view offset
    camera-rig.tsx           camera controls, view transitions, auto-rotate
    car-model.tsx            model loading, sizing, paint blending
    hotspots.tsx             3D-anchored markers
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

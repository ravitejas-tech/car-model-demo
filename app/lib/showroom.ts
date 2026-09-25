// Static data for the showroom: paints, camera views and specs.
// Model space: the car's nose points along +Z, roof along +Y.

export type Vec3 = [number, number, number];

export type Paint = {
    id: string;
    name: string;
    /** Finish shown in the configurator, e.g. Metallic. */
    finish: string;
    /** Body colour applied to the `carpaint` material. */
    color: string;
    /** UI accent derived from the paint, tuned for contrast on a dark background. */
    accent: string;
    metalness: number;
    roughness: number;
    price: number;
};

export const PAINTS: Paint[] = [
    { id: "velocity-green", name: "Velocity Green", finish: "Metallic", color: "#0d6e2c", accent: "#22c55e", metalness: 0.55, roughness: 0.3, price: 0 },
    { id: "rosso-corsa", name: "Rosso Corsa", finish: "Solid", color: "#b00c16", accent: "#f43f5e", metalness: 0.5, roughness: 0.28, price: 2400 },
    { id: "liquid-gold", name: "Liquid Gold", finish: "Metallic", color: "#a8802a", accent: "#e5b84b", metalness: 0.85, roughness: 0.24, price: 4800 },
    { id: "midnight-blue", name: "Midnight Blue", finish: "Pearl", color: "#16307a", accent: "#60a5fa", metalness: 0.55, roughness: 0.28, price: 2400 },
    { id: "nardo-grey", name: "Nardo Grey", finish: "Solid", color: "#6a6e71", accent: "#cbd5e1", metalness: 0.25, roughness: 0.4, price: 1800 },
    { id: "glacier-white", name: "Glacier White", finish: "Pearl", color: "#e6e7e9", accent: "#f5f5f4", metalness: 0.12, roughness: 0.3, price: 1800 },
    { id: "obsidian", name: "Obsidian Black", finish: "Metallic", color: "#0a0a0c", accent: "#a1a1aa", metalness: 0.6, roughness: 0.2, price: 2400 },
];

export const BASE_PRICE = 189000;

export type ViewId = "hero" | "front" | "side" | "rear" | "top";

export type CameraShot = {
    position: Vec3;
    target: Vec3;
    /** Seconds for the camera to settle; defaults to a quick move. */
    smoothTime?: number;
    /** How much further back to stand on portrait screens (default 1.25). */
    portraitScale?: number;
};

export const VIEWS: Record<ViewId, CameraShot & { label: string }> = {
    // Classic front three-quarter, camera a little below eye level.
    hero: { label: "360°", position: [5.4, 1.05, 5.9], target: [0, 0.6, 0], smoothTime: 1.1 },
    // Low and just off-axis: the grille and quad headlights, with depth.
    front: { label: "Front", position: [1.3, 0.72, 6.9], target: [0, 0.62, 0], smoothTime: 1.1 },
    // Pure profile at wheel-centre height, so the roofline reads long and low.
    side: { label: "Side", position: [7.5, 0.62, 0.3], target: [0, 0.6, 0], smoothTime: 1.1, portraitScale: 1.42 },
    // Rear three-quarter, low, with the taillights and the fastback.
    rear: { label: "Rear", position: [-3.8, 0.9, -6.1], target: [-0.2, 0.62, -0.55], smoothTime: 1.1 },
    // High three-quarter from just under the ceiling: the whole shape of the
    // body, the fastback and the bonnet scoop, with the car fully in frame.
    top: { label: "Top", position: [4.2, 4.85, 6.4], target: [0, 0.3, 0], smoothTime: 1.1 },
};

export const VIEW_ORDER: ViewId[] = ["hero", "front", "side", "rear", "top"];

/** Low, head-on angle the camera swings to when the engine starts. */
export const IGNITION_SHOT: CameraShot = { position: [3.4, 0.62, 6.9], target: [0, 0.62, 0.4] };

/**
 * The waiting shot before entry: low and close on the front three-quarter,
 * so the rim light draws the car's silhouette against the dark.
 */
export const GATE_SHOT: CameraShot = { position: [3.9, 0.5, 5.3], target: [0, 0.58, 0.25], smoothTime: 0.01 };

/** Once the car is running, the camera eases back to the hero shot as the lights come up. */
export const REVEAL_SHOT: CameraShot = { ...VIEWS.hero, smoothTime: 2.6 };

export const HEADLINE_STATS = [
    { value: 620, suffix: "hp", label: "Twin-turbo V8" },
    { value: 3.2, suffix: "s", label: "0–100 km/h", decimals: 1 },
    { value: 318, suffix: "km/h", label: "Top speed" },
];

export const SPEC_BARS = [
    { label: "Power", value: "620 hp", ratio: 0.86 },
    { label: "Torque", value: "800 Nm", ratio: 0.8 },
    { label: "Top speed", value: "318 km/h", ratio: 0.9 },
    { label: "Braking 100–0", value: "30.9 m", ratio: 0.78 },
];

export const SPEC_TABLE = [
    ["Engine", "4.0 L twin-turbo V8"],
    ["Transmission", "8-speed dual clutch"],
    ["Drive", "All-wheel drive, torque vectoring"],
    ["Length", "4,660 mm"],
    ["Width", "1,960 mm"],
    ["Height", "1,240 mm"],
    ["Kerb weight", "1,690 kg"],
    ["Range (combined)", "540 km"],
];

export function formatPrice(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(value);
}

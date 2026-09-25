// Static data for the showroom: paints, camera views, hotspots and specs.
// Model space: the car's nose points along +Z, roof along +Y.

export type Vec3 = [number, number, number];

export type Paint = {
    id: string;
    name: string;
    /** Body colour applied to the `carpaint` material. */
    color: string;
    /** UI accent derived from the paint, tuned for contrast on a dark background. */
    accent: string;
    metalness: number;
    roughness: number;
    price: number;
};

export const PAINTS: Paint[] = [
    { id: "velocity-green", name: "Velocity Green", color: "#0b5c24", accent: "#22c55e", metalness: 0.9, roughness: 0.28, price: 0 },
    { id: "rosso-corsa", name: "Rosso Corsa", color: "#9b0a12", accent: "#f43f5e", metalness: 0.85, roughness: 0.25, price: 2400 },
    { id: "liquid-gold", name: "Liquid Gold", color: "#a17a26", accent: "#e5b84b", metalness: 1, roughness: 0.22, price: 4800 },
    { id: "midnight-blue", name: "Midnight Blue", color: "#0f1f5c", accent: "#60a5fa", metalness: 0.9, roughness: 0.26, price: 2400 },
    { id: "nardo-grey", name: "Nardo Grey", color: "#5f6366", accent: "#cbd5e1", metalness: 0.35, roughness: 0.42, price: 1800 },
    { id: "glacier-white", name: "Glacier White", color: "#e6e7e9", accent: "#f5f5f4", metalness: 0.3, roughness: 0.3, price: 1800 },
    { id: "obsidian", name: "Obsidian Black", color: "#0a0a0c", accent: "#a1a1aa", metalness: 0.9, roughness: 0.2, price: 2400 },
];

export const BASE_PRICE = 189000;

export type ViewId = "hero" | "front" | "side" | "rear" | "top";

export type CameraShot = { position: Vec3; target: Vec3 };

export const VIEWS: Record<ViewId, CameraShot & { label: string }> = {
    hero: { label: "360°", position: [5.7, 1.75, 6.3], target: [0, 0.55, 0] },
    front: { label: "Front", position: [0.001, 1, 7.6], target: [0, 0.55, 0] },
    side: { label: "Side", position: [8.4, 0.9, 0.001], target: [0, 0.55, 0] },
    rear: { label: "Rear", position: [-2.8, 1.4, -7], target: [0, 0.55, 0] },
    top: { label: "Top", position: [3.2, 7.4, 3.2], target: [0, 0.2, 0] },
};

export const VIEW_ORDER: ViewId[] = ["hero", "front", "side", "rear", "top"];

export type Hotspot = {
    id: string;
    title: string;
    stat: string;
    body: string;
    /** Position in raw model units (the model is scaled at runtime). */
    anchor: Vec3;
    /** Outward direction; the marker fades out when it faces away from the camera. */
    normal: Vec3;
    shot: CameraShot;
};

export const HOTSPOTS: Hotspot[] = [
    {
        id: "lights",
        title: "Matrix LED headlights",
        stat: "84 adaptive segments",
        body: "Each segment dims independently, so high beams stay on without dazzling oncoming traffic.",
        anchor: [62, 58, 214],
        normal: [0.45, 0.1, 1],
        shot: { position: [2.6, 1.05, 5.1], target: [0.4, 0.5, 1.6] },
    },
    {
        id: "wheels",
        title: "Forged 21\" wheels",
        stat: "Carbon-ceramic brakes",
        body: "Ten-piston front calipers bring the GT from 100 km/h to a stop in 30.9 metres.",
        anchor: [93, 32, 140],
        normal: [1, 0, 0.1],
        shot: { position: [5, 0.55, 3], target: [0.6, 0.35, 1.2] },
    },
    {
        id: "cabin",
        title: "Hand-stitched cabin",
        stat: "Panoramic glass roof",
        body: "Full-grain leather, open-pore walnut and a roof that tints on demand at the touch of a button.",
        anchor: [0, 121, -30],
        normal: [0, 1, 0],
        shot: { position: [3.1, 4.4, 2.3], target: [0, 0.8, -0.2] },
    },
    {
        id: "tail",
        title: "Signature light bar",
        stat: "Aero rear diffuser",
        body: "A single light blade spans the tail while the diffuser adds 120 kg of downforce at speed.",
        anchor: [60, 66, -223],
        normal: [0.35, 0.1, -1],
        shot: { position: [-2.4, 1.1, -5.4], target: [0.3, 0.55, -1.4] },
    },
];

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

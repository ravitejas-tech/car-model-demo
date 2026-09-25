// Static data for the showroom: paints, camera views and specs.
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
    { id: "velocity-green", name: "Velocity Green", color: "#0d6e2c", accent: "#22c55e", metalness: 0.55, roughness: 0.3, price: 0 },
    { id: "rosso-corsa", name: "Rosso Corsa", color: "#b00c16", accent: "#f43f5e", metalness: 0.5, roughness: 0.28, price: 2400 },
    { id: "liquid-gold", name: "Liquid Gold", color: "#a8802a", accent: "#e5b84b", metalness: 0.85, roughness: 0.24, price: 4800 },
    { id: "midnight-blue", name: "Midnight Blue", color: "#16307a", accent: "#60a5fa", metalness: 0.55, roughness: 0.28, price: 2400 },
    { id: "nardo-grey", name: "Nardo Grey", color: "#6a6e71", accent: "#cbd5e1", metalness: 0.25, roughness: 0.4, price: 1800 },
    { id: "glacier-white", name: "Glacier White", color: "#e6e7e9", accent: "#f5f5f4", metalness: 0.12, roughness: 0.3, price: 1800 },
    { id: "obsidian", name: "Obsidian Black", color: "#0a0a0c", accent: "#a1a1aa", metalness: 0.6, roughness: 0.2, price: 2400 },
];

export const BASE_PRICE = 189000;

export type ViewId = "hero" | "front" | "side" | "rear" | "top";

export type CameraShot = { position: Vec3; target: Vec3 };

export const VIEWS: Record<ViewId, CameraShot & { label: string }> = {
    hero: { label: "360°", position: [5.9, 1.15, 6.4], target: [0, 0.72, 0] },
    front: { label: "Front", position: [0.001, 1.05, 7.6], target: [0, 0.65, 0] },
    side: { label: "Side", position: [8.4, 0.95, 0.001], target: [0, 0.65, 0] },
    rear: { label: "Rear", position: [-2.8, 1.2, -7.2], target: [0, 0.65, 0] },
    top: { label: "Top", position: [3.3, 3.6, 3.3], target: [0, 0.3, 0] },
};

export const VIEW_ORDER: ViewId[] = ["hero", "front", "side", "rear", "top"];

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

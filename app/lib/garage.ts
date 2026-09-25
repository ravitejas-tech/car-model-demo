// Garage room presets. The room is procedural, so every option is just data.

export type LightStyle = "hex" | "strips" | "panels" | "rings";

export type GarageTheme = {
    id: string;
    name: string;
    tagline: string;
    /** Wall / ceiling base colours. */
    wall: string;
    ceiling: string;
    /** Colour behind everything (clear colour and fog). */
    background: string;
    /** Overhead light fixture style and colour. `"accent"` follows the paint. */
    lightStyle: LightStyle;
    lightColor: string | "accent";
    /** Wall treatment. */
    wallDetail: "slats" | "neon" | "wood" | "none";
    woodColor?: string;
    /** Preview used on the picker card. */
    preview: string;
};

export const GARAGE_THEMES: GarageTheme[] = [
    {
        id: "hex-garage",
        name: "Hex Garage",
        tagline: "Dark detailing bay under a honeycomb light",
        wall: "#131417",
        ceiling: "#08090a",
        background: "#050506",
        lightStyle: "hex",
        lightColor: "#dfe7f5",
        wallDetail: "slats",
        preview:
            "repeating-conic-gradient(from 30deg, #eef3ff 0 2deg, transparent 2deg 60deg) center/18px 18px, linear-gradient(160deg,#2a2d33,#0e0f12)",
    },
    {
        id: "neon-night",
        name: "Neon Night",
        tagline: "Blacked-out room, neon in your paint colour",
        wall: "#0a0a0d",
        ceiling: "#050506",
        background: "#030304",
        lightStyle: "strips",
        lightColor: "#c9d2f0",
        wallDetail: "neon",
        preview:
            "linear-gradient(90deg, transparent 46%, var(--accent) 46% 54%, transparent 54%) 0 0/14px 100%, linear-gradient(160deg,#141419,#040405)",
    },
    {
        id: "concrete-loft",
        name: "Concrete Loft",
        tagline: "Low warm light, raw concrete and walnut",
        wall: "#2c2a27",
        ceiling: "#121110",
        background: "#080706",
        lightStyle: "panels",
        lightColor: "#ffd6a8",
        wallDetail: "wood",
        woodColor: "#4a3120",
        preview:
            "linear-gradient(90deg, #6e4a2c 0 3px, #4a3120 3px 5px) 0 100%/5px 45% no-repeat repeat-x, linear-gradient(160deg,#5a5652,#26231f)",
    },
    {
        id: "carbon-studio",
        name: "Carbon Studio",
        tagline: "Pitch-black studio with halo rings",
        wall: "#08080a",
        ceiling: "#040405",
        background: "#020203",
        lightStyle: "rings",
        lightColor: "#ffffff",
        wallDetail: "none",
        preview:
            "radial-gradient(circle at 50% 38%, transparent 28%, #fff 29% 31%, transparent 32%), linear-gradient(160deg,#16161a,#030304)",
    },
];

export type FloorFinish = {
    id: "epoxy" | "concrete" | "checker";
    name: string;
    preview: string;
};

export const FLOOR_FINISHES: FloorFinish[] = [
    { id: "epoxy", name: "Gloss epoxy", preview: "linear-gradient(160deg,#2b2d33,#08090b 60%,#1c1d22)" },
    { id: "concrete", name: "Polished concrete", preview: "radial-gradient(circle at 30% 30%,#55524d,#26241f)" },
    { id: "checker", name: "Checker tiles", preview: "conic-gradient(#6b6b6b 25%,#111214 0 50%,#6b6b6b 0 75%,#111214 0) 0 0/16px 16px" },
];

/** Room size in metres. The camera is clamped to stay inside it. */
export const ROOM = { halfWidth: 12, halfDepth: 14, height: 4.2 };

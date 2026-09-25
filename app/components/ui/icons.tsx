type IconProps = { className?: string };

const base = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
};

export function LogoMark({ className }: IconProps) {
    return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden>
            <path d="M3 7h7l6 12 6-12h7L18.5 27h-5z" fill="var(--accent)" />
            <path d="M10 7h3l3 6 3-6h3l-6 12z" fill="#08090b" opacity="0.55" />
        </svg>
    );
}

export function RotateIcon({ className }: IconProps) {
    return (
        <svg {...base} className={className}>
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
        </svg>
    );
}

export function SunIcon({ className }: IconProps) {
    return (
        <svg {...base} className={className}>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
    );
}

export function CloseIcon({ className }: IconProps) {
    return (
        <svg {...base} className={className}>
            <path d="M6 6l12 12M18 6L6 18" />
        </svg>
    );
}

export function ArrowIcon({ className }: IconProps) {
    return (
        <svg {...base} className={className}>
            <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
    );
}

export function CheckIcon({ className }: IconProps) {
    return (
        <svg {...base} className={className}>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
    );
}

export function DragIcon({ className }: IconProps) {
    return (
        <svg {...base} className={className}>
            <path d="M8 10V5.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V10m0-.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1-6 6h-.6a6 6 0 0 1-4.9-2.5L3.8 14a1.5 1.5 0 0 1 2.4-1.8L8 14" />
        </svg>
    );
}

export function SpecsIcon({ className }: IconProps) {
    return (
        <svg {...base} className={className}>
            <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
    );
}

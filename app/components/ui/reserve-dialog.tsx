import { useEffect, useRef, useState, type FormEvent } from "react";
import { BASE_PRICE, formatPrice, type Paint } from "~/lib/showroom";
import { ArrowIcon, CheckIcon, CloseIcon } from "./icons";

export type ReserveMode = "reserve" | "test-drive";

type ReserveDialogProps = {
    mode: ReserveMode | null;
    paint: Paint;
    onClose: () => void;
};

/**
 * Reservation / test-drive request. Demo only: submitting shows a
 * confirmation locally and nothing leaves the browser.
 */
export function ReserveDialog({ mode, paint, onClose }: ReserveDialogProps) {
    const dialog = useRef<HTMLDialogElement>(null);
    const [reference, setReference] = useState<string | null>(null);
    const [name, setName] = useState("");

    useEffect(() => {
        const element = dialog.current;
        if (!element) return;
        if (mode && !element.open) {
            setReference(null);
            element.showModal();
        } else if (!mode && element.open) {
            element.close();
        }
    }, [mode]);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setName(String(data.get("name") ?? "").split(" ")[0]);
        setReference(`VGT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`);
    };

    const isTestDrive = mode === "test-drive";
    const total = BASE_PRICE + paint.price;

    return (
        <dialog
            ref={dialog}
            onClose={onClose}
            onClick={(event) => event.target === dialog.current && onClose()}
            className="m-auto w-[min(92vw,820px)] overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0d10] p-0 text-white shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
        >
            <div className="grid md:grid-cols-[1fr_1.15fr]">
                {/* Summary */}
                <div className="relative overflow-hidden border-b border-white/10 p-7 md:border-b-0 md:border-r">
                    <div
                        className="absolute -right-20 -top-20 size-64 rounded-full opacity-40 blur-3xl"
                        style={{ background: paint.color }}
                    />
                    <div className="relative">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">Your configuration</div>
                        <h2 className="mt-2 font-display text-2xl">Velocity GT</h2>
                        <div className="mt-6 flex items-center gap-3">
                            <span className="size-8 rounded-full ring-1 ring-white/20" style={{ background: paint.color }} />
                            <div>
                                <div className="text-sm font-medium">{paint.name}</div>
                                <div className="text-xs text-white/45">Exterior paint</div>
                            </div>
                        </div>
                        <dl className="mt-8 space-y-2 text-sm">
                            <div className="flex justify-between"><dt className="text-white/45">Base price</dt><dd className="tabular-nums">{formatPrice(BASE_PRICE)}</dd></div>
                            <div className="flex justify-between"><dt className="text-white/45">Paint</dt><dd className="tabular-nums">{paint.price ? formatPrice(paint.price) : "Included"}</dd></div>
                            <div className="flex justify-between border-t border-white/10 pt-3 text-base"><dt>Total</dt><dd className="font-semibold tabular-nums">{formatPrice(total)}</dd></div>
                        </dl>
                        <p className="mt-6 text-xs leading-relaxed text-white/35">Fully refundable {formatPrice(5000)} deposit. Demo only — no payment is taken.</p>
                    </div>
                </div>

                {/* Form / confirmation */}
                <div className="relative p-7">
                    <button type="button" onClick={onClose} className="absolute right-5 top-5 grid size-9 place-items-center rounded-full border border-white/10 text-white/60 hover:text-white" aria-label="Close">
                        <CloseIcon className="size-4" />
                    </button>

                    {reference ? (
                        <div className="reveal flex h-full flex-col items-start justify-center py-8">
                            <span className="grid size-12 place-items-center rounded-full bg-accent text-black">
                                <CheckIcon className="size-6" />
                            </span>
                            <h3 className="mt-5 text-2xl font-semibold">
                                {isTestDrive ? "Test drive requested" : "You're on the list"}{name ? `, ${name}` : ""}.
                            </h3>
                            <p className="mt-2 text-sm text-white/55">
                                A Velocity specialist will contact you within one business day.
                            </p>
                            <div className="mt-6 rounded-xl border border-white/10 px-4 py-3 text-sm">
                                Reference <span className="font-mono text-accent">{reference}</span>
                            </div>
                            <button type="button" onClick={onClose} className="mt-8 text-xs uppercase tracking-[0.2em] text-white/60 hover:text-white">
                                Back to showroom →
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="flex flex-col gap-4">
                            <h3 className="pr-10 text-xl font-semibold">{isTestDrive ? "Book a test drive" : "Reserve your GT"}</h3>
                            <p className="-mt-2 text-sm text-white/45">
                                {isTestDrive ? "Pick a day and we'll bring the car to you." : "Secure a build slot for the 2026 allocation."}
                            </p>
                            <Field label="Full name" name="name" autoComplete="name" required />
                            <Field label="Email" name="email" type="email" autoComplete="email" required />
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="City" name="city" autoComplete="address-level2" required />
                                {isTestDrive ? (
                                    <Field label="Preferred date" name="date" type="date" required />
                                ) : (
                                    <Field label="Phone" name="phone" type="tel" autoComplete="tel" />
                                )}
                            </div>
                            <button type="submit" className="group mt-3 flex items-center justify-center gap-3 rounded-full bg-accent py-4 text-xs font-bold uppercase tracking-[0.2em] text-black">
                                {isTestDrive ? "Request test drive" : "Reserve now"}
                                <ArrowIcon className="size-4 transition-transform group-hover:translate-x-1" />
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </dialog>
    );
}

function Field({ label, ...input }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.18em] text-white/45">{label}</span>
            <input
                {...input}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-accent [color-scheme:dark]"
            />
        </label>
    );
}

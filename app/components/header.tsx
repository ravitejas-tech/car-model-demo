export function Header() {
    return (
        <header className="absolute top-0 left-0 right-0 z-20 px-8 py-6 pointer-events-none">
            <nav className="flex items-center justify-between max-w-7xl mx-auto pointer-events-auto">
                <div className="text-2xl font-extrabold tracking-widest">
                    <span className="text-[#0b8e32]">VELOCITY</span>
                </div>
                <div className="hidden md:flex gap-10 text-gray-400 text-sm uppercase tracking-widest font-medium">
                    {["Models", "Technology", "Reserve", "Contact"].map(
                        (item) => (
                            <a
                                key={item}
                                href="#"
                                className="hover:text-[#0b6e28] transition-colors border-b-2 border-transparent hover:border-[#0b6e28] pb-1"
                            >
                                {item}
                            </a>
                        )
                    )}
                </div>
                <button className="rounded-lg border border-white/20 text-white px-6 py-2 text-sm uppercase tracking-wide hover:bg-[#0b6e28] hover:text-white hover:border-[#0b6e28] transition-all shadow-lg backdrop-blur-sm">
                    Test Drive
                </button>
            </nav>
        </header>
    );
}

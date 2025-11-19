export function HeroOverlay() {
    return (
        <div className="absolute top-0 -left-40 w-full h-full z-10 flex items-center pointer-events-none">
            <div className="container mx-auto px-8 max-w-7xl w-full">
                <div className="w-full md:w-1/2 pointer-events-auto flex flex-col items-start gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-[2px] w-12 bg-[#0b6e28]"></div>
                        <span className="text-[#0b6e28] uppercase tracking-[0.2em] text-sm font-bold">
                            The Golden Standard
                        </span>
                    </div>

                    <h1 className="text-6xl md:text-7xl font-black leading-tight">
                        <span className="text-white">PURE</span> <br />
                        <span className="text-[#0b6e28]">LUXURY</span>
                    </h1>

                    <p className="text-gray-400 text-lg max-w-md leading-relaxed">
                        Experience the fusion of classic muscle and modern
                        royalty. Defined by power, refined by gold.
                    </p>

                    <div className="flex gap-4 mt-4">
                        <button className="bg-[#0b6e28] text-white font-bold px-8 py-4 rounded-full uppercase tracking-wider hover:bg-white hover:text-[#0b6e28] transition-colors shadow-[0_0_20px_rgba(11,110,40,0.3)]">
                            Configure
                        </button>
                        <button className="border border-gray-600 text-gray-300 font-medium px-8 py-4 rounded-full uppercase tracking-wider hover:border-[#0b6e28] hover:text-[#0b6e28] transition-colors">
                            Watch Video
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

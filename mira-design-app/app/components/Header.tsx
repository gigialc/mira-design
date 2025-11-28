export default function Header() {
  return (
    <nav className="w-full py-4 px-8 relative z-10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo on the left */}
        <div className="flex items-center">
          <a href="#" className="text-3xl font-bold text-neutral-900 tracking-tight">
            Mira
          </a>
        </div>
        
        {/* Links and profile icon on the right */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-8">
            <a href="#" className="text-base font-normal text-neutral-600 hover:text-neutral-900 transition-colors">
              About
            </a>
            <a href="#" className="text-base font-normal text-neutral-600 hover:text-neutral-900 transition-colors">
              Services
            </a>
            <a href="#" className="text-base font-normal text-neutral-600 hover:text-neutral-900 transition-colors">
              Portfolio
            </a>
          </div>
          <button className="px-6 py-2.5 rounded-full text-sm font-normal text-neutral-900 bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 transition-all shadow-sm">
            Start
          </button>
        </div>
      </div>
    </nav>
  );
}


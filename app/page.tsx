import Converter from '@/components/Converter';
import { ShieldCheck, Zap, Shield, Award, Lock, Heart, CloudUpload } from 'lucide-react';

export default function Home() {
  return (
    <div className="h-screen flex flex-col text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden">
      <div className="bg-mesh" />
      
      {/* Header */}
      <header className="flex-shrink-0 max-w-7xl w-full mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <CloudUpload className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Fast WebP Converter</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-medium">Secure</span>
          </div>
          <div className="px-4 py-2 rounded-full border border-indigo-500/50 bg-indigo-500/10 text-indigo-400 text-xs font-bold tracking-wider">
            100% FREE
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden max-w-7xl w-full mx-auto px-6 py-4">
        <Converter />
      </main>

      <footer className="flex-shrink-0 py-4 flex items-center justify-center gap-2 text-slate-500 text-xs">
        <div className="h-px w-16 bg-gradient-to-r from-transparent to-white/10" />
        <span className="flex items-center gap-1">
          Built with <Heart className="w-3 h-3 text-red-500 fill-red-500" /> by 
          <a href="https://webdesignsutra.com" className="text-indigo-400 hover:text-indigo-300 transition-colors font-bold">Web Design Sutra</a>
        </span>
        <div className="h-px w-16 bg-gradient-to-l from-transparent to-white/10" />
      </footer>
    </div>
  );
}

import Converter from '@/components/Converter';
import { ShieldCheck, Zap, Shield, Award, Lock, Heart, CloudUpload } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen text-slate-200 font-sans selection:bg-indigo-500/30">
      <div className="bg-mesh" />
      
      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
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

      <main className="max-w-7xl mx-auto px-6 py-12">
        <Converter />
      </main>

      <footer className="py-12 flex items-center justify-center gap-2 text-slate-500 text-sm">
        <div className="h-px w-24 bg-gradient-to-r from-transparent to-white/10" />
        <span className="flex items-center gap-1">
          Built with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> for fast & secure image conversion
        </span>
        <div className="h-px w-24 bg-gradient-to-l from-transparent to-white/10" />
      </footer>
    </div>
  );
}

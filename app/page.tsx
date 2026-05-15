import Converter from '@/components/Converter';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans flex flex-col overflow-auto">
      <main className="flex-1 flex flex-col gap-6 p-6 md:p-12 mb-12">
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Fast WebP Converter
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Convert your bulk PNG and JPG files to WebP instantly on your device. Free, secure, and blazing fast.
          </p>
        </div>
        
        <Converter />
        
      </main>

      <footer className="py-8 border-t border-slate-800 text-center">
        <p className="text-slate-500 text-sm">
          Built for <a href="https://webpconvertor.webdesignsutra.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">WebP Converter</a> by <a href="https://webdesignsutra.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">Web Design Sutra</a>
        </p>
      </footer>
    </div>
  );
}

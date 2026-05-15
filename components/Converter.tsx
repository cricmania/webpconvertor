'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  CloudUpload, 
  FileImage, 
  CheckCircle, 
  Download, 
  Trash2, 
  Settings2, 
  Image as ImageIcon, 
  Loader2, 
  PackageOpen, 
  GripVertical, 
  X, 
  Columns2,
  Zap,
  Shield,
  Award,
  Lock,
  Folder,
  FileCode,
  File as FileIcon
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'motion/react';

interface FileItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  resultBlob?: Blob;
  resultUrl?: string;
  relativePath?: string;
}

export default function Converter() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [quality, setQuality] = useState(80);
  const [outputFormat, setOutputFormat] = useState<'webp' | 'jpeg' | 'avif'>('webp');
  const [renamePattern, setRenamePattern] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [seoFriendly, setSeoFriendly] = useState(true);
  const [maintainFolderStructure, setMaintainFolderStructure] = useState(true);
  const [previewingItem, setPreviewingItem] = useState<FileItem | null>(null);
  const [comparisonSliderPos, setComparisonSliderPos] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Load preferences
  useEffect(() => {
    const savedQuality = localStorage.getItem('webp-conv-quality');
    const savedFormat = localStorage.getItem('webp-conv-format');
    const savedPattern = localStorage.getItem('webp-conv-pattern');
    const savedSeo = localStorage.getItem('webp-conv-seo');
    const savedFolder = localStorage.getItem('webp-conv-folder');

    if (savedQuality) setQuality(parseInt(savedQuality));
    if (savedFormat) setOutputFormat(savedFormat as any);
    if (savedPattern) setRenamePattern(savedPattern);
    if (savedSeo) setSeoFriendly(savedSeo === 'true');
    if (savedFolder) setMaintainFolderStructure(savedFolder === 'true');
  }, []);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('webp-conv-quality', quality.toString());
    localStorage.setItem('webp-conv-format', outputFormat);
    localStorage.setItem('webp-conv-pattern', renamePattern);
    localStorage.setItem('webp-conv-seo', seoFriendly.toString());
    localStorage.setItem('webp-conv-folder', maintainFolderStructure.toString());
  }, [quality, outputFormat, renamePattern, seoFriendly, maintainFolderStructure]);

  const getNewName = useCallback((file: FileItem, index: number) => {
    let baseName = file.file.name.replace(/\.[^/.]+$/, "");
    if (renamePattern.trim()) {
      baseName = renamePattern.replace(/{n}/g, (index + 1).toString());
    }

    if (seoFriendly) {
      baseName = baseName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }
    
    return `${baseName}.${outputFormat === 'jpeg' ? 'jpg' : outputFormat}`;
  }, [renamePattern, outputFormat, seoFriendly]);

  const addFiles = useCallback((newFiles: File[], paths?: string[]) => {
    const validFiles = newFiles.filter(f => f.type.startsWith('image/jpeg') || f.type.startsWith('image/png') || f.type.startsWith('image/webp'));
    
    const newItems = validFiles.map((file, idx) => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending' as const,
      progress: 0,
      relativePath: paths?.[idx] || (file as any).webkitRelativePath || '',
    }));

    setFiles(prev => [...prev, ...newItems]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.items) {
      const items = Array.from(e.dataTransfer.items);
      const droppedFiles: File[] = [];
      const droppedPaths: string[] = [];

      const traverseFileTree = async (item: any, path: string = "") => {
        if (item.isFile) {
          const file = await new Promise<File>((resolve) => (item as any).file(resolve));
          droppedFiles.push(file);
          droppedPaths.push(path + item.name);
        } else if (item.isDirectory) {
          const dirReader = (item as any).createReader();
          const entries = await new Promise<any[]>((resolve) => dirReader.readEntries(resolve));
          for (const entry of entries) {
            await traverseFileTree(entry, path + item.name + "/");
          }
        }
      };

      for (const item of items) {
        const entry = (item as any).webkitGetAsEntry();
        if (entry) await traverseFileTree(entry);
      }

      addFiles(droppedFiles, droppedPaths);
    } else if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  }, [addFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  }, [addFiles]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
        if (fileToRemove.resultUrl) {
          URL.revokeObjectURL(fileToRemove.resultUrl);
        }
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    files.forEach(f => {
      URL.revokeObjectURL(f.previewUrl);
      if (f.resultUrl) URL.revokeObjectURL(f.resultUrl);
    });
    setFiles([]);
  }, [files]);

  const convertFile = (file: File, qualityNum: number, format: 'webp' | 'jpeg' | 'avif'): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mimeType = format === 'avif' ? 'image/avif' : `image/${format}`;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Conversion failed'));
            }
          },
          mimeType,
          qualityNum / 100
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const convertAll = async () => {
    if (isConverting || files.length === 0) return;
    setIsConverting(true);

    const updatedFiles = [...files];
    
    for (let i = 0; i < updatedFiles.length; i++) {
      if (updatedFiles[i].status === 'done') continue;
      
      setFiles(currentFiles => 
        currentFiles.map(f => f.id === updatedFiles[i].id ? { ...f, status: 'processing', progress: 50 } : f)
      );

      try {
        const targetBlob = await convertFile(updatedFiles[i].file, quality, outputFormat);
        const resultUrl = URL.createObjectURL(targetBlob);
        
        setFiles(currentFiles => 
          currentFiles.map(f => f.id === updatedFiles[i].id ? { 
            ...f, 
            status: 'done', 
            progress: 100,
            resultBlob: targetBlob,
            resultUrl: resultUrl
          } : f)
        );
      } catch (error) {
        console.error(error);
        setFiles(currentFiles => 
          currentFiles.map(f => f.id === updatedFiles[i].id ? { ...f, status: 'error', progress: 0 } : f)
        );
      }
    }

    setIsConverting(false);
  };

  const downloadFile = (item: FileItem, index: number) => {
    if (item.resultUrl && item.resultBlob) {
      const newName = getNewName(item, index);
      saveAs(item.resultBlob, newName);
    }
  };

  const downloadAllZip = async () => {
    const zip = new JSZip();
    const doneFiles = files.filter(f => f.status === 'done' && f.resultBlob);
    
    if (doneFiles.length === 0) return;

    files.forEach((item, index) => {
      if (item.status === 'done' && item.resultBlob) {
        const newName = getNewName(item, index);
        const path = (maintainFolderStructure && item.relativePath) 
          ? item.relativePath.split('/').slice(0, -1).join('/') + '/' + newName
          : newName;
        zip.file(path, item.resultBlob);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `converted_images_${outputFormat}s.zip`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      {/* Left Column: Headline + Dropzone + Features */}
      <div className="lg:col-span-8 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        <div className="space-y-4 text-center lg:text-left">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Convert Images to <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">WebP</span> in Seconds
          </h1>
          <p className="text-base text-slate-400 max-w-2xl">
            Convert your PNG and JPG images to WebP format instantly. Free, secure, and blazing fast.
          </p>
        </div>

        {/* Dropzone Area */}
        <div 
          className={`relative group transition-all duration-300 flex-shrink-0 ${isDragging ? 'scale-[1.01]' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className={`absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isDragging ? 'opacity-100' : ''}`} />
          <div className={`relative glass-card border-2 border-dashed p-8 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden ${isDragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/10 hover:border-indigo-500/50'}`}>
            <div 
              className="absolute inset-0 z-0" 
              onClick={() => !isConverting && fileInputRef.current?.click()} 
            />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-2xl shadow-indigo-500/40">
                <CloudUpload className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Drag & drop your images here</h3>
              <p className="text-xs text-slate-400 mb-6">Supports PNG, JPG, JPEG (Max 50MB per file)</p>
              
              <div className="flex items-center gap-4 w-full max-w-sm">
                <button 
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                >
                  <FileIcon className="w-4 h-4" />
                  Files
                </button>
                
                <span className="text-slate-600 font-medium uppercase tracking-widest text-[10px]">or</span>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold rounded-xl transition-all active:scale-95"
                >
                  <Folder className="w-4 h-4 text-indigo-400" />
                  Folder
                </button>
              </div>
            </div>

            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleFileInput}
              className="hidden"
            />
            <input 
              ref={folderInputRef}
              type="file" 
              // @ts-ignore
              webkitdirectory="" 
              directory="" 
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        </div>

        {/* File List / Queue */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-4 border-white/5 flex-1 min-h-0 flex flex-col"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Queue ({files.length} images)
                  </span>
                </div>
                <button 
                  onClick={clearAll}
                  className="text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                {files.map((item, index) => (
                  <motion.div 
                    layout
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-800 border border-white/10 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{item.file.name}</p>
                        <p className="text-[10px] text-slate-500">{(item.file.size / 1024).toFixed(0)} KB • {item.file.type.split('/')[1].toUpperCase()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {item.status === 'processing' && (
                        <div className="flex items-center gap-2 text-indigo-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="text-[8px] font-black uppercase tracking-tighter">Processing</span>
                        </div>
                      )}
                      {item.status === 'done' && (
                        <div className="flex items-center gap-2 text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          <span className="text-[8px] font-black uppercase tracking-tighter">Ready</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.status === 'done' && (
                          <button onClick={() => downloadFile(item, index)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => removeFile(item.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {files.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
            <div className="glass-card p-4 flex flex-col items-center text-center gap-3 group hover:border-indigo-500/30 transition-all duration-500">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                <Zap className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white text-sm font-bold mb-1">Fast</h3>
                <p className="text-slate-400 text-[10px] leading-relaxed">Instant conversion on your device.</p>
              </div>
            </div>

            <div className="glass-card p-4 flex flex-col items-center text-center gap-3 group hover:border-indigo-500/30 transition-all duration-500">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                <Shield className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white text-sm font-bold mb-1">Secure</h3>
                <p className="text-slate-400 text-[10px] leading-relaxed">Your files never leave your browser.</p>
              </div>
            </div>

            <div className="glass-card p-4 flex flex-col items-center text-center gap-3 group hover:border-indigo-500/30 transition-all duration-500">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                <Award className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white text-sm font-bold mb-1">Quality</h3>
                <p className="text-slate-400 text-[10px] leading-relaxed">Optimal visual fidelity maintained.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Settings Sidebar */}
      <div className="lg:col-span-4 h-full flex flex-col min-h-0">
        <aside className="glass-card p-6 border-white/10 shadow-2xl flex flex-col h-full min-h-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Settings2 className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">Settings</h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-6 custom-scrollbar min-h-0">
            {/* Output Format */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Output Format</label>
              <div className="grid grid-cols-3 gap-2">
                {['webp', 'jpeg', 'avif'].map(fmt => (
                  <button 
                    key={fmt}
                    onClick={() => setOutputFormat(fmt as any)}
                    className={`py-2 px-3 rounded-lg font-bold text-xs transition-all uppercase ${outputFormat === fmt ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5'}`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Batch Rename */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Batch Rename</label>
              <input 
                type="text" 
                value={renamePattern}
                onChange={(e) => setRenamePattern(e.target.value)}
                placeholder="e.g. image_{n}"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-indigo-500 focus:bg-white/10 transition-all placeholder:text-slate-600"
              />
              <p className="text-[9px] text-slate-500 italic">Use {'{n}'} for number. e.g. image_{'{n}'}</p>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">SEO Friendly</h4>
                  <p className="text-[9px] text-slate-500">Lowercase filenames</p>
                </div>
                <button 
                  onClick={() => setSeoFriendly(!seoFriendly)}
                  className={`w-10 h-5 rounded-full transition-all relative ${seoFriendly ? 'bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${seoFriendly ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">Folders</h4>
                  <p className="text-[9px] text-slate-500">Keep directory structure</p>
                </div>
                <button 
                  onClick={() => setMaintainFolderStructure(!maintainFolderStructure)}
                  className={`w-10 h-5 rounded-full transition-all relative ${maintainFolderStructure ? 'bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${maintainFolderStructure ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Quality Slider */}
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Quality: <span className="text-indigo-400 font-mono">{quality}%</span></label>
                <span className="text-[9px] font-bold text-indigo-400/80 uppercase tracking-widest">Balanced</span>
              </div>
              <div className="relative group px-1">
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(0,0,0,0.5)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-600 transition-all group-hover:[&::-webkit-slider-thumb]:scale-110"
                  style={{
                    background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${quality}%, rgba(255,255,255,0.1) ${quality}%, rgba(255,255,255,0.1) 100%)`
                  }}
                />
                <div className="flex justify-between mt-2">
                  <span className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">Small</span>
                  <span className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">HD</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-6 border-t border-white/5 mt-auto flex-shrink-0">
            <button 
              onClick={convertAll}
              disabled={isConverting || files.length === 0 || files.every(f => f.status === 'done')}
              className="w-full group relative overflow-hidden flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  Convert Now
                </>
              )}
            </button>

            <button 
              onClick={downloadAllZip}
              disabled={isConverting || files.filter(f => f.status === 'done').length === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none"
            >
              <Download className="w-4 h-4" />
              Download ZIP
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
}

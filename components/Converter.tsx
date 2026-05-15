'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileImage, CheckCircle, Download, Trash2, Settings2, Image as ImageIcon, Loader2, PackageOpen, GripVertical } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface FileItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  resultBlob?: Blob;
  resultUrl?: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles = newFiles.filter(f => f.type.startsWith('image/jpeg') || f.type.startsWith('image/png'));
    
    const newItems = validFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending' as const,
      progress: 0,
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  }, [addFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
    // Reset input so same files can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    if (isConverting) return;
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
        zip.file(newName, item.resultBlob);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `converted_images_${outputFormat}s.zip`);
  };

  const totalConverted = files.filter(f => f.status === 'done').length;
  const totalProcessing = files.filter(f => f.status === 'processing').length;
  const globalProgress = files.length > 0 ? ((totalConverted + totalProcessing * 0.5) / files.length) * 100 : 0;

  return (
    <div className="max-w-6xl w-full mx-auto flex flex-col gap-6">
      {/* Global Progress Bar */}
      {files.length > 0 && (
        <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700 shadow-lg mt-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Progress</span>
            <span className="text-indigo-400 font-mono text-sm">{Math.round(globalProgress)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700/50">
            <div 
              className="h-full bg-indigo-500 transition-all duration-300 ease-out" 
              style={{ width: `${globalProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Side: Dropzone & File List */}
        <section className="flex-[3] flex flex-col gap-6">
        {/* Upload Zone */}
        <div 
          className={`border-2 border-dashed rounded-[2rem] p-12 transition-all duration-200 ease-in-out flex flex-col items-center justify-center text-center cursor-pointer group ${isDragging ? 'border-indigo-500 bg-slate-800/40' : 'border-slate-700 bg-slate-800/20 hover:border-indigo-500/50 hover:bg-slate-800/40'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isConverting && fileInputRef.current?.click()}
        >
          <div className={`w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mb-6 border border-slate-700 transition-transform duration-300 ${isDragging ? 'scale-110' : 'group-hover:scale-110'}`}>
            <Upload className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {isDragging ? 'Drop images here' : 'Ready to convert?'}
          </h3>
          <p className="text-slate-400 text-sm max-w-sm mb-6">
            Support multiple uploads. Select or drag PNG and JPG files.
          </p>
          <button 
            disabled={isConverting}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50 pointer-events-none"
          >
            Select Files
          </button>
          <input 
            ref={fileInputRef}
            type="file" 
            multiple 
            accept="image/png, image/jpeg" 
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-slate-800/30 rounded-[1.5rem] border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-4 px-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Queue ({files.length} files)
            </span>
            <div className="flex gap-3">
              <button 
                onClick={clearAll}
                disabled={isConverting}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold uppercase tracking-wide disabled:opacity-50 transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            {files.map((item, index) => (
              <div 
                key={item.id} 
                draggable={!isConverting}
                onDragStart={(e) => {
                  setDraggedId(item.id);
                  e.dataTransfer.setData('text/plain', item.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!draggedId || draggedId === item.id) return;
                  const draggedIndex = files.findIndex(f => f.id === draggedId);
                  const targetIndex = files.findIndex(f => f.id === item.id);
                  if (draggedIndex !== -1 && targetIndex !== -1) {
                    const newFiles = [...files];
                    const [draggedItem] = newFiles.splice(draggedIndex, 1);
                    newFiles.splice(targetIndex, 0, draggedItem);
                    setFiles(newFiles);
                  }
                }}
                onDragEnd={() => setDraggedId(null)}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800 gap-4 transition-all ${item.status === 'done' ? '' : 'opacity-80'} ${draggedId === item.id ? 'opacity-50 border-indigo-500 scale-[0.98]' : ''} ${!isConverting ? 'cursor-grab active:cursor-grabbing hover:border-slate-600' : ''}`}
                >
                <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
                  {!isConverting && <GripVertical className="w-5 h-5 text-slate-600 flex-shrink-0 cursor-grab active:cursor-grabbing" />}
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover pointer-events-none" />
                  </div>
                  
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate flex items-center gap-2">
                      {item.file.name}
                      {renamePattern.trim() && (
                        <>
                          <span className="text-slate-600">→</span>
                          <span className="text-indigo-400 truncate">{getNewName(item, index)}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(item.file.size / 1024 / 1024).toFixed(2)} MB • {item.file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end flex-shrink-0">
                    {item.status === 'pending' && <span className="px-2 py-1 bg-slate-800 text-slate-400 text-[10px] font-bold rounded uppercase tracking-wider">Pending</span>}
                    {item.status === 'processing' && (
                      <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold rounded uppercase tracking-wider border border-indigo-500/20 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Converting
                      </span>
                    )}
                    {item.status === 'done' && (
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-green-500/10 text-green-400 text-[10px] font-bold rounded uppercase tracking-wider border border-green-500/20">
                          Optimized
                        </span>
                        <span className="text-sm font-mono text-indigo-400">
                          {((1 - (item.resultBlob!.size / item.file.size)) * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    {item.status === 'error' && (
                      <span className="px-2 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold rounded uppercase tracking-wider border border-red-500/20">Failed</span>
                    )}

                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {item.status === 'done' ? (
                      <button 
                        onClick={() => downloadFile(item, index)}
                        className="text-slate-400 hover:text-white transition-colors p-1"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => removeFile(item.id)}
                        disabled={isConverting}
                        className="text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50 p-1"
                        title="Remove"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </section>

      {/* Right Side: Settings Pane */}
      <aside className="flex-[1.2] flex flex-col gap-4 bg-slate-800/40 rounded-[2rem] border border-slate-700 p-8 shadow-2xl h-fit">
        <h3 className="text-lg font-bold text-white">Export Settings</h3>
        
        <div className="space-y-6 mt-4">
          {/* Format Select */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Output Format</label>
            <div className="grid grid-cols-3 gap-2">
              {['webp', 'jpeg', 'avif'].map(fmt => (
                <button 
                  key={fmt}
                  onClick={() => setOutputFormat(fmt as 'webp' | 'jpeg' | 'avif')}
                  disabled={isConverting}
                  className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-colors uppercase disabled:opacity-50 ${outputFormat === fmt ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-500'}`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Batch Rename */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Batch Rename Pattern</label>
            <input 
              type="text" 
              value={renamePattern}
              onChange={(e) => setRenamePattern(e.target.value)}
              disabled={isConverting}
              placeholder="e.g. image_{n}"
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600 disabled:opacity-50"
            />
            <p className="text-[10px] text-slate-500 mt-2">Use {'{n}'} for sequence number. Leave empty to keep original names.</p>
          </div>

          {/* SEO Friendly Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">SEO Friendly</label>
              <p className="text-[10px] text-slate-500">Lowercase & hyphenated names</p>
            </div>
            <button 
              onClick={() => setSeoFriendly(!seoFriendly)}
              className={`w-12 h-6 rounded-full transition-colors relative ${seoFriendly ? 'bg-indigo-600' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${seoFriendly ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {/* Quality Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Quality</label>
              <span className="text-indigo-400 font-mono text-sm">{quality}%</span>
            </div>
            <div className="relative group pt-2 pb-2">
              <input 
                type="range" 
                min="10" 
                max="100" 
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                disabled={isConverting}
                className="w-full h-2 bg-slate-700 rounded-full appearance-none outline-none disabled:opacity-50 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-indigo-500 [&::-webkit-slider-thumb]:shadow-lg"
                style={{
                  background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${quality}%, #334155 ${quality}%, #334155 100%)`
                }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Balanced quality and compression ratio.</p>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-slate-700">
            <button 
              onClick={convertAll}
              disabled={isConverting || files.every(f => f.status === 'done')}
              className="w-full py-4 bg-indigo-600 outline-none text-white font-black text-sm rounded-xl shadow-lg hover:bg-indigo-500 active:scale-[0.98] transition-all uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <ImageIcon className="w-5 h-5" />
                  Convert Batch
                </>
              )}
            </button>
            <button 
              onClick={downloadAllZip}
              disabled={isConverting || files.filter(f => f.status === 'done').length === 0}
              className="w-full py-4 bg-white outline-none text-slate-900 font-black text-sm rounded-xl shadow-[0_10px_30px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              <PackageOpen className="w-5 h-5" />
              Download All as Zip
            </button>
          </div>
          
          {files.length > 0 && (
            <div className="text-center mt-2">
              <p className="text-xs font-semibold text-slate-500">
                {files.filter(f => f.status === 'done').length} / {files.length} completed
              </p>
            </div>
          )}
        </div>
      </aside>
      </div>
    </div>
  );
}

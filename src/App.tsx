import { useState, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Shield, 
  Video, 
  Check, 
  Download, 
  Info, 
  Settings, 
  Eye, 
  EyeOff,
  AlertCircle
} from 'lucide-react';

export default function App() {
  const [showPreview, setShowPreview] = useState(false);
  const [watermark, setWatermark] = useState('@suamarca');
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [opacity, setOpacity] = useState(0.12);
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mock position for preview animation
  const [previewPos, setPreviewPos] = useState({ bottom: 20, right: 20, top: 'auto', left: 'auto' });

  // Update preview position periodically if motion is enabled
  useEffect(() => {
    if (!motionEnabled) {
      setPreviewPos({ bottom: 20, right: 20, top: 'auto', left: 'auto' });
      return;
    }
    const interval = setInterval(() => {
      const positions = [
        { bottom: 20, right: 20, top: 'auto', left: 'auto' }, // Bottom Right
        { bottom: 20, right: 'auto', top: 'auto', left: 20 }, // Bottom Left
        { bottom: 'auto', right: 20, top: 20, left: 'auto' }, // Top Right
        { bottom: 'auto', right: 'auto', top: 20, left: 20 }, // Top Left
      ];
      const next = positions[Math.floor(Math.random() * positions.length)];
      setPreviewPos(next);
    }, 3000);
    return () => clearInterval(interval);
  }, [motionEnabled]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('O arquivo deve ter no máximo 10MB.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessedVideoUrl(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('watermark', watermark);
    formData.append('watermarkEnabled', watermarkEnabled.toString());
    formData.append('opacity', opacity.toString());
    formData.append('motionEnabled', motionEnabled.toString());

    try {
      const response = await fetch('/api/process-video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Falha no processamento');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setProcessedVideoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header Grid */}
      <header className="border-b border-[#141414] p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5" />
            <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">Security Protocol v2.4</span>
          </div>
          <h1 className="font-serif italic text-4xl tracking-tight">Video Stealth Processor</h1>
        </div>
        <div className="flex flex-col justify-end md:items-end">
          <p className="font-mono text-xs opacity-70 max-w-xs md:text-right">
            Limpeza de metadados, redimensionamento social e marca d'água sub-perceptível.
          </p>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-120px)]">
        {/* Left Panel: Controls */}
        <aside className="lg:col-span-4 border-r border-[#141414] p-8 space-y-12">
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-4 h-4" />
              <h2 className="font-serif italic text-sm uppercase tracking-wider">Configurações</h2>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="font-mono text-[10px] uppercase opacity-50">Adicionar Marca d'água</label>
                  <button 
                    onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${watermarkEnabled ? 'bg-[#141414]' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${watermarkEnabled ? 'left-6' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>

              {watermarkEnabled && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase opacity-50 block">Texto da Marca</label>
                    <input 
                      type="text" 
                      value={watermark}
                      onChange={(e) => setWatermark(e.target.value)}
                      className="w-full bg-transparent border-b border-[#141414] py-2 focus:outline-none font-mono text-lg"
                      placeholder="@usuario"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="font-mono text-[10px] uppercase opacity-50">Opacidade Sub-perceptível</label>
                      <span className="font-mono text-xs">{(opacity * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.01" 
                      max="0.30" 
                      step="0.01"
                      value={opacity}
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="w-full accent-[#141414]"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="font-mono text-[10px] uppercase opacity-50">Stealth Motion</label>
                      <button 
                        onClick={() => setMotionEnabled(!motionEnabled)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${motionEnabled ? 'bg-[#141414]' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${motionEnabled ? 'left-6' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </section>

          <section className="p-4 border border-dashed border-[#141414]/30 rounded-sm bg-[#141414]/5">
            <div className="flex gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-mono text-[10px] uppercase font-bold">Nota de Segurança</h3>
                <p className="text-[11px] leading-relaxed opacity-70">
                  Este script remove metadados EXIF, XMP e IPTC. O zoom aleatório de 1-3% altera o hash do arquivo para evitar detecção por sistemas de "repost" automatizados.
                </p>
              </div>
            </div>
          </section>

          <section className="p-4 border border-dashed border-[#141414]/30 rounded-sm bg-[#141414]/5">
            <div className="flex gap-3">
              <Shield className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-mono text-[10px] uppercase font-bold">Proteção de Identidade Digital</h3>
                <p className="text-[11px] leading-relaxed opacity-70">
                  Higienização de Dados: Remove rastros ocultos de origem e edição.
                </p>
              </div>
            </div>
          </section>
        </aside>

        {/* Right Panel: Code & Preview */}
        <div className="lg:col-span-8 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-[#141414]">
            <button 
              onClick={() => setShowPreview(false)}
              className={`px-8 py-4 font-mono text-[10px] uppercase tracking-widest border-r border-[#141414] transition-colors ${!showPreview ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/5'}`}
            >
              Processar Vídeo (Web)
            </button>
            <button 
              onClick={() => setShowPreview(true)}
              className={`px-8 py-4 font-mono text-[10px] uppercase tracking-widest border-r border-[#141414] transition-colors ${showPreview ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/5'}`}
            >
              Visual Preview
            </button>
          </div>

          <div className="flex-1 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {!showPreview ? (
                <motion.div 
                  key="upload"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute inset-0 p-8 flex flex-col items-center justify-center space-y-8"
                >
                  <div className="max-w-md w-full space-y-6 text-center">
                    <div className="p-12 border-2 border-dashed border-[#141414]/20 rounded-lg flex flex-col items-center gap-4 hover:border-[#141414]/40 transition-colors relative group">
                      <Video className="w-12 h-12 opacity-20 group-hover:opacity-40 transition-opacity" />
                      <div className="space-y-1">
                        <p className="font-serif italic text-lg">Clique ou arraste seu vídeo</p>
                        <p className="font-mono text-[10px] uppercase opacity-50">Máximo 10MB | MP4, MOV, AVI</p>
                      </div>
                      <input 
                        type="file" 
                        accept="video/*"
                        onChange={handleFileUpload}
                        disabled={isProcessing}
                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </div>

                    {isProcessing && (
                      <div className="space-y-3">
                        <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-[#141414]"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                          />
                        </div>
                        <p className="font-mono text-[10px] uppercase tracking-widest animate-pulse">Processando Stealth Engine...</p>
                      </div>
                    )}

                    {error && (
                      <div className="flex items-center gap-2 text-red-600 font-mono text-[10px] uppercase bg-red-50 p-3 rounded border border-red-100">
                        <AlertCircle className="w-3 h-3" />
                        <span>{error}</span>
                      </div>
                    )}

                    {processedVideoUrl && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 border border-green-200 bg-green-50 rounded-lg space-y-4"
                      >
                        <div className="flex items-center justify-center gap-2 text-green-700">
                          <Check className="w-5 h-5" />
                          <span className="font-serif italic">Vídeo processado com sucesso!</span>
                        </div>
                        <a 
                          href={processedVideoUrl}
                          download="stealth_video.mp4"
                          className="flex items-center justify-center gap-2 w-full p-4 bg-[#141414] text-[#E4E3E0] font-mono text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
                        >
                          <Download className="w-4 h-4" />
                          Baixar Vídeo Processado
                        </a>
                      </motion.div>
                    )}
                  </div>

                  <div className="max-w-2xl w-full p-6 bg-[#141414]/5 rounded border border-[#141414]/10 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-widest opacity-70">
                      Nós processamos seu vídeo para que ele transpareça mais limpo para as redes sociais sem detectar conteúdo duplicado.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="preview"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  className="absolute inset-0 flex items-center justify-center p-12 bg-[#D1D0CC]"
                >
                  <div className="relative aspect-[9/16] h-full max-h-[700px] bg-[#141414] shadow-2xl overflow-hidden group">
                    {/* Mock Video Content */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      <Video className="w-24 h-24 text-white" />
                    </div>
                    
                    {/* Watermark Preview */}
                    {watermarkEnabled && (
                      <motion.div 
                        layout
                        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                        className="absolute font-sans pointer-events-none select-none"
                        style={{ 
                          color: `rgba(255, 255, 255, ${opacity})`,
                          fontSize: `${watermark.length > 15 ? 14 : 18}px`,
                          textShadow: `1px 1px 1px rgba(0,0,0,${opacity * 0.5})`,
                          bottom: previewPos.bottom === 'auto' ? undefined : `${previewPos.bottom}px`,
                          right: previewPos.right === 'auto' ? undefined : `${previewPos.right}px`,
                          top: previewPos.top === 'auto' ? undefined : `${previewPos.top}px`,
                          left: previewPos.left === 'auto' ? undefined : `${previewPos.left}px`,
                        }}
                      >
                        {watermark}
                      </motion.div>
                    )}

                    {/* Overlay Info */}
                    <div className="absolute top-4 left-4 font-mono text-[8px] text-white/30 uppercase tracking-tighter">
                      720x1280 | 30fps | BT.709
                    </div>
                    
                    <div className="absolute inset-0 border-[20px] border-transparent group-hover:border-[#E4E3E0]/5 transition-all duration-700 pointer-events-none"></div>
                  </div>
                  
                  <div className="absolute bottom-8 right-8 flex items-center gap-2 opacity-40">
                    <Eye className="w-4 h-4" />
                    <span className="font-mono text-[10px] uppercase tracking-widest">Simulação de Saída</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer Grid */}
      <footer className="border-t border-[#141414] p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#141414] text-[#E4E3E0]">
        <div className="space-y-1">
          <span className="font-mono text-[8px] uppercase opacity-40">Status</span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="font-mono text-[10px] uppercase">Pronto para Processamento</span>
          </div>
        </div>
        <div className="space-y-1">
          <span className="font-mono text-[8px] uppercase opacity-40">FFmpeg Engine</span>
          <span className="font-mono text-[10px] block uppercase tracking-widest">v6.1.1-Release</span>
        </div>
        <div className="space-y-1">
          <span className="font-mono text-[8px] uppercase opacity-40">Metadata Scrub</span>
          <span className="font-mono text-[10px] block uppercase tracking-widest">Deep Clean Active</span>
        </div>
        <div className="space-y-1 flex flex-col items-end justify-center">
          <span className="font-serif italic text-xs">suamarca stealth tool</span>
        </div>
      </footer>
    </div>
  );
}

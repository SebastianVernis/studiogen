"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Image as ImageIcon, Loader2, AlertTriangle, Send, ListChecks, Info, MessageSquareText, Type, Download, Link as LinkIcon, Palette } from 'lucide-react';
import FuturisticBackground from '@/components/futuristic-background';
import { artStyles, MAX_PROMPTS_OVERALL, MAX_PROCESSING_JOBS, TITLE_WORD_THRESHOLD, DOWNLOAD_DELAY_MS, type DisplayItem, type PromptJob, type ArtStyle } from '@/lib/artbot-config';
import { generateImageFromPrompt } from '@/ai/flows/generate-image-from-prompt';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  return url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || url.startsWith('data:image');
};

const ImageGeneratorApp = () => {
  const [promptInput, setPromptInput] = useState('');
  const [displayList, setDisplayList] = useState<DisplayItem[]>([]);
  const [processingJobs, setProcessingJobs] = useState<PromptJob[]>([]);
  const [selectedStyleValue, setSelectedStyleValue] = useState<string>(artStyles[0].value);
  
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [currentJobIndexInQueue, setCurrentJobIndexInQueue] = useState<number | null>(null);
  const [isDownloadingIndividual, setIsDownloadingIndividual] = useState(false);

  useEffect(() => {
    if (!isBatchProcessing || currentJobIndexInQueue === null || currentJobIndexInQueue >= processingJobs.length) {
      if (isBatchProcessing && processingJobs.length > 0 && currentJobIndexInQueue !== null && currentJobIndexInQueue >= processingJobs.length) {
         // Batch finished
      }
      if (isBatchProcessing) {
        setIsBatchProcessing(false); // Ensure it stops if queue is empty or done
      }
      return;
    }

    const currentJob = processingJobs[currentJobIndexInQueue];
    
    if (currentJob && currentJob.status === 'pending') {
      (async () => {
        const updateToProcessing = (items: PromptJob[]) => items.map(item => 
            item.id === currentJob.id ? { ...item, status: 'processing' as const } : item
        );
        // Also update displayList for PromptJob items
        setDisplayList(prevDisplayList => prevDisplayList.map(dItem => 
            dItem.id === currentJob.id && dItem.type === 'prompt' ? { ...dItem, status: 'processing' as const } : dItem
        ));
        setProcessingJobs(updateToProcessing);

        try {
          const result = await generateImageFromPrompt({ prompt: currentJob.styledPrompt });
          const generatedImageUrl = result.imageUrl;

          setDisplayList(prevItems => prevItems.map(item => 
            item.id === currentJob.id && item.type === 'prompt' ? { ...item, status: 'completed' as const, imageUrl: generatedImageUrl } : item
          ));
        } catch (err: any) {
          setDisplayList(prevItems => prevItems.map(item => 
            item.id === currentJob.id && item.type === 'prompt' ? { ...item, status: 'failed' as const, error: err.message || 'Unknown error' } : item
          ));
        } finally {
          setCurrentJobIndexInQueue(prevIndex => (prevIndex !== null ? prevIndex + 1 : 0));
        }
      })();
    } else if (currentJob) { 
        setCurrentJobIndexInQueue(prevIndex => (prevIndex !== null ? prevIndex + 1 : 0));
    }
  }, [currentJobIndexInQueue, processingJobs, isBatchProcessing]);


  const handleStartBatchProcessing = () => {
    const allLines = promptInput.split('\n');
    const nonEmptyLines = allLines.map(line => line.trim()).filter(line => line !== '');
    
    if (nonEmptyLines.length === 0) {
        alert("Por favor, ingresa algún contenido para procesar.");
        return;
    }

    const newDisplayList: DisplayItem[] = [];
    const newProcessingJobs: PromptJob[] = [];
    const currentArtStyle = artStyles.find(style => style.value === selectedStyleValue) || artStyles[0];

    if (nonEmptyLines.length === 1) {
        const line = nonEmptyLines[0];
        const uniqueId = Date.now();
        if (isValidImageUrl(line)) {
            newDisplayList.push({ id: uniqueId, type: 'external_image', imageUrl: line });
        } else {
            const styledPrompt = `${line}${currentArtStyle.promptSuffix}`;
            const promptJob: PromptJob = {
                id: uniqueId, type: 'prompt', originalPrompt: line, styledPrompt, status: 'pending',
                imageUrl: null, error: null, artStyleUsed: currentArtStyle.name,
            };
            newDisplayList.push(promptJob);
            newProcessingJobs.push(promptJob);
        }
    } 
    else {
        let promptCounter = 0;
        nonEmptyLines.slice(0, MAX_PROMPTS_OVERALL).forEach((line, index) => {
            const uniqueId = Date.now() + index;
            const wordCount = line.split(/\s+/).filter(Boolean).length;
            
            if (isValidImageUrl(line)) {
                newDisplayList.push({ id: uniqueId, type: 'external_image', imageUrl: line });
            } else if (wordCount <= TITLE_WORD_THRESHOLD) {
                newDisplayList.push({ id: uniqueId, type: 'title_comment', text: line });
            } else {
                if (promptCounter < MAX_PROCESSING_JOBS) {
                    const styledPrompt = `${line}${currentArtStyle.promptSuffix}`;
                    const promptJob: PromptJob = {
                        id: uniqueId, type: 'prompt', originalPrompt: line, styledPrompt, status: 'pending',
                        imageUrl: null, error: null, artStyleUsed: currentArtStyle.name,
                    };
                    newDisplayList.push(promptJob);
                    newProcessingJobs.push(promptJob);
                    promptCounter++;
                } else {
                    newDisplayList.push({
                        id: uniqueId, type: 'skipped_prompt', text: line,
                        reason: `Límite de ${MAX_PROCESSING_JOBS} prompts para generación con IA alcanzado.`,
                    });
                }
            }
        });
    }
    
    setDisplayList(newDisplayList);
    setProcessingJobs(newProcessingJobs);

    if (newProcessingJobs.length > 0) {
      setIsBatchProcessing(true);
      setCurrentJobIndexInQueue(0);
    }
  };
  
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleDownloadAllImages = async () => {
    const imagesToDownload = displayList.filter(
        (item): item is PromptJob => item.type === 'prompt' && item.status === 'completed' && !!item.imageUrl && item.imageUrl.startsWith('data:image')
    );

    if (imagesToDownload.length === 0) {
        alert("No hay imágenes generadas por IA con éxito para descargar.");
        return;
    }

    setIsDownloadingIndividual(true);
    let downloadedCount = 0;

    for (let i = 0; i < imagesToDownload.length; i++) {
        const item = imagesToDownload[i];
        try {
            const link = document.createElement('a');
            link.href = item.imageUrl!; // Already checked it's not null
            
            const sanitizedPrompt = item.originalPrompt.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
            const filename = `ia_imagen_${i + 1}_${item.artStyleUsed ? item.artStyleUsed.split(' ')[0].toLowerCase() + '_' : ''}${sanitizedPrompt || 'prompt'}.png`;
            link.download = filename;
            
            document.body.appendChild(link); 
            link.click();
            document.body.removeChild(link);
            
            downloadedCount++;
            if (i < imagesToDownload.length - 1) { 
                await delay(DOWNLOAD_DELAY_MS);
            }
        } catch (error) {
            console.error(`Error al descargar imagen para el prompt "${item.originalPrompt}": `, error);
            alert(`Ocurrió un error al descargar la imagen para: "${item.originalPrompt.substring(0,50)}..."`);
        }
    }
    
    alert(`${downloadedCount} imagen(es) generada(s) por IA programada(s) para descarga.`);
    setIsDownloadingIndividual(false);
  };

  const currentProcessingPromptText = () => {
    if (isBatchProcessing && currentJobIndexInQueue !== null && currentJobIndexInQueue < processingJobs.length) {
      return processingJobs[currentJobIndexInQueue]?.originalPrompt;
    }
    return null;
  };
  
  const canDownloadGenerated = !isBatchProcessing && displayList.some(item => item.type === 'prompt' && item.status === 'completed' && item.imageUrl && item.imageUrl.startsWith('data:image'));
  const currentSelectedArtStyleObj = artStyles.find(s => s.value === selectedStyleValue);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-4 font-body relative overflow-hidden">
      <FuturisticBackground />
      <Card className="relative z-10 w-full max-w-3xl bg-card/90 backdrop-blur-sm shadow-2xl shadow-primary/30 rounded-xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Sparkles className="text-accent w-10 h-10 mr-3" />
            <CardTitle className="text-3xl md:text-4xl font-headline tracking-tight bg-gradient-to-r from-accent via-primary to-accent text-transparent bg-clip-text">
              Generador de Arte IA (Lotes)
            </CardTitle>
          </div>
          <CardDescription className="text-muted-foreground text-sm md:text-base">
            Una sola línea siempre es un prompt. Con varias, los párrafos cortos (≤{TITLE_WORD_THRESHOLD} palabras) son títulos.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <main>
            <div className="mb-6">
              <label htmlFor="promptInput" className="block mb-2 text-sm font-medium text-accent">
                Tus URLs, Títulos y Prompts:
              </label>
              <Textarea
                id="promptInput"
                rows={5}
                className="w-full p-3 bg-background/70 border-primary border-2 rounded-lg focus-visible:ring-accent focus-visible:border-accent transition-all duration-300 ease-in-out placeholder:text-muted-foreground resize-y"
                placeholder={"Un solo prompt para generar una imagen...\n\nO...\n\nUn Título\nUn prompt más largo\nOtro Título\nhttps://placehold.co/600x400.png"}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                disabled={isBatchProcessing || isDownloadingIndividual}
              />
            </div>

            <div className="mb-6">
              <label htmlFor="artStyle" className="block mb-2 text-sm font-medium text-accent flex items-center">
                <Palette size={18} className="mr-2"/> Selecciona Estilo de Arte para IA:
              </label>
              <Select 
                value={selectedStyleValue} 
                onValueChange={setSelectedStyleValue}
                disabled={isBatchProcessing || isDownloadingIndividual}
              >
                <SelectTrigger 
                  id="artStyle"
                  className="w-full bg-background/70 border-primary border-2 rounded-lg focus:ring-accent focus:border-accent transition-all duration-300 ease-in-out"
                >
                  <SelectValue placeholder="Selecciona un estilo" />
                </SelectTrigger>
                <SelectContent>
                  {artStyles.map(style => (
                    <SelectItem key={style.value} value={style.value}>{style.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Button
                onClick={handleStartBatchProcessing}
                disabled={isBatchProcessing || !promptInput.trim() || isDownloadingIndividual}
                className="w-full text-white font-semibold py-3 px-4 text-lg focus:ring-4 focus:ring-accent/50 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed hover:bg-primary/90 bg-primary"
              >
                {isBatchProcessing ? <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Procesando IA...</> : <><ListChecks className="w-6 h-6 mr-2" /> Analizar y Procesar</>}
              </Button>
              <Button
                onClick={handleDownloadAllImages}
                disabled={!canDownloadGenerated || isDownloadingIndividual || isBatchProcessing}
                className="w-full text-white font-semibold py-3 px-4 text-lg focus:ring-4 focus:ring-primary/50 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed hover:bg-accent/90 bg-accent"
              >
                {isDownloadingIndividual ? <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Descargando IA...</> : <><Download className="w-6 h-6 mr-2" /> Descargar Imágenes IA</>}
              </Button>
            </div>
            
            {isBatchProcessing && currentProcessingPromptText() && (
              <div className="mt-6 p-3 text-accent-foreground bg-accent/80 rounded-md text-center text-sm">
                  Procesando imagen IA ({currentSelectedArtStyleObj?.name}) {Math.min((currentJobIndexInQueue ?? 0) + 1, processingJobs.length)} de {processingJobs.length}: "<em>{currentProcessingPromptText()!.substring(0,40)}...</em>"
              </div>
            )}
            {!isBatchProcessing && displayList.length > 0 && processingJobs.length > 0 && currentJobIndexInQueue !== null && currentJobIndexInQueue >= processingJobs.length && (
                  <div className="mt-6 p-3 text-green-700 bg-green-500/20 rounded-md text-center text-sm font-semibold">
                      ¡Procesamiento IA del lote completado!
                  </div>
            )}
            
            {displayList.length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="text-xl font-headline text-accent border-b-2 border-primary pb-2 mb-4">Resultados del Lote:</h3>
                {displayList.map((item) => (
                  <div key={item.id} className="p-4 rounded-lg bg-card/75 border border-primary shadow-md">
                    {item.type === 'title_comment' && ( 
                      <div className="flex items-center">
                        <Type size={20} className="mr-3 text-primary flex-shrink-0" />
                        <p className="font-semibold text-md text-primary">{item.text}</p>
                      </div>
                    )}
                    {item.type === 'external_image' && (
                      <div>
                        <p className="font-semibold text-sm text-green-600 mb-1">
                          <LinkIcon size={18} className="inline mr-2 align-text-bottom" />
                          Imagen Externa
                        </p>
                        <div className="mt-3 p-1 border-2 border-dashed border-green-500/60 rounded-md bg-background/40">
                            <img 
                              src={item.imageUrl} 
                              alt={`Imagen externa de ${item.imageUrl}`} 
                              className="w-full h-auto rounded object-contain max-h-[60vh]"
                              data-ai-hint="external content"
                              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                  const target = e.target as HTMLImageElement;
                                  target.onerror = null; 
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<div class="text-red-500 p-2">Error al cargar imagen externa. Verifique que la URL sea pública y correcta.</div>`;
                                  }
                              }}
                            />
                          </div>
                      </div>
                    )}
                    {item.type === 'skipped_prompt' && (
                      <div>
                          <p className="font-semibold text-sm text-yellow-500 mb-1">Prompt IA Omitido: <span className="text-muted-foreground font-normal">{item.text}</span></p>
                          <p className="text-xs text-yellow-600">{item.reason}</p>
                      </div>
                    )}
                    {item.type === 'prompt' && (
                      <div>
                        <p className="font-semibold text-sm text-accent mb-1">
                          <MessageSquareText size={18} className="inline mr-2 align-text-bottom" />
                          Prompt IA ({item.artStyleUsed || 'Estilo no especificado'}) {processingJobs.findIndex(p => p.id === item.id) + 1}: <span className="text-foreground font-normal">{item.originalPrompt}</span>
                        </p>
                        {item.status === 'pending' && <p className="text-sm text-yellow-500 flex items-center mt-2"><Info size={16} className="mr-1"/> Pendiente IA...</p>}
                        {item.status === 'processing' && <p className="text-sm text-blue-500 flex items-center mt-2"><Loader2 size={16} className="mr-1 animate-spin"/> Procesando IA...</p>}
                        {item.status === 'failed' && (
                          <div className="text-sm text-destructive-foreground p-2 bg-destructive/90 rounded mt-2">
                            <AlertTriangle size={16} className="inline mr-1" /> Error IA: {item.error}
                          </div>
                        )}
                        {item.status === 'completed' && item.imageUrl && (
                          <div className="mt-3 p-1 border-2 border-dashed border-primary/60 rounded-md bg-background/40">
                            <img src={item.imageUrl} alt={`Generado por IA para: ${item.originalPrompt} (${item.artStyleUsed})`} className="w-full h-auto rounded object-contain max-h-[60vh]" data-ai-hint="generated art" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </main>
          
          <footer className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              Impulsado por IA generativa. Los resultados pueden variar.
            </p>
          </footer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageGeneratorApp;

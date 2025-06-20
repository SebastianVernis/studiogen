
"use client";

import React, { useState, useCallback } from 'react';
import { Sparkles, Image as ImageIcon, Loader2, AlertTriangle, Send, Type, Download, Link as LinkIcon, Palette, PlusCircle, PlayCircle, FileArchive, ListChecks, MessageSquareText } from 'lucide-react';
import FuturisticBackground from '@/components/futuristic-background';
import { artStyles, MAX_PROMPTS_OVERALL, MAX_PROCESSING_JOBS, DOWNLOAD_DELAY_MS, type DisplayItem, type PromptJob, type ArtStyle } from '@/lib/artbot-config';
import { generateImageFromPrompt } from '@/ai/flows/generate-image-from-prompt';
import { refineImage } from '@/ai/flows/refine-image-flow';
import { extractPromptsFromText } from '@/ai/flows/extract-prompts-from-text-flow';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import JSZip from 'jszip';

const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  return url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || url.startsWith('data:image');
};

type InputMode = 'url' | 'title_prompt' | 'prompt_only';

const ImageGeneratorApp = () => {
  const { toast } = useToast();

  // Core states for image generation
  const [inputMode, setInputMode] = useState<InputMode>('prompt_only');
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [promptForTitleInput, setPromptForTitleInput] = useState('');
  const [singlePromptInput, setSinglePromptInput] = useState('');
  const [displayList, setDisplayList] = useState<DisplayItem[]>([]);
  const [processingJobs, setProcessingJobs] = useState<PromptJob[]>([]);
  const [selectedStyleValue, setSelectedStyleValue] = useState<string>(artStyles[0].value);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [currentJobIndexInQueue, setCurrentJobIndexInQueue] = useState<number | null>(null);
  const [isDownloadingIndividual, setIsDownloadingIndividual] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [itemBeingRefined, setItemBeingRefined] = useState<PromptJob | null>(null);
  const [refinementPromptText, setRefinementPromptText] = useState<string>('');
  const [isSubmittingRefinement, setIsSubmittingRefinement] = useState<boolean>(false);
  
  // Analyzer tab states
  const [analyzerRawText, setAnalyzerRawText] = useState('');
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const [analyzerExtractedPrompts, setAnalyzerExtractedPrompts] = useState<string[]>([]);
  const [isAddingExtractedToAnalyzerQueue, setIsAddingExtractedToAnalyzerQueue] = useState(false);
  const [analyzerDisplayList, setAnalyzerDisplayList] = useState<DisplayItem[]>([]);
  const [analyzerProcessingJobs, setAnalyzerProcessingJobs] = useState<PromptJob[]>([]);
  const [analyzerSelectedStyleValue, setAnalyzerSelectedStyleValue] = useState<string>(artStyles[0].value);
  const [isAnalyzerBatchProcessing, setIsAnalyzerBatchProcessing] = useState(false);
  const [analyzerCurrentJobIndexInQueue, setAnalyzerCurrentJobIndexInQueue] = useState<number | null>(null);
  const [isAnalyzerDownloadingIndividual, setIsAnalyzerDownloadingIndividual] = useState(false);
  const [isAnalyzerDownloadingZip, setIsAnalyzerDownloadingZip] = useState(false);
  const [analyzerItemBeingRefined, setAnalyzerItemBeingRefined] = useState<PromptJob | null>(null);
  const [analyzerRefinementPromptText, setAnalyzerRefinementPromptText] = useState<string>('');
  const [isAnalyzerSubmittingRefinement, setIsAnalyzerSubmittingRefinement] = useState<boolean>(false);


  const addItemToQueue = useCallback((forAnalyzerTab: boolean = false) => {
    const currentDisplayList = forAnalyzerTab ? analyzerDisplayList : displayList;
    const setCurrentDisplayList = forAnalyzerTab ? setAnalyzerDisplayList : setDisplayList;
    const currentProcessingJobs = forAnalyzerTab ? analyzerProcessingJobs : processingJobs;
    const setCurrentProcessingJobs = forAnalyzerTab ? setAnalyzerProcessingJobs : setProcessingJobs;
    const currentSelectedStyleValue = forAnalyzerTab ? analyzerSelectedStyleValue : selectedStyleValue;

    let newItems: DisplayItem[] = [];
    const nextId = Math.max(0, ...currentDisplayList.map(item => item.id), ...currentProcessingJobs.map(job => job.id)) + 1;

    if (inputMode === 'url' && urlInput.trim()) {
      if (isValidImageUrl(urlInput.trim())) {
        newItems.push({
          id: nextId,
          type: 'external_image',
          imageUrl: urlInput.trim()
        });
      } else {
        toast({
          title: "URL inválida",
          description: "Por favor ingresa una URL de imagen válida.",
          variant: "destructive",
        });
        return;
      }
    } else if (inputMode === 'title_prompt') {
      if (titleInput.trim()) {
        newItems.push({
          id: nextId,
          type: 'title_comment',
          text: titleInput.trim()
        });
      }
      if (promptForTitleInput.trim()) {
        const selectedStyle = artStyles.find(style => style.value === currentSelectedStyleValue) || artStyles[0];
        const styledPrompt = promptForTitleInput.trim() + selectedStyle.promptSuffix;
        
        newItems.push({
          id: nextId + (titleInput.trim() ? 1 : 0),
          type: 'prompt',
          originalPrompt: promptForTitleInput.trim(),
          styledPrompt: styledPrompt,
          status: 'pending',
          imageUrl: null,
          error: null,
          artStyleUsed: selectedStyle.name
        });
      }
    } else if (inputMode === 'prompt_only' && singlePromptInput.trim()) {
      const selectedStyle = artStyles.find(style => style.value === currentSelectedStyleValue) || artStyles[0];
      const styledPrompt = singlePromptInput.trim() + selectedStyle.promptSuffix;
      
      newItems.push({
        id: nextId,
        type: 'prompt',
        originalPrompt: singlePromptInput.trim(),
        styledPrompt: styledPrompt,
        status: 'pending',
        imageUrl: null,
        error: null,
        artStyleUsed: selectedStyle.name
      });
    }

    if (newItems.length > 0) {
      const promptJobs = newItems.filter(item => item.type === 'prompt') as PromptJob[];
      const otherItems = newItems.filter(item => item.type !== 'prompt');
      
      setCurrentDisplayList(prev => [...prev, ...otherItems]);
      setCurrentProcessingJobs(prev => [...prev, ...promptJobs]);
      
      setUrlInput('');
      setTitleInput('');
      setPromptForTitleInput('');
      setSinglePromptInput('');
      
      toast({
        title: "Elemento(s) agregado(s)",
        description: `Se agregaron ${newItems.length} elemento(s) a la cola.`,
      });
    }
  }, [inputMode, urlInput, titleInput, promptForTitleInput, singlePromptInput, selectedStyleValue, analyzerSelectedStyleValue, displayList, analyzerDisplayList, processingJobs, analyzerProcessingJobs, toast]);

  const processNextJob = useCallback(async (forAnalyzerTab: boolean = false) => {
    const currentProcessingJobs = forAnalyzerTab ? analyzerProcessingJobs : processingJobs;
    const setCurrentProcessingJobs = forAnalyzerTab ? setAnalyzerProcessingJobs : setProcessingJobs;
    const setCurrentJobIndexInQueue = forAnalyzerTab ? setAnalyzerCurrentJobIndexInQueue : setCurrentJobIndexInQueue;

    const pendingJobs = currentProcessingJobs.filter(job => job.status === 'pending');
    if (pendingJobs.length === 0) return;

    const jobToProcess = pendingJobs[0];
    const jobIndex = currentProcessingJobs.findIndex(job => job.id === jobToProcess.id);
    
    setCurrentJobIndexInQueue(jobIndex);
    
    setCurrentProcessingJobs(prev => 
      prev.map(job => 
        job.id === jobToProcess.id 
          ? { ...job, status: 'processing' as const }
          : job
      )
    );

    try {
      const result = await generateImageFromPrompt({ prompt: jobToProcess.styledPrompt });
      
      setCurrentProcessingJobs(prev => 
        prev.map(job => 
          job.id === jobToProcess.id 
            ? { ...job, status: 'completed' as const, imageUrl: result.imageUrl }
            : job
        )
      );
      
      toast({
        title: "Imagen generada",
        description: `Imagen generada exitosamente para: "${jobToProcess.originalPrompt.substring(0, 50)}..."`,
      });
    } catch (error) {
      console.error('Error generating image:', error);
      setCurrentProcessingJobs(prev => 
        prev.map(job => 
          job.id === jobToProcess.id 
            ? { ...job, status: 'failed' as const, error: error instanceof Error ? error.message : 'Error desconocido' }
            : job
        )
      );
      
      toast({
        title: "Error en generación",
        description: `Error al generar imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive",
      });
    } finally {
      setCurrentJobIndexInQueue(null);
    }
  }, [processingJobs, analyzerProcessingJobs, toast]);

  const startBatchProcessing = useCallback(async (forAnalyzerTab: boolean = false) => {
    const currentProcessingJobs = forAnalyzerTab ? analyzerProcessingJobs : processingJobs;
    const setIsBatchProcessingState = forAnalyzerTab ? setIsAnalyzerBatchProcessing : setIsBatchProcessing;

    const pendingJobs = currentProcessingJobs.filter(job => job.status === 'pending');
    if (pendingJobs.length === 0) return;

    setIsBatchProcessingState(true);
    
    for (let i = 0; i < pendingJobs.length; i++) {
      await processNextJob(forAnalyzerTab);
      if (i < pendingJobs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setIsBatchProcessingState(false);
    
    toast({
      title: "Procesamiento completado",
      description: `Se procesaron ${pendingJobs.length} trabajos.`,
    });
  }, [processNextJob, processingJobs, analyzerProcessingJobs, toast]);

  const downloadImage = useCallback(async (imageUrl: string, filename: string) => {
    setIsDownloadingIndividual(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      await new Promise(resolve => setTimeout(resolve, DOWNLOAD_DELAY_MS));
      
      toast({
        title: "Descarga completada",
        description: `Imagen descargada: ${filename}`,
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: "Error en descarga",
        description: "No se pudo descargar la imagen.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingIndividual(false);
    }
  }, [toast]);

  const downloadAllAsZip = useCallback(async (forAnalyzerTab: boolean = false) => {
    const currentProcessingJobs = forAnalyzerTab ? analyzerProcessingJobs : processingJobs;
    const setIsDownloadingZipState = forAnalyzerTab ? setIsAnalyzerDownloadingZip : setIsDownloadingZip;

    const completedJobs = currentProcessingJobs.filter(job => job.status === 'completed' && job.imageUrl);
    
    if (completedJobs.length === 0) {
      toast({
        title: "Sin imágenes",
        description: "No hay imágenes completadas para descargar.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloadingZipState(true);
    
    try {
      const zip = new JSZip();
      
      for (let i = 0; i < completedJobs.length; i++) {
        const job = completedJobs[i];
        try {
          const response = await fetch(job.imageUrl!);
          const blob = await response.blob();
          const filename = `imagen_${i + 1}_${job.originalPrompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.png`;
          zip.file(filename, blob);
        } catch (error) {
          console.error(`Error adding image ${i + 1} to zip:`, error);
        }
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `imagenes_generadas_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "ZIP descargado",
        description: `Se descargaron ${completedJobs.length} imágenes en un archivo ZIP.`,
      });
    } catch (error) {
      console.error('Error creating ZIP:', error);
      toast({
        title: "Error en ZIP",
        description: "No se pudo crear el archivo ZIP.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingZipState(false);
    }
  }, [processingJobs, analyzerProcessingJobs, toast]);

  const analyzeText = useCallback(async () => {
    if (!analyzerRawText.trim()) {
      toast({
        title: "Texto vacío",
        description: "Por favor ingresa texto para analizar.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzingText(true);
    try {
      const result = await extractPromptsFromText({ textBlock: analyzerRawText });
      setAnalyzerExtractedPrompts(result.prompts);
      
      toast({
        title: "Análisis completado",
        description: `Se extrajeron ${result.prompts.length} prompts del texto.`,
      });
    } catch (error) {
      console.error('Error analyzing text:', error);
      toast({
        title: "Error en análisis",
        description: "No se pudo analizar el texto.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingText(false);
    }
  }, [analyzerRawText, toast]);

  const addExtractedPromptsToQueue = useCallback(() => {
    if (analyzerExtractedPrompts.length === 0) return;

    setIsAddingExtractedToAnalyzerQueue(true);
    
    const selectedStyle = artStyles.find(style => style.value === analyzerSelectedStyleValue) || artStyles[0];
    const nextId = Math.max(0, ...analyzerDisplayList.map(item => item.id), ...analyzerProcessingJobs.map(job => job.id)) + 1;
    
    const newJobs: PromptJob[] = analyzerExtractedPrompts.map((prompt, index) => ({
      id: nextId + index,
      type: 'prompt',
      originalPrompt: prompt,
      styledPrompt: prompt + selectedStyle.promptSuffix,
      status: 'pending',
      imageUrl: null,
      error: null,
      artStyleUsed: selectedStyle.name
    }));
    
    setAnalyzerProcessingJobs(prev => [...prev, ...newJobs]);
    setAnalyzerExtractedPrompts([]);
    
    toast({
      title: "Prompts agregados",
      description: `Se agregaron ${newJobs.length} prompts a la cola del analizador.`,
    });
    
    setIsAddingExtractedToAnalyzerQueue(false);
  }, [analyzerExtractedPrompts, analyzerSelectedStyleValue, analyzerDisplayList, analyzerProcessingJobs, toast]);

  const clearQueue = useCallback((forAnalyzerTab: boolean = false) => {
    if (forAnalyzerTab) {
      setAnalyzerDisplayList([]);
      setAnalyzerProcessingJobs([]);
    } else {
      setDisplayList([]);
      setProcessingJobs([]);
    }
    
    toast({
      title: "Cola limpiada",
      description: "Se eliminaron todos los elementos de la cola.",
    });
  }, [toast]);

  const removeItem = useCallback((itemId: number, forAnalyzerTab: boolean = false) => {
    if (forAnalyzerTab) {
      setAnalyzerDisplayList(prev => prev.filter(item => item.id !== itemId));
      setAnalyzerProcessingJobs(prev => prev.filter(job => job.id !== itemId));
    } else {
      setDisplayList(prev => prev.filter(item => item.id !== itemId));
      setProcessingJobs(prev => prev.filter(job => job.id !== itemId));
    }
    
    toast({
      title: "Elemento eliminado",
      description: "El elemento fue eliminado de la cola.",
    });
  }, [toast]);

  const startRefinement = useCallback((job: PromptJob, forAnalyzerTab: boolean = false) => {
    if (forAnalyzerTab) {
      setAnalyzerItemBeingRefined(job);
      setAnalyzerRefinementPromptText('');
    } else {
      setItemBeingRefined(job);
      setRefinementPromptText('');
    }
  }, []);

  const cancelRefinement = useCallback((forAnalyzerTab: boolean = false) => {
    if (forAnalyzerTab) {
      setAnalyzerItemBeingRefined(null);
      setAnalyzerRefinementPromptText('');
    } else {
      setItemBeingRefined(null);
      setRefinementPromptText('');
    }
  }, []);

  const submitRefinement = useCallback(async (forAnalyzerTab: boolean = false) => {
    const currentItemBeingRefined = forAnalyzerTab ? analyzerItemBeingRefined : itemBeingRefined;
    const currentRefinementText = forAnalyzerTab ? analyzerRefinementPromptText : refinementPromptText;
    const setCurrentProcessingJobs = forAnalyzerTab ? setAnalyzerProcessingJobs : setProcessingJobs;
    const setIsSubmittingRefinementState = forAnalyzerTab ? setIsAnalyzerSubmittingRefinement : setIsSubmittingRefinement;

    if (!currentItemBeingRefined || !currentRefinementText.trim()) return;

    setIsSubmittingRefinementState(true);
    
    setCurrentProcessingJobs(prev => 
      prev.map(job => 
        job.id === currentItemBeingRefined.id 
          ? { ...job, status: 'refining' as const }
          : job
      )
    );

    try {
      const result = await refineImage({
        originalImageUri: currentItemBeingRefined.imageUrl!,
        refinementPrompt: currentRefinementText
      });
      
      setCurrentProcessingJobs(prev => 
        prev.map(job => 
          job.id === currentItemBeingRefined.id 
            ? { ...job, status: 'completed' as const, imageUrl: result.refinedImageUri }
            : job
        )
      );
      
      cancelRefinement(forAnalyzerTab);
      
      toast({
        title: "Refinamiento completado",
        description: "La imagen ha sido refinada exitosamente.",
      });
    } catch (error) {
      console.error('Error refining image:', error);
      setCurrentProcessingJobs(prev => 
        prev.map(job => 
          job.id === currentItemBeingRefined.id 
            ? { ...job, status: 'completed' as const }
            : job
        )
      );
      
      toast({
        title: "Error en refinamiento",
        description: `Error al refinar imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRefinementState(false);
    }
  }, [itemBeingRefined, analyzerItemBeingRefined, refinementPromptText, analyzerRefinementPromptText, cancelRefinement, toast]);

  const isInputEmpty = () => {
    switch (inputMode) {
      case 'url':
        return !urlInput.trim();
      case 'title_prompt':
        return !titleInput.trim() && !promptForTitleInput.trim();
      case 'prompt_only':
        return !singlePromptInput.trim();
      default:
        return true;
    }
  };
  
  const pendingAiJobsCount = processingJobs.filter(j => j.status === 'pending').length;
  const analyzerPendingAiJobsCount = analyzerProcessingJobs.filter(j => j.status === 'pending').length;

  const canStartBatch = !isBatchProcessing && pendingAiJobsCount > 0 && !isDownloadingIndividual && !isDownloadingZip && !itemBeingRefined;
  const canAnalyzerStartBatch = !isAnalyzerBatchProcessing && analyzerPendingAiJobsCount > 0 && !isAnalyzerDownloadingIndividual && !isAnalyzerDownloadingZip && !analyzerItemBeingRefined;
  
  const aiJobsInQueueCount = processingJobs.filter(j => j.type === 'prompt').length;
  const analyzerAiJobsInQueueCount = analyzerProcessingJobs.filter(j => j.type === 'prompt').length;

  const canAddItem = !isBatchProcessing && 
                     !isInputEmpty() && 
                     !isDownloadingIndividual && 
                     !isDownloadingZip &&
                     !itemBeingRefined &&
                     displayList.length < MAX_PROMPTS_OVERALL &&
                     (inputMode !== 'prompt_only' && inputMode !== 'title_prompt' || aiJobsInQueueCount < MAX_PROCESSING_JOBS || (inputMode === 'title_prompt' && !promptForTitleInput.trim() && titleInput.trim()));


  const renderQueueItem = (item: DisplayItem, index: number, forAnalyzerTab: boolean) => {
    const currentItemBeingRefinedState = forAnalyzerTab ? analyzerItemBeingRefined : itemBeingRefined;
    const currentRefinementTextState = forAnalyzerTab ? analyzerRefinementPromptText : refinementPromptText;
    const setRefinementTextState = forAnalyzerTab ? setAnalyzerRefinementPromptText : setRefinementPromptText;
    const isCurrentlySubmittingRefinement = forAnalyzerTab ? isAnalyzerSubmittingRefinement : isSubmittingRefinement;
    const currentIsBatchProcessing = forAnalyzerTab ? isAnalyzerBatchProcessing : isBatchProcessing;
    const currentIsDownloading = forAnalyzerTab ? (isAnalyzerDownloadingIndividual || isAnalyzerDownloadingZip) : (isDownloadingIndividual || isDownloadingZip);

    return (
        <div key={item.id} className="p-4 rounded-lg bg-card/75 border border-primary/70 shadow-md relative">
            <span className="absolute top-2 right-2 text-xs bg-primary/20 text-primary font-bold px-2 py-1 rounded-full">#{index + 1}</span>
            {item.type === 'title_comment' && ( 
            <div className="flex items-center">
                <Type size={20} className="mr-3 text-primary flex-shrink-0" />
                <p className="font-semibold text-md text-primary">{item.text}</p>
            </div>
            )}
            {item.type === 'external_image' && (
            <div>
                <p className="font-semibold text-sm text-green-600 mb-1 flex items-center">
                <LinkIcon size={18} className="inline mr-2 align-text-bottom" />
                Imagen Externa: <span className="text-muted-foreground font-normal ml-1 truncate w-60" title={item.imageUrl}>{item.imageUrl}</span>
                </p>
                <div className="mt-3 p-1 border-2 border-dashed border-green-500/60 rounded-md bg-background/40">
                    <img 
                    src={item.imageUrl} 
                    alt={`Imagen externa de ${item.imageUrl}`} 
                    className="w-full h-auto rounded object-contain max-h-[40vh]"
                    data-ai-hint="external content"
                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null; 
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yIGFsIGNhcmdhciBpbWFnZW48L3RleHQ+PC9zdmc+';
                    }}
                    />
                </div>
                <div className="mt-3 flex gap-2">
                    <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => removeItem(item.id, forAnalyzerTab)}
                    disabled={currentIsBatchProcessing || currentIsDownloading}
                    >
                    Eliminar
                    </Button>
                </div>
            </div>
            )}
            {item.type === 'skipped_prompt' && (
            <div>
                <p className="font-semibold text-sm text-orange-600 mb-1 flex items-center">
                <AlertTriangle size={18} className="inline mr-2 align-text-bottom" />
                Prompt Omitido: <span className="text-muted-foreground font-normal ml-1">{item.text}</span>
                </p>
                <p className="text-xs text-orange-500 mt-1">Razón: {item.reason}</p>
                <div className="mt-3 flex gap-2">
                    <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => removeItem(item.id, forAnalyzerTab)}
                    disabled={currentIsBatchProcessing || currentIsDownloading}
                    >
                    Eliminar
                    </Button>
                </div>
            </div>
            )}
            {item.type === 'prompt' && (
            <div>
                <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <p className="font-semibold text-sm text-blue-600 mb-1 flex items-center">
                    <Sparkles size={18} className="inline mr-2 align-text-bottom flex-shrink-0" />
                    Prompt: <span className="text-muted-foreground font-normal ml-1 break-words">{item.originalPrompt}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mb-1">Estilo: {item.artStyleUsed}</p>
                    <div className="flex items-center gap-2 text-xs">
                    {item.status === 'pending' && (
                        <span className="flex items-center text-yellow-600">
                        <Loader2 size={14} className="mr-1" />
                        Pendiente
                        </span>
                    )}
                    {item.status === 'processing' && (
                        <span className="flex items-center text-blue-600">
                        <Loader2 size={14} className="mr-1 animate-spin" />
                        Procesando...
                        </span>
                    )}
                    {item.status === 'refining' && (
                        <span className="flex items-center text-purple-600">
                        <Loader2 size={14} className="mr-1 animate-spin" />
                        Refinando...
                        </span>
                    )}
                    {item.status === 'completed' && (
                        <span className="flex items-center text-green-600">
                        <ImageIcon size={14} className="mr-1" />
                        Completado
                        </span>
                    )}
                    {item.status === 'failed' && (
                        <span className="flex items-center text-red-600">
                        <AlertTriangle size={14} className="mr-1" />
                        Error: {item.error}
                        </span>
                    )}
                    </div>
                </div>
                </div>
                
                {item.status === 'completed' && item.imageUrl && (
                <div className="mt-3 p-1 border-2 border-dashed border-blue-500/60 rounded-md bg-background/40">
                    <img 
                    src={item.imageUrl} 
                    alt={`Imagen generada para: ${item.originalPrompt}`} 
                    className="w-full h-auto rounded object-contain max-h-[40vh]"
                    data-ai-hint="generated content"
                    />
                </div>
                )}
                
                {currentItemBeingRefinedState?.id === item.id && (
                <div className="mt-3 p-3 border border-purple-500/50 rounded-md bg-purple-50/50 dark:bg-purple-950/20">
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Refinando imagen:</p>
                    <Textarea
                    placeholder="Describe cómo quieres refinar esta imagen..."
                    value={currentRefinementTextState}
                    onChange={(e) => setRefinementTextState(e.target.value)}
                    className="mb-2"
                    rows={3}
                    />
                    <div className="flex gap-2">
                    <Button 
                        size="sm" 
                        onClick={() => submitRefinement(forAnalyzerTab)}
                        disabled={!currentRefinementTextState.trim() || isCurrentlySubmittingRefinement}
                    >
                        {isCurrentlySubmittingRefinement ? (
                        <>
                            <Loader2 size={16} className="mr-2 animate-spin" />
                            Refinando...
                        </>
                        ) : (
                        <>
                            <Send size={16} className="mr-2" />
                            Refinar
                        </>
                        )}
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => cancelRefinement(forAnalyzerTab)}
                        disabled={isCurrentlySubmittingRefinement}
                    >
                        Cancelar
                    </Button>
                    </div>
                </div>
                )}
                
                <div className="mt-3 flex gap-2 flex-wrap">
                <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => removeItem(item.id, forAnalyzerTab)}
                    disabled={currentIsBatchProcessing || currentIsDownloading || currentItemBeingRefinedState?.id === item.id}
                >
                    Eliminar
                </Button>
                
                {item.status === 'completed' && item.imageUrl && (
                    <>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => downloadImage(item.imageUrl!, `imagen_${item.id}_${item.originalPrompt.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.png`)}
                        disabled={currentIsDownloading || currentIsBatchProcessing}
                    >
                        <Download size={16} className="mr-2" />
                        Descargar
                    </Button>
                    
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => startRefinement(item, forAnalyzerTab)}
                        disabled={currentIsBatchProcessing || currentIsDownloading || currentItemBeingRefinedState !== null}
                    >
                        <Palette size={16} className="mr-2" />
                        Refinar
                    </Button>
                    </>
                )}
                </div>
            </div>
            )}
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <FuturisticBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            StudioGen - Versión Mínima
          </h1>
          <p className="text-lg text-muted-foreground">
            Generador de imágenes con IA - Solo funcionalidad esencial
          </p>
        </div>

        <Tabs defaultValue="generator" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generator">Generador Principal</TabsTrigger>
            <TabsTrigger value="analyzer">Analizador de Texto</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generator" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="mr-2" />
                  Configuración de Generación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Modo de Entrada</Label>
                  <RadioGroup value={inputMode} onValueChange={(value) => setInputMode(value as InputMode)} className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="prompt_only" id="prompt_only" />
                      <Label htmlFor="prompt_only">Solo Prompt</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="title_prompt" id="title_prompt" />
                      <Label htmlFor="title_prompt">Título + Prompt</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="url" id="url" />
                      <Label htmlFor="url">URL de Imagen</Label>
                    </div>
                  </RadioGroup>
                </div>

                {inputMode === 'url' && (
                  <div>
                    <Label htmlFor="url-input">URL de Imagen</Label>
                    <Textarea
                      id="url-input"
                      placeholder="https://ejemplo.com/imagen.jpg"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      rows={2}
                    />
                  </div>
                )}

                {inputMode === 'title_prompt' && (
                  <>
                    <div>
                      <Label htmlFor="title-input">Título (Opcional)</Label>
                      <Textarea
                        id="title-input"
                        placeholder="Título descriptivo para organizar..."
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="prompt-for-title-input">Prompt para Imagen</Label>
                      <Textarea
                        id="prompt-for-title-input"
                        placeholder="Describe la imagen que quieres generar..."
                        value={promptForTitleInput}
                        onChange={(e) => setPromptForTitleInput(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </>
                )}

                {inputMode === 'prompt_only' && (
                  <div>
                    <Label htmlFor="single-prompt-input">Prompt</Label>
                    <Textarea
                      id="single-prompt-input"
                      placeholder="Describe la imagen que quieres generar..."
                      value={singlePromptInput}
                      onChange={(e) => setSinglePromptInput(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="style-select">Estilo Artístico</Label>
                  <Select value={selectedStyleValue} onValueChange={setSelectedStyleValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un estilo" />
                    </SelectTrigger>
                    <SelectContent>
                      {artStyles.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={() => addItemToQueue(false)} 
                  disabled={!canAddItem}
                  className="w-full"
                >
                  <PlusCircle className="mr-2" />
                  Agregar a Cola
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <ListChecks className="mr-2" />
                    Cola de Procesamiento ({displayList.length + processingJobs.length}/{MAX_PROMPTS_OVERALL})
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => startBatchProcessing(false)} 
                      disabled={!canStartBatch}
                      size="sm"
                    >
                      <PlayCircle className="mr-2" />
                      Procesar Todo ({pendingAiJobsCount})
                    </Button>
                    <Button 
                      onClick={() => downloadAllAsZip(false)} 
                      disabled={processingJobs.filter(j => j.status === 'completed' && j.imageUrl).length === 0 || isDownloadingZip}
                      variant="outline"
                      size="sm"
                    >
                      {isDownloadingZip ? (
                        <>
                          <Loader2 className="mr-2 animate-spin" />
                          Creando ZIP...
                        </>
                      ) : (
                        <>
                          <FileArchive className="mr-2" />
                          Descargar ZIP
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={() => clearQueue(false)} 
                      disabled={isBatchProcessing || isDownloadingIndividual || isDownloadingZip}
                      variant="destructive"
                      size="sm"
                    >
                      Limpiar Cola
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {[...displayList, ...processingJobs].length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No hay elementos en la cola. Agrega algunos elementos para comenzar.
                    </p>
                  ) : (
                    [...displayList, ...processingJobs]
                      .sort((a, b) => a.id - b.id)
                      .map((item, index) => renderQueueItem(item, index, false))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analyzer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquareText className="mr-2" />
                  Analizador de Texto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="analyzer-text">Texto para Analizar</Label>
                  <Textarea
                    id="analyzer-text"
                    placeholder="Pega aquí el texto del cual quieres extraer prompts para imágenes..."
                    value={analyzerRawText}
                    onChange={(e) => setAnalyzerRawText(e.target.value)}
                    rows={6}
                  />
                </div>

                <Button 
                  onClick={analyzeText} 
                  disabled={!analyzerRawText.trim() || isAnalyzingText}
                  className="w-full"
                >
                  {isAnalyzingText ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2" />
                      Analizar Texto
                    </>
                  )}
                </Button>

                {analyzerExtractedPrompts.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <Label>Prompts Extraídos ({analyzerExtractedPrompts.length})</Label>
                      <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                        {analyzerExtractedPrompts.map((prompt, index) => (
                          <div key={index} className="p-2 bg-muted rounded text-sm">
                            {prompt}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="analyzer-style-select">Estilo Artístico</Label>
                      <Select value={analyzerSelectedStyleValue} onValueChange={setAnalyzerSelectedStyleValue}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un estilo" />
                        </SelectTrigger>
                        <SelectContent>
                          {artStyles.map((style) => (
                            <SelectItem key={style.value} value={style.value}>
                              {style.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={addExtractedPromptsToQueue} 
                      disabled={isAddingExtractedToAnalyzerQueue}
                      className="w-full"
                    >
                      {isAddingExtractedToAnalyzerQueue ? (
                        <>
                          <Loader2 className="mr-2 animate-spin" />
                          Agregando...
                        </>
                      ) : (
                        <>
                          <PlusCircle className="mr-2" />
                          Agregar Prompts a Cola
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <ListChecks className="mr-2" />
                    Cola del Analizador ({analyzerDisplayList.length + analyzerProcessingJobs.length}/{MAX_PROMPTS_OVERALL})
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => startBatchProcessing(true)} 
                      disabled={!canAnalyzerStartBatch}
                      size="sm"
                    >
                      <PlayCircle className="mr-2" />
                      Procesar Todo ({analyzerPendingAiJobsCount})
                    </Button>
                    <Button 
                      onClick={() => downloadAllAsZip(true)} 
                      disabled={analyzerProcessingJobs.filter(j => j.status === 'completed' && j.imageUrl).length === 0 || isAnalyzerDownloadingZip}
                      variant="outline"
                      size="sm"
                    >
                      {isAnalyzerDownloadingZip ? (
                        <>
                          <Loader2 className="mr-2 animate-spin" />
                          Creando ZIP...
                        </>
                      ) : (
                        <>
                          <FileArchive className="mr-2" />
                          Descargar ZIP
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={() => clearQueue(true)} 
                      disabled={isAnalyzerBatchProcessing || isAnalyzerDownloadingIndividual || isAnalyzerDownloadingZip}
                      variant="destructive"
                      size="sm"
                    >
                      Limpiar Cola
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {[...analyzerDisplayList, ...analyzerProcessingJobs].length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No hay elementos en la cola del analizador. Analiza texto para extraer prompts.
                    </p>
                  ) : (
                    [...analyzerDisplayList, ...analyzerProcessingJobs]
                      .sort((a, b) => a.id - b.id)
                      .map((item, index) => renderQueueItem(item, index, true))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ImageGeneratorApp;



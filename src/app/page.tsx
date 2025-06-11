
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Image as ImageIcon, Loader2, AlertTriangle, Send, ListChecks, Info, MessageSquareText, Type, Download, Link as LinkIcon, Palette, PlusCircle, PlayCircle, Lock, LogIn, Smile, Heart, Cpu, CircuitBoard, Music2, Disc3, ActivitySquare, Ban, AlertOctagon, Code2, DollarSign, Landmark, CreditCard, Shield, ShieldCheck, LogOut, Menu as MenuIcon, Moon, Sun, GlobeLock, CheckCircle, Wand2, UploadCloud } from 'lucide-react';
import FuturisticBackground from '@/components/futuristic-background';
import { artStyles, MAX_PROMPTS_OVERALL, MAX_PROCESSING_JOBS, DOWNLOAD_DELAY_MS, type DisplayItem, type PromptJob, type ArtStyle } from '@/lib/artbot-config';
import { generateImageFromPrompt } from '@/ai/flows/generate-image-from-prompt';
import { refineImage } from '@/ai/flows/refine-image-flow';
import { extractPromptsFromText } from '@/ai/flows/extract-prompts-from-text-flow';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import HeartRain from '@/components/ui/heart-rain';
import TechEffect from '@/components/ui/tech-effect';
import MusicVibes from '@/components/ui/music-vibes';
import AccessDeniedEffect from '@/components/ui/access-denied-effect';
import MoneyRain from '@/components/ui/money-rain';
import { useToast } from "@/hooks/use-toast";


const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  return url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || url.startsWith('data:image');
};

type InputMode = 'url' | 'title_prompt' | 'prompt_only';

type PasswordConfig = {
  greeting: string;
  animation: () => void;
  isAdmin?: boolean;
  isEnabledGlobal: boolean;
};

const ImageGeneratorApp = () => {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);

  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [heartAnimationKey, setHeartAnimationKey] = useState(0);
  const [showTechEffect, setShowTechEffect] = useState(false);
  const [techEffectKey, setTechEffectKey] = useState(0);
  const [showMusicVibes, setShowMusicVibes] = useState(false);
  const [musicVibesKey, setMusicVibesKey] = useState(0);
  const [showAccessDeniedEffect, setShowAccessDeniedEffect] = useState(false);
  const [accessDeniedEffectKey, setAccessDeniedEffectKey] = useState(0);
  const [showMoneyAnimation, setShowMoneyAnimation] = useState(false);
  const [moneyAnimationKey, setMoneyAnimationKey] = useState(0);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isPasswordProtectionGloballyDisabled, setIsPasswordProtectionGloballyDisabled] = useState(true);
  const [globalProtectionButtonText, setGlobalProtectionButtonText] = useState('');

  const [googleDriveApiLoaded, setGoogleDriveApiLoaded] = useState(false);
  const [isGoogleDriveAuthenticated, setIsGoogleDriveAuthenticated] = useState(false);
  const [uploadingToDriveItemId, setUploadingToDriveItemId] = useState<number | null>(null);

  const [showAdminPromptAnalyzer, setShowAdminPromptAnalyzer] = useState(false);
  const [adminPromptAnalysisText, setAdminPromptAnalysisText] = useState('');
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const [extractedAdminPrompts, setExtractedAdminPrompts] = useState<string[]>([]);
  const [isAddingAdminPromptsToQueue, setIsAddingAdminPromptsToQueue] = useState(false);


  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }
  }, []);

  useEffect(() => {
    if (isPasswordProtectionGloballyDisabled && !currentUserIsAdmin && !isAuthenticated) {
      setIsAuthenticated(true); 
      setGreetingMessage("Modo de Acceso Abierto. Funcionalidad completa disponible.");
    }
     setGlobalProtectionButtonText(
      isPasswordProtectionGloballyDisabled ? "Activar Protección Global" : "Desactivar Protección Global"
    );
  }, [isPasswordProtectionGloballyDisabled, currentUserIsAdmin, isAuthenticated]);


  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => {
      const newMode = !prevMode;
      if (newMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return newMode;
    });
  };


  const initialPasswordConfigs: Record<string, PasswordConfig> = {
    "Chispart123": {
      greeting: "Hola, Amo.",
      animation: () => { setShowTechEffect(true); setTechEffectKey(Date.now()); },
      isAdmin: true,
      isEnabledGlobal: true, 
    },
    "Patrona1": {
      greeting: "Hola, amor de mi vida",
      animation: () => { setShowHeartAnimation(true); setHeartAnimationKey(Date.now()); },
      isAdmin: false,
      isEnabledGlobal: false,
    },
    "ChispukAdmin": {
      greeting: "El que no baila no opina",
      animation: () => { setShowMusicVibes(true); setMusicVibesKey(Date.now()); },
      isAdmin: false,
      isEnabledGlobal: false,
    },
    "supersecretpassword": {
      greeting: "¿Tú qué haces aquí? ¡LARGO!",
      animation: () => { setShowAccessDeniedEffect(true); setAccessDeniedEffectKey(Date.now()); },
      isAdmin: false,
      isEnabledGlobal: false,
    },
    "Miau1234*": {
      greeting: "¡A hacer billetes, Miau!",
      animation: () => { setShowMoneyAnimation(true); setMoneyAnimationKey(Date.now()); },
      isAdmin: false,
      isEnabledGlobal: false,
    }
  };

  const [allPasswordConfigs, setAllPasswordConfigs] = useState<Record<string, PasswordConfig>>(initialPasswordConfigs);
  const [isAdminPanelVisible, setIsAdminPanelVisible] = useState(false);
  const [showDirectAdminLogin, setShowDirectAdminLogin] = useState(false);

  const areNonAdminPasswordsDisabled = Object.values(allPasswordConfigs)
    .filter(config => !config.isAdmin)
    .every(config => !config.isEnabledGlobal);

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

  const [itemBeingRefined, setItemBeingRefined] = useState<PromptJob | null>(null);
  const [refinementPromptText, setRefinementPromptText] = useState<string>('');
  const [isSubmittingRefinement, setIsSubmittingRefinement] = useState<boolean>(false);

  useEffect(() => {
    const initGoogleDriveApi = async () => {
      try {
        const { loadGapiInsideDOM } = await import('gapi-script'); 
        const gapi = await loadGapiInsideDOM();
        gapi.load('client:auth2', async () => {
          try {
            if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
              console.warn("Google Client ID no está configurado. La subida a Drive no funcionará.");
              toast({ title: "Configuración Incompleta", description: "Google Client ID no configurado. Subida a Drive deshabilitada.", variant: "destructive", duration: 10000 });
              setGoogleDriveApiLoaded(false);
              return;
            }
            await gapi.client.init({
              clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
              scope: 'https://www.googleapis.com/auth/drive.file', 
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            });
            setGoogleDriveApiLoaded(true);
            const authInstance = gapi.auth2.getAuthInstance();
            if (authInstance.isSignedIn.get()) {
              setIsGoogleDriveAuthenticated(true);
            }
            authInstance.isSignedIn.listen(setIsGoogleDriveAuthenticated);
          } catch (error) {
            console.error("Error initializing Google API client auth:", error);
            toast({ title: "Error API Google", description: "No se pudo inicializar el cliente de Google Drive.", variant: "destructive" });
            setGoogleDriveApiLoaded(false);
          }
        });
      } catch (error) {
         console.error("Error loading GAPI script:", error);
         toast({ title: "Error Carga Google API", description: "No se pudo cargar el script de Google.", variant: "destructive" });
         setGoogleDriveApiLoaded(false);
      }
    };
    initGoogleDriveApi();
  }, [toast]);

  const handleGoogleDriveAuth = async () => {
    if (!googleDriveApiLoaded || !window.gapi || !window.gapi.auth2) {
      toast({ title: "Error", description: "La API de Google Drive aún no está lista.", variant: "destructive" });
      return false;
    }
    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      if (!authInstance.isSignedIn.get()) {
        await authInstance.signIn();
      }
      const signedIn = authInstance.isSignedIn.get();
      setIsGoogleDriveAuthenticated(signedIn);
      if (!signedIn) {
        toast({ title: "Autenticación Fallida", description: "No se pudo iniciar sesión con Google.", variant: "destructive" });
      }
      return signedIn;
    } catch (error: any) {
      console.error("Error during Google Drive authentication", error);
       if (error.error === "popup_closed_by_user") {
        toast({ title: "Autenticación Cancelada", description: "Has cerrado la ventana de inicio de sesión de Google.", variant: "default" });
      } else {
        toast({ title: "Error de Autenticación", description: "No se pudo autenticar con Google Drive.", variant: "destructive" });
      }
      setIsGoogleDriveAuthenticated(false);
      return false;
    }
  };

  const dataURIToBlob = (dataURI: string): Blob => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  const handleUploadToDrive = async (item: PromptJob) => {
    if (!item.imageUrl) {
      toast({ title: "Error", description: "No hay imagen para subir.", variant: "destructive" });
      return;
    }
    if (!isGoogleDriveAuthenticated) {
      const authenticated = await handleGoogleDriveAuth();
      if (!authenticated) return;
    }

    setUploadingToDriveItemId(item.id);
    try {
      const gapi = window.gapi;
      if (!gapi || !gapi.client || !gapi.auth2) {
        throw new Error("Google API client no disponible.");
      }
      
      const blob = dataURIToBlob(item.imageUrl);
      const sanitizedPrompt = item.originalPrompt.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      const filename = `artbot_img_${item.artStyleUsed ? item.artStyleUsed.split(' ')[0].toLowerCase() + '_' : ''}${sanitizedPrompt || 'prompt'}_${item.id}.png`;
      
      const fileMetadata = {
        name: filename,
        mimeType: blob.type,
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
      form.append('file', blob);

      const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Error del servidor: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log("Upload response:", responseData);
      toast({ title: "Éxito", description: `Imagen "${filename}" subida a Google Drive.` });

    } catch (error: any) {
      console.error("Error uploading to Google Drive", error);
      toast({ title: "Error de Subida", description: `No se pudo subir la imagen: ${error.message}`, variant: "destructive" });
    } finally {
      setUploadingToDriveItemId(null);
    }
  };

  const resetAnimations = () => {
    setShowHeartAnimation(false);
    setShowTechEffect(false);
    setShowMusicVibes(false);
    setShowAccessDeniedEffect(false);
    setShowMoneyAnimation(false);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetAnimations();
    const submittedPassword = passwordInput; 
    const config = allPasswordConfigs[submittedPassword];

    if (showDirectAdminLogin) { 
      if (submittedPassword === "Chispart123" && allPasswordConfigs["Chispart123"]) {
        setIsAuthenticated(true);
        setGreetingMessage(allPasswordConfigs["Chispart123"].greeting);
        allPasswordConfigs["Chispart123"].animation();
        setCurrentUserIsAdmin(true); 
        setAuthError('');
      } else {
        setAuthError('Contraseña de administrador incorrecta.');
        setGreetingMessage('');
        setCurrentUserIsAdmin(false);
      }
      setPasswordInput(''); 
      return;
    }

    if (config && config.isEnabledGlobal) {
      setIsAuthenticated(true);
      setGreetingMessage(config.greeting);
      config.animation();
      setCurrentUserIsAdmin(!!config.isAdmin);
      setAuthError('');
      setIsAdminPanelVisible(false); 
    } else {
      setAuthError('Contraseña incorrecta o deshabilitada.');
      setGreetingMessage('');
      setCurrentUserIsAdmin(false);
    }
    setPasswordInput(''); 
  };

  const handleLogout = () => {
    resetAnimations();
    setIsAdminPanelVisible(false);
    
    const isAdminLoggingOut = currentUserIsAdmin;
    setCurrentUserIsAdmin(false); 

    setPasswordInput('');
    setAuthError('');
    setShowDirectAdminLogin(false);

    setDisplayList([]);
    setProcessingJobs([]);
    setIsBatchProcessing(false);
    setCurrentJobIndexInQueue(null);
    setItemBeingRefined(null);
    setRefinementPromptText('');

    setShowAdminPromptAnalyzer(false);
    setAdminPromptAnalysisText('');
    setExtractedAdminPrompts([]);
    setIsAnalyzingText(false);
    setIsAddingAdminPromptsToQueue(false);


    if (googleDriveApiLoaded && window.gapi && window.gapi.auth2) {
      const authInstance = window.gapi.auth2.getAuthInstance();
      if (authInstance && authInstance.isSignedIn.get()) {
        authInstance.signOut();
        setIsGoogleDriveAuthenticated(false);
        toast({title: "Sesión de Google Drive cerrada."})
      }
    }


    if (isPasswordProtectionGloballyDisabled && isAdminLoggingOut) {
        setIsAuthenticated(true); 
        setGreetingMessage("Modo de Acceso Abierto. Funcionalidad completa disponible.");
    } else {
        setIsAuthenticated(false); 
        setGreetingMessage('');
    }
  };
  
  const togglePasswordGlobalEnable = (passwordKey: string, checked: boolean) => {
    setAllPasswordConfigs(prev => ({
      ...prev,
      [passwordKey]: { ...prev[passwordKey], isEnabledGlobal: checked }
    }));
  };

  const handleToggleGlobalProtection = () => {
    setIsPasswordProtectionGloballyDisabled(prev => {
      const newState = !prev;
      if (newState) { 
        if (!currentUserIsAdmin) { 
            setIsAuthenticated(true); 
            setGreetingMessage("Modo de Acceso Abierto. Funcionalidad completa disponible.");
        }
      } else { 
        if (!currentUserIsAdmin) { 
            setIsAuthenticated(false); 
            setGreetingMessage("");
        }
      }
      return newState;
    });
  };


  useEffect(() => {
    if (!isBatchProcessing || currentJobIndexInQueue === null || currentJobIndexInQueue >= processingJobs.length) {
      if (isBatchProcessing && processingJobs.length > 0 && currentJobIndexInQueue !== null && currentJobIndexInQueue >= processingJobs.length) {
      }
      if (isBatchProcessing) {
        setIsBatchProcessing(false); 
      }
      return;
    }

    const currentJob = processingJobs[currentJobIndexInQueue];
    
    if (currentJob && currentJob.status === 'pending') {
      (async () => {
        setDisplayList(prevDisplayList => prevDisplayList.map(dItem => 
            dItem.id === currentJob.id && dItem.type === 'prompt' ? { ...dItem, status: 'processing' as const } : dItem
        ));
        setProcessingJobs(prevJobs => prevJobs.map(item => 
            item.id === currentJob.id ? { ...item, status: 'processing' as const } : item
        ));

        try {
          const result = await generateImageFromPrompt({ prompt: currentJob.styledPrompt });
          const generatedImageUrl = result.imageUrl;

          setDisplayList(prevItems => prevItems.map(item => 
            item.id === currentJob.id && item.type === 'prompt' ? { ...item, status: 'completed' as const, imageUrl: generatedImageUrl } : item
          ));
          setProcessingJobs(prevJobs => prevJobs.map(item => 
            item.id === currentJob.id ? { ...item, status: 'completed' as const, imageUrl: generatedImageUrl } : item
          ));
        } catch (err: any) {
          setDisplayList(prevItems => prevItems.map(item => 
            item.id === currentJob.id && item.type === 'prompt' ? { ...item, status: 'failed' as const, error: err.message || 'Unknown error' } : item
          ));
          setProcessingJobs(prevJobs => prevJobs.map(item => 
            item.id === currentJob.id ? { ...item, status: 'failed' as const, error: err.message || 'Unknown error' } : item
          ));
        } finally {
          setCurrentJobIndexInQueue(prevIndex => (prevIndex !== null ? prevIndex + 1 : 0));
        }
      })();
    } else if (currentJob) { 
        setCurrentJobIndexInQueue(prevIndex => (prevIndex !== null ? prevIndex + 1 : 0));
    }
  }, [currentJobIndexInQueue, processingJobs, isBatchProcessing]);


  const handleAddItemToQueue = () => {
    if (displayList.length >= MAX_PROMPTS_OVERALL) {
      toast({ title: "Límite Alcanzado", description: `No puedes agregar más de ${MAX_PROMPTS_OVERALL} elementos en total.`, variant: "destructive" });
      return;
    }

    const currentArtStyle = artStyles.find(style => style.value === selectedStyleValue) || artStyles[0];
    const uniqueId = Date.now() + displayList.length + Math.random(); 

    let newItemToAdd: DisplayItem | null = null;
    let newJobToAdd: PromptJob | null = null;

    switch (inputMode) {
      case 'url':
        if (!urlInput.trim()) {
          toast({ title: "Entrada Requerida", description: "Por favor, ingresa una URL.", variant: "destructive" });
          return;
        }
        if (isValidImageUrl(urlInput)) {
          newItemToAdd = { id: uniqueId, type: 'external_image', imageUrl: urlInput };
        } else {
          newItemToAdd = {
            id: uniqueId, type: 'skipped_prompt', text: urlInput,
            reason: `La URL proporcionada no es una imagen válida o no es accesible.`,
          };
        }
        break;

      case 'title_prompt':
        if (!titleInput.trim() && !promptForTitleInput.trim()) {
          toast({ title: "Entrada Requerida", description: "Por favor, ingresa un título o un prompt.", variant: "destructive" });
          return;
        }
        if (titleInput.trim()) {
          setDisplayList(prev => [...prev, { id: uniqueId, type: 'title_comment', text: titleInput.trim() }]);
        }
        if (promptForTitleInput.trim()) {
           const currentAiJobsCount = processingJobs.filter(job => job.type === 'prompt').length;
            if (currentAiJobsCount >= MAX_PROCESSING_JOBS) {
                toast({ title: "Límite de Prompts IA", description: `No puedes agregar más de ${MAX_PROCESSING_JOBS} prompts de IA a la cola para procesar.`, variant: "destructive" });
                return; 
            }
          const styledPrompt = `${promptForTitleInput.trim()}${currentArtStyle.promptSuffix}`;
          newJobToAdd = {
            id: titleInput.trim() ? uniqueId + 0.1 : uniqueId, 
            type: 'prompt', originalPrompt: promptForTitleInput.trim(), styledPrompt, status: 'pending',
            imageUrl: null, error: null, artStyleUsed: currentArtStyle.name,
          };
          newItemToAdd = newJobToAdd; 
        } else if (!titleInput.trim()) { 
            return;
        }
        break;

      case 'prompt_only':
        if (!singlePromptInput.trim()) {
          toast({ title: "Entrada Requerida", description: "Por favor, ingresa un prompt.", variant: "destructive" });
          return;
        }
        const currentAiJobsCount = processingJobs.filter(j => j.type === 'prompt').length;
        if (currentAiJobsCount >= MAX_PROCESSING_JOBS) {
            toast({ title: "Límite de Prompts IA", description: `No puedes agregar más de ${MAX_PROCESSING_JOBS} prompts de IA a la cola para procesar.`, variant: "destructive" });
            return;
        }
        const styledPrompt = `${singlePromptInput.trim()}${currentArtStyle.promptSuffix}`;
        newJobToAdd = {
          id: uniqueId, type: 'prompt', originalPrompt: singlePromptInput.trim(), styledPrompt, status: 'pending',
          imageUrl: null, error: null, artStyleUsed: currentArtStyle.name,
        };
        newItemToAdd = newJobToAdd;
        break;
    }
    
    if (newItemToAdd) {
        if (inputMode !== 'title_prompt' || (inputMode === 'title_prompt' && promptForTitleInput.trim())) {
             setDisplayList(prev => [...prev, newItemToAdd!]);
        }
       
        if (newJobToAdd) {
            setProcessingJobs(prev => [...prev, newJobToAdd!]);
        }

        setUrlInput('');
        setTitleInput('');
        setPromptForTitleInput('');
        setSinglePromptInput('');
    }
  };
  
  const handleStartBatchProcessing = () => {
    const pendingJobs = processingJobs.filter(job => job.status === 'pending');
    if (pendingJobs.length === 0) {
      toast({ title: "Cola Vacía", description: "No hay prompts de IA pendientes en la cola para procesar.", variant: "destructive"});
      return;
    }
    setIsBatchProcessing(true);
    setCurrentJobIndexInQueue(0); 
    setItemBeingRefined(null); 
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleDownloadAllImages = async () => {
    const imagesToDownload = displayList.filter(
        (item): item is PromptJob => item.type === 'prompt' && item.status === 'completed' && !!item.imageUrl && item.imageUrl.startsWith('data:image')
    );

    if (imagesToDownload.length === 0) {
        toast({ title: "Sin Imágenes", description: "No hay imágenes generadas por IA con éxito para descargar.", variant: "destructive" });
        return;
    }

    setIsDownloadingIndividual(true);
    let downloadedCount = 0;

    for (let i = 0; i < imagesToDownload.length; i++) {
        const item = imagesToDownload[i];
        try {
            const link = document.createElement('a');
            link.href = item.imageUrl!; 
            
            const sanitizedPrompt = item.originalPrompt.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
            const filename = `artbot_img_${i + 1}_${item.artStyleUsed ? item.artStyleUsed.split(' ')[0].toLowerCase() + '_' : ''}${sanitizedPrompt || 'prompt'}.png`;
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
            toast({ title: "Error de Descarga", description: `Ocurrió un error al descargar la imagen para: "${item.originalPrompt.substring(0,50)}..."`, variant: "destructive" });
        }
    }
    
    toast({ title: "Descarga Iniciada", description: `${downloadedCount} imagen(es) generada(s) por IA programada(s) para descarga.` });
    setIsDownloadingIndividual(false);
  };

  const handleStartRefinement = (item: PromptJob) => {
    if (isBatchProcessing || isDownloadingIndividual || isSubmittingRefinement || uploadingToDriveItemId) return;
    setItemBeingRefined(item);
    setRefinementPromptText('');
  };

  const handleCancelRefinement = () => {
    setItemBeingRefined(null);
    setRefinementPromptText('');
  };

  const handleSubmitRefinement = async () => {
    if (!itemBeingRefined || !refinementPromptText.trim() || !itemBeingRefined.imageUrl) {
      toast({ title: "Error", description: "Se necesita la imagen original y un prompt de mejora.", variant: "destructive" });
      return;
    }
    
    setIsSubmittingRefinement(true);
    const originalImageUri = itemBeingRefined.imageUrl;
    const itemIdToRefine = itemBeingRefined.id;

    const updateItemState = (id: number, updates: Partial<PromptJob>) => {
      setDisplayList(prev => prev.map(dItem => dItem.id === id && dItem.type === 'prompt' ? { ...dItem, ...updates } as PromptJob : dItem));
      setProcessingJobs(prev => prev.map(pJob => pJob.id === id && pJob.type === 'prompt' ? { ...pJob, ...updates } as PromptJob : pJob));
    };

    updateItemState(itemIdToRefine, { status: 'refining' });

    try {
      const result = await refineImage({ originalImageUri, refinementPrompt: refinementPromptText });
      const refinedImageUri = result.refinedImageUri;
      updateItemState(itemIdToRefine, { 
        imageUrl: refinedImageUri, 
        status: 'completed', 
      });
      toast({ title: "Éxito", description: "Imagen mejorada con éxito." });
    } catch (err: any) {
      const errMessage = err.message || 'Error desconocido durante la mejora.';
      updateItemState(itemIdToRefine, { status: 'completed', error: `Mejora fallida: ${errMessage}` }); 
      toast({ title: "Error de Mejora", description: errMessage, variant: "destructive" });
    } finally {
      setItemBeingRefined(null);
      setRefinementPromptText('');
      setIsSubmittingRefinement(false);
    }
  };

  const handleAnalyzeTextForPrompts = async () => {
    if (!adminPromptAnalysisText.trim()) {
      toast({ title: "Texto Vacío", description: "Por favor, ingresa texto para analizar.", variant: "destructive" });
      return;
    }
    setIsAnalyzingText(true);
    setExtractedAdminPrompts([]);
    try {
      const result = await extractPromptsFromText({ textBlock: adminPromptAnalysisText });
      if (result.prompts && result.prompts.length > 0) {
        setExtractedAdminPrompts(result.prompts);
        toast({ title: "Análisis Completo", description: `${result.prompts.length} prompts detectados.` });
      } else {
        toast({ title: "Sin Prompts", description: "No se detectaron prompts claros en el texto.", variant: "default" });
      }
    } catch (error: any) {
      console.error("Error analyzing text for prompts:", error);
      toast({ title: "Error de Análisis", description: error.message || "No se pudo analizar el texto.", variant: "destructive" });
    } finally {
      setIsAnalyzingText(false);
    }
  };

  const handleAddAdminPromptsToQueue = () => {
    if (extractedAdminPrompts.length === 0) return;

    setIsAddingAdminPromptsToQueue(true);
    let promptsAdded = 0;
    const currentArtStyle = artStyles.find(style => style.value === selectedStyleValue) || artStyles[0];

    const newDisplayItemsBatch: DisplayItem[] = [];
    const newProcessingJobsBatch: PromptJob[] = [];

    for (const promptText of extractedAdminPrompts) {
      if (displayList.length + newDisplayItemsBatch.length >= MAX_PROMPTS_OVERALL) {
        toast({ title: "Límite General Alcanzado", description: `No se pueden agregar más de ${MAX_PROMPTS_OVERALL} elementos. ${promptsAdded} prompts fueron agregados.`, variant: "destructive", duration: 7000 });
        break;
      }
      const currentAiJobsInQueue = processingJobs.filter(j => j.type === 'prompt').length + newProcessingJobsBatch.length;
      if (currentAiJobsInQueue >= MAX_PROCESSING_JOBS) {
        toast({ title: "Límite de Prompts IA Alcanzado", description: `No se pueden agregar más de ${MAX_PROCESSING_JOBS} prompts de IA. ${promptsAdded} prompts fueron agregados.`, variant: "destructive", duration: 7000 });
        break;
      }

      const uniqueId = Date.now() + displayList.length + newDisplayItemsBatch.length + Math.random();
      const styledPrompt = `${promptText.trim()}${currentArtStyle.promptSuffix}`;
      const newJob: PromptJob = {
        id: uniqueId,
        type: 'prompt',
        originalPrompt: promptText.trim(),
        styledPrompt,
        status: 'pending',
        imageUrl: null,
        error: null,
        artStyleUsed: currentArtStyle.name,
      };
      newDisplayItemsBatch.push(newJob);
      newProcessingJobsBatch.push(newJob);
      promptsAdded++;
    }

    if (newDisplayItemsBatch.length > 0) {
      setDisplayList(prev => [...prev, ...newDisplayItemsBatch]);
    }
    if (newProcessingJobsBatch.length > 0) {
      setProcessingJobs(prev => [...prev, ...newProcessingJobsBatch]);
    }
    
    toast({ title: "Prompts Agregados", description: `${promptsAdded} prompts han sido añadidos a la cola principal.` });

    setExtractedAdminPrompts([]);
    // setAdminPromptAnalysisText(''); // Decidido mantener el texto por si el usuario quiere refinar el análisis.
    setIsAddingAdminPromptsToQueue(false);
    
    // Opcional: si no se está procesando, iniciar
    // const totalPending = processingJobs.filter(j => j.status === 'pending').length + newProcessingJobsBatch.filter(j => j.status === 'pending').length;
    // if (!isBatchProcessing && totalPending > 0 && (currentJobIndexInQueue === null || currentJobIndexInQueue >= (processingJobs.length - newProcessingJobsBatch.length))) {
    //    handleStartBatchProcessing();
    // }
  };


  const currentProcessingPromptJob = () => {
    if (isBatchProcessing && currentJobIndexInQueue !== null && currentJobIndexInQueue < processingJobs.length) {
      return processingJobs[currentJobIndexInQueue];
    }
    return null;
  };
  
  const canDownloadGenerated = !isBatchProcessing && displayList.some(item => item.type === 'prompt' && item.status === 'completed' && item.imageUrl && item.imageUrl.startsWith('data:image'));

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
  const canStartBatch = !isBatchProcessing && pendingAiJobsCount > 0 && !isDownloadingIndividual && !itemBeingRefined && !uploadingToDriveItemId;
  const aiJobsInQueueCount = processingJobs.filter(j => j.type === 'prompt').length;

  const canAddItem = !isBatchProcessing && 
                     !isInputEmpty() && 
                     !isDownloadingIndividual && 
                     !itemBeingRefined &&
                     !uploadingToDriveItemId &&
                     displayList.length < MAX_PROMPTS_OVERALL &&
                     (inputMode !== 'prompt_only' && inputMode !== 'title_prompt' || aiJobsInQueueCount < MAX_PROCESSING_JOBS || (inputMode === 'title_prompt' && !promptForTitleInput.trim() && titleInput.trim()));

  const showLoginForm = !isAuthenticated && (!isPasswordProtectionGloballyDisabled || showDirectAdminLogin);

  let currentGreeting = greetingMessage;
  let showAdminPanelInMenu = currentUserIsAdmin;
  let showLogoutInMenu = isAuthenticated && ! (isPasswordProtectionGloballyDisabled && !currentUserIsAdmin) ;
  let showLoginAdminInMenu = isPasswordProtectionGloballyDisabled && !currentUserIsAdmin;

  if (isPasswordProtectionGloballyDisabled && !currentUserIsAdmin && isAuthenticated) {
    currentGreeting = "Modo de Acceso Abierto. Funcionalidad completa disponible.";
  }


  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 font-body relative overflow-hidden">
      <FuturisticBackground />
      {isAuthenticated && showHeartAnimation && <HeartRain animationKey={heartAnimationKey} onAnimationEnd={() => setShowHeartAnimation(false)} />}
      {isAuthenticated && showTechEffect && <TechEffect animationKey={techEffectKey} onAnimationEnd={() => setShowTechEffect(false)} />}
      {isAuthenticated && showMusicVibes && <MusicVibes animationKey={musicVibesKey} onAnimationEnd={() => setShowMusicVibes(false)} />}
      {isAuthenticated && showAccessDeniedEffect && <AccessDeniedEffect animationKey={accessDeniedEffectKey} onAnimationEnd={() => setShowAccessDeniedEffect(false)} />}
      {isAuthenticated && showMoneyAnimation && <MoneyRain animationKey={moneyAnimationKey} onAnimationEnd={() => setShowMoneyAnimation(false)} />}
            
      {showLoginForm ? (
         <Card className="relative z-10 w-full max-w-md bg-card/90 backdrop-blur-sm shadow-2xl shadow-primary/30 rounded-xl">
           <CardHeader className="text-center px-6 pt-4 pb-3 space-y-2">
             <div className="flex items-center justify-center">
               <Lock className="text-primary w-10 h-10 mr-3" />
               <CardTitle className="text-3xl md:text-4xl font-headline tracking-tight">
                 {showDirectAdminLogin ? "Acceso Admin" : "Acceso Requerido"}
               </CardTitle>
             </div>
             <CardDescription className="text-muted-foreground text-sm md:text-base">
               {showDirectAdminLogin ? "Ingresa la contraseña de administrador." : "Por favor, ingresa la contraseña para continuar."}
             </CardDescription>
           </CardHeader>
           <CardContent>
             {areNonAdminPasswordsDisabled && !showDirectAdminLogin && !isPasswordProtectionGloballyDisabled ? (
               <div className="text-center space-y-4">
                 <p className="text-muted-foreground">El acceso general está deshabilitado.</p>
                 <Button 
                    onClick={() => {
                        setShowDirectAdminLogin(true); 
                        setAuthError(''); 
                        setPasswordInput('');
                    }} 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                 >
                   <Shield className="mr-2 h-5 w-5" /> Acceso de Administrador
                 </Button>
               </div>
             ) : (
               <form onSubmit={handlePasswordSubmit} className="space-y-6">
                 {showDirectAdminLogin && (
                   <p className="text-center font-semibold text-primary p-2 bg-primary/10 rounded-md">Modo de acceso: Solo Administrador</p>
                 )}
                 <div>
                   <Label htmlFor="passwordInput" className="block mb-2 text-sm font-medium text-accent">
                     Contraseña:
                   </Label>
                   <Input
                     id="passwordInput"
                     type="password"
                     className="w-full p-3 bg-background/70 border-primary border-2 rounded-lg focus-visible:ring-accent focus-visible:border-accent transition-all duration-300 ease-in-out placeholder:text-muted-foreground"
                     placeholder="********"
                     value={passwordInput}
                     onChange={(e) => setPasswordInput(e.target.value)}
                   />
                 </div>
                 {authError && (
                   <p className="text-sm text-destructive bg-destructive/20 p-2 rounded-md text-center">{authError}</p>
                 )}
                 <Button
                   type="submit"
                   className="w-full text-white font-semibold py-3 px-4 text-lg bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-primary/50"
                 >
                   <LogIn className="w-6 h-6 mr-2" /> {showDirectAdminLogin ? "Acceder como Admin" : "Ingresar"}
                 </Button>
                 {showDirectAdminLogin && (
                    <Button variant="outline" onClick={() => {setShowDirectAdminLogin(false); setAuthError(''); setPasswordInput('');}} className="w-full mt-2">
                        Volver al inicio de sesión normal
                    </Button>
                 )}
               </form>
             )}
           </CardContent>
         </Card>
      ) : (
        <>
        <div className="w-full max-w-3xl mt-16 sm:mt-0"> 
            <Card className="relative z-10 w-full bg-card/90 backdrop-blur-sm shadow-2xl shadow-primary/30 rounded-xl">
            <CardHeader className="text-center px-6 pt-4 pb-3 space-y-2">
              {currentGreeting && (
                <div className="relative p-2 bg-primary/10 border border-primary/30 rounded-lg">
                  <div className="absolute top-1/2 left-3 transform -translate-y-1/2 z-10">
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/20">
                           <MenuIcon className="h-5 w-5" />
                           <span className="sr-only">Abrir menú</span>
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="start">
                         <DropdownMenuItem onClick={toggleDarkMode} className="cursor-pointer">
                           {isDarkMode ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                           <span>Cambiar a tema {isDarkMode ? 'claro' : 'oscuro'}</span>
                         </DropdownMenuItem>
                         {showAdminPanelInMenu && (
                           <DropdownMenuItem onClick={() => setIsAdminPanelVisible(true)} className="cursor-pointer">
                             <ShieldCheck className="mr-2 h-4 w-4" />
                             <span>Panel de Administrador</span>
                           </DropdownMenuItem>
                         )}
                         {showLoginAdminInMenu && (
                            <DropdownMenuItem 
                                onClick={() => {
                                    setIsAuthenticated(false); 
                                    setShowDirectAdminLogin(true);
                                    setAuthError('');
                                    setPasswordInput('');
                                }} 
                                className="cursor-pointer"
                            >
                                <LogIn className="mr-2 h-4 w-4 text-primary" />
                                <span>Iniciar Sesión (Admin)</span>
                            </DropdownMenuItem>
                         )}
                         {(showLogoutInMenu || currentUserIsAdmin) && <DropdownMenuSeparator />}
                         {(showLogoutInMenu || currentUserIsAdmin) && (
                           <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive-foreground focus:bg-destructive">
                             <LogOut className="mr-2 h-4 w-4" />
                             <span>Cerrar Sesión</span>
                           </DropdownMenuItem>
                         )}
                       </DropdownMenuContent>
                     </DropdownMenu>
                  </div>
                  <p className="text-lg font-medium text-primary flex items-center justify-center text-center">
                    <Smile size={22} className="mr-2 text-accent" /> {currentGreeting}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-center">
                <Sparkles className="text-accent w-10 h-10 mr-3" />
                <CardTitle className="text-3xl md:text-4xl font-headline tracking-tight bg-gradient-to-r from-accent via-primary to-accent text-transparent bg-clip-text">
                  Chispart Generator
                </CardTitle>
              </div>
              <CardDescription className="text-muted-foreground text-sm md:text-base">
                Agrega URLs, títulos o prompts a la cola. Selecciona un estilo y procesa en lote para generar arte con IA.
                Puedes añadir hasta {MAX_PROMPTS_OVERALL} elementos en total, con un máximo de {MAX_PROCESSING_JOBS} prompts de IA por lote.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <main>
                <div className="mb-6">
                  <Label className="block mb-3 text-sm font-medium text-accent">Elige el tipo de entrada:</Label>
                  <RadioGroup
                    value={inputMode}
                    onValueChange={(value: string) => setInputMode(value as InputMode)}
                    className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0 mb-4"
                    disabled={isBatchProcessing || isDownloadingIndividual || !!itemBeingRefined || !!uploadingToDriveItemId}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="url" id="mode_url" />
                      <Label htmlFor="mode_url" className="flex items-center cursor-pointer"><LinkIcon size={16} className="mr-2 text-primary"/> URL de Imagen</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="title_prompt" id="mode_title_prompt" />
                      <Label htmlFor="mode_title_prompt" className="flex items-center cursor-pointer"><Type size={16} className="mr-2 text-primary"/> Título + Prompt</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="prompt_only" id="mode_prompt_only" />
                      <Label htmlFor="mode_prompt_only" className="flex items-center cursor-pointer"><MessageSquareText size={16} className="mr-2 text-primary"/> Solo Prompt</Label>
                    </div>
                  </RadioGroup>
                </div>

                {inputMode === 'url' && (
                  <div className="mb-6">
                    <Label htmlFor="urlInput" className="block mb-2 text-sm font-medium text-accent">
                      URL de la Imagen:
                    </Label>
                    <Input
                      id="urlInput"
                      type="url"
                      className="w-full p-3 bg-background/70 border-primary border-2 rounded-lg focus-visible:ring-accent focus-visible:border-accent transition-all duration-300 ease-in-out placeholder:text-muted-foreground"
                      placeholder="https://ejemplo.com/imagen.png"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      disabled={isBatchProcessing || isDownloadingIndividual || !!itemBeingRefined || !!uploadingToDriveItemId}
                    />
                  </div>
                )}

                {inputMode === 'title_prompt' && (
                  <>
                    <div className="mb-6">
                      <Label htmlFor="titleInput" className="block mb-2 text-sm font-medium text-accent">
                        Título (opcional, se añade como comentario):
                      </Label>
                      <Input
                        id="titleInput"
                        type="text"
                        className="w-full p-3 bg-background/70 border-primary border-2 rounded-lg focus-visible:ring-accent focus-visible:border-accent transition-all duration-300 ease-in-out placeholder:text-muted-foreground"
                        placeholder="Mi increíble título"
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        disabled={isBatchProcessing || isDownloadingIndividual || !!itemBeingRefined || !!uploadingToDriveItemId}
                      />
                    </div>
                    <div className="mb-6">
                      <Label htmlFor="promptForTitleInput" className="block mb-2 text-sm font-medium text-accent">
                        Prompt para IA (opcional si solo quieres añadir título):
                      </Label>
                      <Textarea
                        id="promptForTitleInput"
                        rows={3}
                        className="w-full p-3 bg-background/70 border-primary border-2 rounded-lg focus-visible:ring-accent focus-visible:border-accent transition-all duration-300 ease-in-out placeholder:text-muted-foreground resize-y"
                        placeholder="Descripción detallada para la IA..."
                        value={promptForTitleInput}
                        onChange={(e) => setPromptForTitleInput(e.target.value)}
                        disabled={isBatchProcessing || isDownloadingIndividual || !!itemBeingRefined || !!uploadingToDriveItemId || (aiJobsInQueueCount >= MAX_PROCESSING_JOBS && promptForTitleInput.length > 0)}
                      />
                       {aiJobsInQueueCount >= MAX_PROCESSING_JOBS && <p className="text-xs text-yellow-600 mt-1">Límite de prompts de IA ({MAX_PROCESSING_JOBS}) alcanzado para este lote.</p>}
                    </div>
                  </>
                )}

                {inputMode === 'prompt_only' && (
                  <div className="mb-6">
                    <Label htmlFor="singlePromptInput" className="block mb-2 text-sm font-medium text-accent">
                      Tu Prompt para IA:
                    </Label>
                    <Textarea
                      id="singlePromptInput"
                      rows={5}
                      className="w-full p-3 bg-background/70 border-primary border-2 rounded-lg focus-visible:ring-accent focus-visible:border-accent transition-all duration-300 ease-in-out placeholder:text-muted-foreground resize-y"
                      placeholder="Un gato cibernético en una ciudad lluviosa de neón..."
                      value={singlePromptInput}
                      onChange={(e) => setSinglePromptInput(e.target.value)}
                      disabled={isBatchProcessing || isDownloadingIndividual || !!itemBeingRefined || !!uploadingToDriveItemId || (aiJobsInQueueCount >= MAX_PROCESSING_JOBS && singlePromptInput.length > 0)}
                    />
                    {aiJobsInQueueCount >= MAX_PROCESSING_JOBS && <p className="text-xs text-yellow-600 mt-1">Límite de prompts de IA ({MAX_PROCESSING_JOBS}) alcanzado para este lote.</p>}
                  </div>
                )}

                <div className="mb-6">
                  <Label htmlFor="artStyle" className="block mb-2 text-sm font-medium text-accent flex items-center">
                    <Palette size={18} className="mr-2"/> Estilo de Arte (para prompts de IA):
                  </Label>
                  <Select 
                    value={selectedStyleValue} 
                    onValueChange={setSelectedStyleValue}
                    disabled={isBatchProcessing || isDownloadingIndividual || !!itemBeingRefined || !!uploadingToDriveItemId}
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
                
                <div className="mb-6">
                    <Button
                        onClick={handleAddItemToQueue}
                        disabled={!canAddItem}
                        className="w-full text-white font-semibold py-3 px-4 text-lg bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-primary/50 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                    >
                        <PlusCircle className="w-6 h-6 mr-2" /> Agregar a la Cola ({displayList.length}/{MAX_PROMPTS_OVERALL} total, {aiJobsInQueueCount}/{MAX_PROCESSING_JOBS} IA)
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Button
                    onClick={handleStartBatchProcessing}
                    disabled={!canStartBatch}
                    className="w-full text-white font-semibold py-3 px-4 text-lg focus:ring-4 focus:ring-accent/50 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed hover:bg-accent/90 bg-accent"
                  >
                    {isBatchProcessing ? <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Procesando Lote...</> : <><PlayCircle className="w-6 h-6 mr-2" /> Iniciar Procesamiento de Lote ({pendingAiJobsCount} IA)</>}
                  </Button>
                  <Button
                    onClick={handleDownloadAllImages}
                    disabled={!canDownloadGenerated || isDownloadingIndividual || isBatchProcessing || !!itemBeingRefined || !!uploadingToDriveItemId}
                    className="w-full text-white font-semibold py-3 px-4 text-lg focus:ring-4 focus:ring-primary/50 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed hover:bg-pink-600/90 bg-pink-500" 
                  >
                    {isDownloadingIndividual ? <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Descargando IA...</> : <><Download className="w-6 h-6 mr-2" /> Descargar Imágenes IA</>}
                  </Button>
                </div>
                
                {isBatchProcessing && currentProcessingPromptJob() && (
                  <div className="mt-6 p-3 text-accent-foreground bg-accent/80 rounded-md text-center text-sm">
                      Procesando IA ({currentProcessingPromptJob()?.artStyleUsed}) - Trabajo {Math.min((currentJobIndexInQueue ?? 0) + 1, processingJobs.length)} de {processingJobs.length}: "<em>{currentProcessingPromptJob()!.originalPrompt.substring(0,40)}...</em>"
                  </div>
                )}
                {!isBatchProcessing && displayList.length > 0 && processingJobs.length > 0 && (currentJobIndexInQueue !== null && currentJobIndexInQueue >= processingJobs.length) && pendingAiJobsCount === 0 && (
                      <div className="mt-6 p-3 text-green-700 bg-green-500/20 rounded-md text-center text-sm font-semibold">
                          ¡Procesamiento de lote IA completado!
                      </div>
                )}
                
                {displayList.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <h3 className="text-xl font-headline text-accent border-b-2 border-primary pb-2 mb-4">Cola de Procesamiento:</h3>
                    {displayList.map((item, index) => (
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
                              <p className="font-semibold text-sm text-yellow-500 mb-1">Entrada Omitida: <span className="text-muted-foreground font-normal">{item.text}</span></p>
                              <p className="text-xs text-yellow-600">{item.reason}</p>
                          </div>
                        )}
                        {item.type === 'prompt' && (
                          <div>
                            <p className="font-semibold text-sm text-accent mb-1">
                              <MessageSquareText size={18} className="inline mr-2 align-text-bottom" />
                              Prompt IA ({item.artStyleUsed || 'Estilo no especificado'}): <span className="text-foreground font-normal">{item.originalPrompt}</span>
                            </p>
                            {item.status === 'pending' && <p className="text-sm text-yellow-500 flex items-center mt-2"><Info size={16} className="mr-1"/> Pendiente IA...</p>}
                            {item.status === 'processing' && <p className="text-sm text-blue-500 flex items-center mt-2"><Loader2 size={16} className="mr-1 animate-spin"/> Procesando IA...</p>}
                            {item.status === 'refining' && <p className="text-sm text-purple-500 flex items-center mt-2"><Loader2 size={16} className="mr-1 animate-spin"/> Mejorando imagen IA...</p>}
                            {item.status === 'failed' && item.error && (
                              <div className="text-sm text-destructive-foreground p-2 bg-destructive/90 rounded mt-2">
                                <AlertTriangle size={16} className="inline mr-1" /> Error IA: {item.error}
                              </div>
                            )}
                            {item.status === 'completed' && item.imageUrl && (
                              <>
                                <div className="mt-3 p-1 border-2 border-dashed border-primary/60 rounded-md bg-background/40">
                                  <img src={item.imageUrl} alt={`Generado por IA para: ${item.originalPrompt} (${item.artStyleUsed})`} className="w-full h-auto rounded object-contain max-h-[40vh]" data-ai-hint="generated art" />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {!itemBeingRefined && !isBatchProcessing && !isDownloadingIndividual && !uploadingToDriveItemId &&(
                                    <Button onClick={() => handleStartRefinement(item)} size="sm" variant="outline" className="mt-3 border-accent text-accent hover:bg-accent/10">
                                      <Wand2 className="mr-2 h-4 w-4" /> Mejorar Imagen
                                    </Button>
                                  )}
                                  {!isBatchProcessing && !isDownloadingIndividual && !itemBeingRefined && (
                                      <Button
                                        onClick={() => handleUploadToDrive(item)}
                                        disabled={uploadingToDriveItemId === item.id || !googleDriveApiLoaded || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
                                        size="sm"
                                        variant="outline"
                                        className="mt-3 border-blue-500 text-blue-500 hover:text-blue-700 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                                        title={!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? "Google Client ID no configurado" : (isGoogleDriveAuthenticated ? "Subir a Google Drive" : "Autenticar con Google Drive para subir")}
                                      >
                                        {uploadingToDriveItemId === item.id ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                          <UploadCloud className="mr-2 h-4 w-4" />
                                        )}
                                        {isGoogleDriveAuthenticated ? 'Subir a Drive' : 'Autenticar y Subir'}
                                      </Button>
                                  )}
                                </div>
                                 {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && googleDriveApiLoaded === false && (
                                    <p className="text-xs text-yellow-600 mt-1">La subida a Google Drive está deshabilitada porque Google Client ID no está configurado en las variables de entorno.</p>
                                 )}
                              </>
                            )}
                            {itemBeingRefined?.id === item.id && (
                              <div className="mt-4 p-3 border border-dashed border-accent/70 rounded-lg bg-card/50">
                                <Label htmlFor={`refine-${item.id}`} className="text-sm font-medium text-accent flex items-center mb-2">
                                  <Wand2 size={16} className="mr-2"/> Prompt de Mejora:
                                </Label>
                                <Textarea
                                  id={`refine-${item.id}`}
                                  value={refinementPromptText}
                                  onChange={(e) => setRefinementPromptText(e.target.value)}
                                  placeholder="Ej: hacerlo más oscuro, añadir un gato, cambiar el color del cielo..."
                                  rows={2}
                                  className="my-2 bg-background/70 border-accent/50 focus-visible:border-accent"
                                  disabled={isSubmittingRefinement}
                                />
                                <div className="flex gap-2 mt-2">
                                  <Button onClick={handleSubmitRefinement} size="sm" disabled={isSubmittingRefinement || !refinementPromptText.trim()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                                    {isSubmittingRefinement ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />} Aplicar Mejora
                                  </Button>
                                  <Button onClick={handleCancelRefinement} size="sm" variant="ghost" disabled={isSubmittingRefinement}>
                                    Cancelar
                                  </Button>
                                </div>
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

          {isAdminPanelVisible && currentUserIsAdmin && (
            <Card className="mt-6 relative z-10 w-full bg-card/90 backdrop-blur-sm shadow-xl shadow-primary/40 rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center text-2xl text-primary">
                    <ShieldCheck className="mr-3 h-7 w-7"/> Panel de Administrador
                </CardTitle>
                <CardDescription>
                  Gestionar la disponibilidad de las contraseñas, el acceso global y herramientas de generación.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                    <Label className="flex items-center text-md font-medium text-primary mb-2">
                        <GlobeLock className="mr-2 h-5 w-5"/> Protección Global por Contraseña
                    </Label>
                    <Button
                        onClick={handleToggleGlobalProtection}
                        variant={isPasswordProtectionGloballyDisabled ? "default" : "destructive"}
                        className="w-full"
                    >
                        {isPasswordProtectionGloballyDisabled ? 
                            <><CheckCircle className="mr-2 h-5 w-5"/> {globalProtectionButtonText}</> : 
                            <><Lock className="mr-2 h-5 w-5"/> {globalProtectionButtonText}</>
                        }
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                        {isPasswordProtectionGloballyDisabled ? 
                            "La aplicación está actualmente en modo de acceso abierto. Cualquiera puede usarla sin contraseña." :
                            "La aplicación requiere contraseña para acceder. Desactiva para permitir acceso público."
                        }
                    </p>
                </div>

                <h4 className="text-lg font-semibold text-accent pt-2 border-t border-border">Contraseñas Individuales:</h4>
                {Object.entries(allPasswordConfigs)
                  .filter(([key, config]) => !config.isAdmin)
                  .map(([key, config]) => (
                    <div 
                      key={key} 
                      className={cn(
                        "flex items-center justify-between p-3 bg-background/60 rounded-lg border border-border hover:border-primary/50 transition-colors",
                        isPasswordProtectionGloballyDisabled && "opacity-50 cursor-not-allowed" 
                      )}
                    >
                      <div className="flex flex-col">
                        <Label htmlFor={`switch-${key}`} className="text-md font-medium text-foreground cursor-pointer">
                          {key}
                        </Label>
                        <span className="text-xs text-muted-foreground">"{config.greeting}"</span>
                      </div>
                      <Switch
                        id={`switch-${key}`}
                        checked={config.isEnabledGlobal}
                        onCheckedChange={(checked) => togglePasswordGlobalEnable(key, checked)}
                        aria-label={`Habilitar o deshabilitar contraseña ${key}`}
                        disabled={isPasswordProtectionGloballyDisabled}
                      />
                    </div>
                ))}

                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-lg font-semibold text-accent mb-2 flex items-center">
                    <ListChecks className="mr-2 h-5 w-5" /> Análisis de Texto para Prompts
                  </h4>
                  {!showAdminPromptAnalyzer && (
                    <Button onClick={() => setShowAdminPromptAnalyzer(true)} className="w-full">
                      Iniciar Análisis de Texto
                    </Button>
                  )}
                  {showAdminPromptAnalyzer && (
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Pega aquí el texto que contiene los prompts..."
                        rows={8}
                        value={adminPromptAnalysisText}
                        onChange={(e) => setAdminPromptAnalysisText(e.target.value)}
                        disabled={isAnalyzingText || extractedAdminPrompts.length > 0 || isAddingAdminPromptsToQueue}
                        className="bg-background/70 border-primary focus-visible:ring-accent focus-visible:border-accent"
                      />
                      {extractedAdminPrompts.length === 0 && (
                        <Button
                          onClick={handleAnalyzeTextForPrompts}
                          disabled={!adminPromptAnalysisText.trim() || isAnalyzingText || isAddingAdminPromptsToQueue}
                          className="w-full"
                        >
                          {isAnalyzingText ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
                          Extraer Prompts del Texto
                        </Button>
                      )}

                      {extractedAdminPrompts.length > 0 && (
                        <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                          <h5 className="text-md font-medium text-primary mb-2">Prompts Detectados:</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm text-foreground">
                            {extractedAdminPrompts.map((p, idx) => (
                              <li key={idx}>{p}</li>
                            ))}
                          </ul>
                          <div className="flex gap-2 mt-4">
                            <Button
                              onClick={handleAddAdminPromptsToQueue}
                              disabled={isAddingAdminPromptsToQueue}
                              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                            >
                              {isAddingAdminPromptsToQueue ? <Loader2 className="animate-spin mr-2" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                              Generar Imágenes ({extractedAdminPrompts.length})
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setExtractedAdminPrompts([]);
                                // No limpiar adminPromptAnalysisText aquí para permitir refinar el análisis si es necesario
                              }}
                              disabled={isAddingAdminPromptsToQueue}
                            >
                              Analizar de Nuevo
                            </Button>
                          </div>
                        </div>
                      )}
                       <Button variant="outline" onClick={() => {
                        setShowAdminPromptAnalyzer(false);
                        setAdminPromptAnalysisText('');
                        setExtractedAdminPrompts([]);
                        setIsAnalyzingText(false);
                        setIsAddingAdminPromptsToQueue(false);
                      }} className="w-full">
                        Cerrar Analizador
                      </Button>
                    </div>
                  )}
                </div>


                <Button 
                  variant="outline" 
                  onClick={() => setIsAdminPanelVisible(false)} 
                  className="w-full mt-4 border-primary text-primary hover:bg-primary/10 hover:text-primary"
                >
                    <LogOut className="mr-2 h-4 w-4"/> Ocultar Panel de Admin
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
        </>
      )}
    </div>
  );
};

export default ImageGeneratorApp;


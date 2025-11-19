import { useState, useEffect, useCallback } from "react";
import { AppCard } from "@/components/AppCard";
import { AppItem, AppsData } from "@/types/app";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { FileOpener } from '@capacitor-community/file-opener';
import { App as CapacitorApp } from '@capacitor/app';
import { AppLauncher } from '@capacitor/app-launcher';

// Configure your JSON URL here
const APPS_JSON_URL = "https://raw.githubusercontent.com/pmpp-smcis/apoio/refs/heads/main/apps.json";
const LOCAL_FALLBACK_JSON = "/apps-example.json";

const Index = () => {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [installedApps, setInstalledApps] = useState<Set<string>>(new Set());
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchApps();
  }, []);

  // Verificar apps instalados
  useEffect(() => {
    const checkInstalledApps = async () => {
      if (!Capacitor.isNativePlatform() || apps.length === 0) return;

      const installed = new Set<string>();

      for (const app of apps) {
        try {
          const { value } = await AppLauncher.canOpenUrl({ url: app.packageName });
          if (value) {
            installed.add(app.packageName);
          }
        } catch (error) {
          console.log(`Não foi possível verificar ${app.packageName}:`, error);
        }
      }

      setInstalledApps(installed);
    };

    checkInstalledApps();
  }, [apps]);

  // Back button handler - duplo clique para sair
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backPressCount = 0;
    let backPressTimer: NodeJS.Timeout;

    const setupBackHandler = async () => {
      const backHandler = await CapacitorApp.addListener('backButton', () => {
        backPressCount++;

        if (backPressCount === 1) {
          toast({
            title: "Pressione novamente para sair",
            duration: 2000,
          });

          backPressTimer = setTimeout(() => {
            backPressCount = 0;
          }, 2000);
        } else if (backPressCount === 2) {
          clearTimeout(backPressTimer);
          CapacitorApp.exitApp();
        }
      });

      return () => {
        backHandler.remove();
      };
    };

    let cleanup: (() => void) | undefined;
    setupBackHandler().then(fn => { cleanup = fn; });

    return () => {
      if (cleanup) cleanup();
    };
  }, [toast]);

  const fetchApps = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔵 Buscando apps de:', APPS_JSON_URL);
      
      // Use CapacitorHttp for native platform, fetch for web
      if (Capacitor.isNativePlatform()) {
        const response = await CapacitorHttp.get({
          url: APPS_JSON_URL,
          responseType: 'json',
          connectTimeout: 10000,
          readTimeout: 10000,
        });
        
        console.log('🔵 Response status:', response.status);
        
        if (response.status === 200) {
          const data: AppsData = response.data;
          console.log('🔵 Apps carregados:', data.apps?.length || 0);
          setApps(data.apps || []);
          setHeaderImage(data.headerImage || null);
          return;
        }
        
        throw new Error(`HTTP ${response.status}`);
      } else {
        // Web fallback using fetch
        const response = await fetch(APPS_JSON_URL);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data: AppsData = await response.json();
        setApps(data.apps || []);
        setHeaderImage(data.headerImage || null);
      }
    } catch (err) {
      console.error('❌ Erro ao buscar apps:', err);
      
      // Try local fallback
      try {
        console.log('🔵 Tentando fallback local...');
        const fallbackResponse = await fetch(LOCAL_FALLBACK_JSON);
        
        if (fallbackResponse.ok) {
          const data: AppsData = await fallbackResponse.json();
          setApps(data.apps || []);
          setHeaderImage(data.headerImage || null);
          toast({
            title: "Modo Offline",
            description: "Usando lista de apps local",
          });
          return;
        }
      } catch (fallbackErr) {
        console.error('❌ Fallback também falhou:', fallbackErr);
      }
      
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      toast({
        title: "Erro ao carregar apps",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = useCallback(async (app: AppItem) => {
    if (!Capacitor.isNativePlatform()) {
      // Fallback for web
      window.open(app.apkUrl, "_blank");
      return;
    }

    try {
      console.log('🔵 Iniciando instalação:', app.name);
      console.log('🔵 URL do APK:', app.apkUrl);
      
      toast({
        title: "Baixando...",
        description: `Iniciando download de ${app.name}`,
      });

      // Usar CapacitorHttp que vem embutido no core
      console.log('🔵 Iniciando download via CapacitorHttp...');
      
      const response = await CapacitorHttp.get({
        url: app.apkUrl,
        responseType: 'blob',
        connectTimeout: 60000,
        readTimeout: 60000,
      });
      
      console.log('🔵 Download concluído via CapacitorHttp');
      console.log('🔵 Response status:', response.status);
      
      if (response.status !== 200) {
        throw new Error(`Erro HTTP ${response.status}`);
      }
      
      // O CapacitorHttp já retorna em base64 quando responseType é blob
      const base64 = response.data;
      console.log('🔵 Dados recebidos, tamanho:', base64.length);
      
      // Save to device
      const fileName = `${app.packageName}.apk`;
      console.log('🔵 Salvando arquivo:', fileName);
      
      // Criar diretório Download se não existir
      try {
        await Filesystem.mkdir({
          path: 'Download',
          directory: Directory.ExternalStorage,
          recursive: true
        });
      } catch (e) {
        console.log('🔵 Diretório Download já existe ou erro ao criar:', e);
      }
      
      const result = await Filesystem.writeFile({
        path: `Download/${fileName}`,
        data: base64,
        directory: Directory.ExternalStorage,
        recursive: true
      });

      console.log('🔵 Arquivo salvo em:', result.uri);

      toast({
        title: "Download concluído",
        description: "Abrindo instalador...",
      });

      console.log('🔵 Abrindo FileOpener...');
      
      // Open APK with native installer
      await FileOpener.open({
        filePath: result.uri,
        contentType: 'application/vnd.android.package-archive',
      });
      
      console.log('🔵 FileOpener aberto com sucesso');
      
      toast({
        title: "Instalador aberto",
        description: `Siga as instruções para instalar ${app.name}`,
      });

      // Verificar múltiplas vezes se o app foi instalado
      const checkIntervals = [3000, 6000, 10000, 15000, 20000, 30000];
      let installed = false;
      
      checkIntervals.forEach((interval) => {
        setTimeout(async () => {
          if (installed) return; // Já detectou, não precisa continuar
          
          try {
            const { value } = await AppLauncher.canOpenUrl({ url: app.packageName });
            if (value && !installed) {
              installed = true;
              setInstalledApps(prev => new Set(prev).add(app.packageName));
              toast({
                title: "Instalação detectada!",
                description: `${app.name} foi instalado com sucesso`,
              });
            }
          } catch (e) {
            console.log('Verificando instalação:', e);
          }
        }, interval);
      });
    } catch (error) {
      console.error('❌ Erro na instalação:', error);
      console.error('❌ Stack:', error instanceof Error ? error.stack : 'N/A');
      
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao baixar/instalar o app",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Keyboard navigation for D-pad
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (apps.length === 0) return;
      
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, apps.length - 1));
          break;
          
        case "ArrowLeft":
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
          
        case "ArrowDown":
          e.preventDefault();
          const cols = Math.floor(window.innerWidth / 320);
          setFocusedIndex((prev) => Math.min(prev + cols, apps.length - 1));
          break;
          
        case "ArrowUp":
          e.preventDefault();
          const colsUp = Math.floor(window.innerWidth / 320);
          setFocusedIndex((prev) => Math.max(prev - colsUp, 0));
          break;
          
        case "Enter":
          e.preventDefault();
          if (apps[focusedIndex]) {
            handleInstall(apps[focusedIndex]);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [apps, focusedIndex, handleInstall]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-lg">Carregando apps...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-destructive text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-foreground">Erro ao Carregar</h2>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">
            Configure a URL do JSON em: <code className="bg-muted px-2 py-1 rounded">src/pages/Index.tsx</code>
          </p>
        </div>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Nenhum app disponível</h2>
          <p className="text-muted-foreground">
            Adicione apps ao seu arquivo JSON
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8 pt-16 pb-16">
      <header className="mb-12 text-center">
        {headerImage ? (
          <img 
            src={headerImage} 
            alt="Header" 
            className="w-full max-w-4xl mx-auto rounded-lg mb-4"
          />
        ) : (
          <>
            <h1 className="text-5xl font-bold text-foreground mb-4">
              Loja de Apps
            </h1>
            <p className="text-xl text-muted-foreground">
              Use as setas do controle para navegar • Enter para instalar
            </p>
          </>
        )}
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 max-w-[1800px] mx-auto">
        {apps.map((app, index) => (
          <AppCard
            key={app.id}
            app={app}
            onInstall={handleInstall}
            isFocused={focusedIndex === index}
            onFocus={() => setFocusedIndex(index)}
            isInstalled={installedApps.has(app.packageName)}
          />
        ))}
      </div>
    </div>
  );
};

export default Index;

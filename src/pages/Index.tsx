import { useState, useEffect, useCallback } from "react";
import { AppCard } from "@/components/AppCard";
import { AppItem } from "@/types/app";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { FileOpener } from '@capacitor-community/file-opener';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

// Configure your JSON URL here
const APPS_JSON_URL = "https://raw.githubusercontent.com/pmpp-smcis/apoio/refs/heads/main/apps.json";
const LOCAL_FALLBACK_JSON = "/apps-example.json";

const Index = () => {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [focusedButton, setFocusedButton] = useState<'install' | 'uninstall'>('install');
  const [installedApps, setInstalledApps] = useState<Set<string>>(() => {
    // Carregar apps instalados do localStorage
    const stored = localStorage.getItem('installedApps');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchApps();
  }, []);

  // Salvar no localStorage sempre que a lista mudar
  useEffect(() => {
    localStorage.setItem('installedApps', JSON.stringify([...installedApps]));
  }, [installedApps]);

  const markAsInstalled = (packageName: string) => {
    setInstalledApps(prev => new Set([...prev, packageName]));
  };

  const markAsUninstalled = (packageName: string) => {
    setInstalledApps(prev => {
      const newSet = new Set(prev);
      newSet.delete(packageName);
      return newSet;
    });
  };

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
          const data = response.data;
          console.log('🔵 Apps carregados:', data.apps?.length || 0);
          setApps(data.apps || []);
          return;
        }
        
        throw new Error(`HTTP ${response.status}`);
      } else {
        // Web fallback using fetch
        const response = await fetch(APPS_JSON_URL);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        setApps(data.apps || []);
      }
    } catch (err) {
      console.error('❌ Erro ao buscar apps:', err);
      
      // Try local fallback
      try {
        console.log('🔵 Tentando fallback local...');
        const fallbackResponse = await fetch(LOCAL_FALLBACK_JSON);
        
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          setApps(data.apps || []);
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

      // Usar CapacitorHttp que vem embutido no core - contorna restrições de CORS
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
      
      // Save to device - usar ExternalStorage para Downloads
      const fileName = `${app.packageName}.apk`;
      console.log('🔵 Salvando arquivo:', fileName);
      
      // Primeiro, tentar criar o diretório Download se não existir
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
      
      // Marcar como instalado
      markAsInstalled(app.packageName);
      
      toast({
        title: "App instalado",
        description: `${app.name} foi marcado como instalado`,
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

  const handleUninstall = useCallback(async (app: AppItem) => {
    if (!Capacitor.isNativePlatform()) {
      toast({
        title: "Não disponível",
        description: "Desinstalação só funciona no app Android",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🔵 Iniciando desinstalação:', app.name, app.packageName);
      
      // Usar Browser plugin do Capacitor para abrir o intent de desinstalação
      const uninstallUrl = `package:${app.packageName}`;
      
      await Browser.open({
        url: uninstallUrl,
        presentationStyle: 'popover'
      });
      
      toast({
        title: "Desinstalando...",
        description: `Confirme a desinstalação de ${app.name} nas configurações`,
      });

      // Marcar como desinstalado após um delay
      setTimeout(() => {
        markAsUninstalled(app.packageName);
        toast({
          title: "App removido da lista",
          description: `${app.name} foi marcado como desinstalado`,
        });
      }, 3000);
      
    } catch (error) {
      console.error('❌ Erro ao desinstalar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a desinstalação",
        variant: "destructive",
      });
    }
  }, [toast, markAsUninstalled]);

  // Keyboard navigation for D-pad
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (apps.length === 0) return;

      const cols = Math.floor(window.innerWidth / 320); // Approximate columns
      const currentApp = apps[focusedIndex];
      const hasUninstallButton = currentApp && installedApps.has(currentApp.packageName);
      
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, apps.length - 1));
          setFocusedButton('install');
          break;
        case "ArrowLeft":
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          setFocusedButton('install');
          break;
        case "ArrowDown":
          e.preventDefault();
          // Se estamos no botão instalar e existe botão desinstalar, focar no desinstalar
          if (focusedButton === 'install' && hasUninstallButton) {
            setFocusedButton('uninstall');
          } else {
            // Senão, mover para o próximo card
            setFocusedIndex((prev) => Math.min(prev + cols, apps.length - 1));
            setFocusedButton('install');
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          // Se estamos no botão desinstalar, voltar para instalar
          if (focusedButton === 'uninstall') {
            setFocusedButton('install');
          } else {
            // Senão, mover para o card anterior
            setFocusedIndex((prev) => Math.max(prev - cols, 0));
            setFocusedButton('install');
          }
          break;
        case "Enter":
          e.preventDefault();
          if (apps[focusedIndex]) {
            if (focusedButton === 'install') {
              handleInstall(apps[focusedIndex]);
            } else if (focusedButton === 'uninstall') {
              handleUninstall(apps[focusedIndex]);
            }
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [apps, focusedIndex, focusedButton, installedApps, handleInstall, handleUninstall]);

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
    <div className="min-h-screen bg-background p-8">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-foreground mb-4">
          Loja de Apps
        </h1>
        <p className="text-xl text-muted-foreground">
          Use as setas do controle para navegar • Enter para instalar
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 max-w-[1800px] mx-auto">
        {apps.map((app, index) => (
          <AppCard
            key={app.id}
            app={app}
            onInstall={handleInstall}
            onUninstall={handleUninstall}
            isInstalled={installedApps.has(app.packageName)}
            isFocused={focusedIndex === index}
            onFocus={() => {
              setFocusedIndex(index);
              setFocusedButton('install');
            }}
            focusedButton={focusedIndex === index ? focusedButton : undefined}
            onButtonFocus={(button) => setFocusedButton(button)}
          />
        ))}
      </div>
    </div>
  );
};

export default Index;

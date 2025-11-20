import { registerPlugin } from '@capacitor/core';

export interface LargeFileDownloaderPlugin {
  /**
   * Baixa um arquivo grande usando o DownloadManager nativo do Android
   */
  download(options: {
    url: string;
    fileName: string;
    title: string;
    description: string;
  }): Promise<{ id: string }>;

  /**
   * Obtém o status de um download
   */
  getStatus(options: { id: string }): Promise<{
    status: 'pending' | 'running' | 'completed' | 'failed';
    bytesDownloaded: number;
    totalBytes: number;
    filePath?: string;
  }>;

  /**
   * Cancela um download
   */
  cancel(options: { id: string }): Promise<void>;

  /**
   * Adiciona listener para eventos de progresso
   */
  addListener(
    eventName: 'progress',
    listenerFunc: (info: {
      id: string;
      bytesDownloaded: number;
      totalBytes: number;
      progress: number;
    }) => void
  ): Promise<{ remove: () => void }>;

  /**
   * Adiciona listener para quando o download completar
   */
  addListener(
    eventName: 'completed',
    listenerFunc: (info: {
      id: string;
      filePath: string;
    }) => void
  ): Promise<{ remove: () => void }>;

  /**
   * Adiciona listener para quando o download falhar
   */
  addListener(
    eventName: 'failed',
    listenerFunc: (info: {
      id: string;
      error: string;
    }) => void
  ): Promise<{ remove: () => void }>;
}

const LargeFileDownloader = registerPlugin<LargeFileDownloaderPlugin>('LargeFileDownloader', {
  web: () => import('./LargeFileDownloaderWeb').then(m => new m.LargeFileDownloaderWeb()),
});

export default LargeFileDownloader;

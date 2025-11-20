import { WebPlugin } from '@capacitor/core';
import type { LargeFileDownloaderPlugin } from './LargeFileDownloader';

export class LargeFileDownloaderWeb extends WebPlugin implements LargeFileDownloaderPlugin {
  async download(options: { url: string; fileName: string; title: string; description: string }): Promise<{ id: string }> {
    // Fallback para web: abrir link em nova aba
    window.open(options.url, '_blank');
    return { id: 'web-' + Date.now() };
  }

  async getStatus(options: { id: string }): Promise<any> {
    return {
      status: 'completed',
      bytesDownloaded: 0,
      totalBytes: 0,
    };
  }

  async cancel(options: { id: string }): Promise<void> {
    // Não implementado para web
  }

  async addListener(eventName: string, listenerFunc: any): Promise<{ remove: () => Promise<void> }> {
    // Não implementado para web
    return {
      remove: async () => {},
    };
  }
}

/// <reference types="vite/client" />

declare global {
  interface Window {
    ipcRenderer: import('electron').IpcRenderer
    xtreamApi: {
      request(url: string): Promise<unknown>
    }
  }

  namespace JSX {
    interface IntrinsicElements {
      'mpegts-video': import('react').DetailedHTMLProps<
        import('react').HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string
        controls?: boolean
        autoplay?: boolean
        muted?: boolean
        preload?: string
      }
    }
  }
}

export {}

/// <reference types="vite/client" />

type MpegTsVideoElementProps = import('react').DetailedHTMLProps<
  import('react').HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  src?: string
  controls?: boolean
  autoplay?: boolean
  muted?: boolean
  preload?: string
}

declare global {
  interface Window {
    ipcRenderer: import('electron').IpcRenderer
    xtreamApi: {
      request(url: string): Promise<unknown>
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mpegts-video': MpegTsVideoElementProps
    }
  }
}

export {}

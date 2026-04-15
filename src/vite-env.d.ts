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
    xtreamApi: {
      request(payload: {
        baseUrl: string
        username: string
        password: string
        params?: Record<string, string>
      }): Promise<unknown>
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

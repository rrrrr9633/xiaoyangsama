/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AMAP_KEY?: string;
  readonly VITE_AMAP_SERVICE_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    _AMapSecurityConfig?: { serviceHost: string };
    AMap?: {
      Map: new (container: HTMLElement, options: { zoom: number; center: [number, number]; viewMode?: string }) => { destroy: () => void; setFitView?: (overlays?: unknown[]) => void };
      Marker: new (options: { position: [number, number]; title?: string; content?: string; anchor?: string }) => { setMap: (map: unknown) => void };
      Polyline: new (options: { path: [number, number][]; strokeColor: string; strokeWeight: number; strokeOpacity: number; strokeStyle?: string; lineJoin?: string }) => { setMap: (map: unknown) => void };
    };
  }
}

export {};

/**
 * Pipeline de composition vidéo : flou d'arrière-plan (MediaPipe Selfie Segmentation)
 * + incrustation logo en haut à gauche.
 *
 * Le composer prend un MediaStream caméra brut et produit un nouveau MediaStream
 * (canvas.captureStream + audio tracks d'origine) à enregistrer avec MediaRecorder.
 */

import {
  ImageSegmenter,
  FilesetResolver,
  type ImageSegmenterResult,
} from "@mediapipe/tasks-vision";

export interface ComposerOptions {
  blurBackground: boolean;
  showLogo: boolean;
  /** Si true, applique un miroir (uniquement visuel, sur l'aperçu canvas). */
  mirrorPreview: boolean;
  /** Intensité du flou d'arrière-plan en pixels (par défaut 12). */
  blurPx?: number;
  /** Facteur d'échelle appliqué au logo (1 = taille par défaut). */
  logoScale?: number;
}

const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 720;
const TARGET_FPS = 30;
const DEFAULT_BLUR_PX = 12;
const LOGO_HEIGHT_RATIO = 0.1; // 10% de la hauteur
const LOGO_PADDING = 24;

let segmenterPromise: Promise<ImageSegmenter | null> | null = null;

async function loadSegmenter(): Promise<ImageSegmenter | null> {
  if (segmenterPromise) return segmenterPromise;
  segmenterPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
      );
      const seg = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
      return seg;
    } catch (err) {
      console.warn("[videoComposer] segmenter init failed", err);
      return null;
    }
  })();
  return segmenterPromise;
}

export function isBlurSupported(): boolean {
  // captureStream + WebGL requis. Test minimal côté navigateur.
  if (typeof HTMLCanvasElement === "undefined") return false;
  if (typeof (HTMLCanvasElement.prototype as unknown as { captureStream?: () => unknown }).captureStream !== "function")
    return false;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    return !!gl;
  } catch {
    return false;
  }
}

export class VideoComposer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private maskCanvas: HTMLCanvasElement;
  private maskCtx: CanvasRenderingContext2D;
  private video: HTMLVideoElement;
  private rafId: number | null = null;
  private segmenter: ImageSegmenter | null = null;
  private sourceStream: MediaStream;
  private outputStream: MediaStream | null = null;
  private logoImg: HTMLImageElement | null = null;
  private options: ComposerOptions;
  private destroyed = false;
  private lastFrameTime = 0;
  private frameInterval = 1000 / TARGET_FPS;

  constructor(sourceStream: MediaStream, options: ComposerOptions) {
    this.sourceStream = sourceStream;
    this.options = { ...options };
    this.canvas = document.createElement("canvas");
    this.canvas.width = TARGET_WIDTH;
    this.canvas.height = TARGET_HEIGHT;
    this.ctx = this.canvas.getContext("2d", { alpha: false })!;
    this.maskCanvas = document.createElement("canvas");
    this.maskCanvas.width = TARGET_WIDTH;
    this.maskCanvas.height = TARGET_HEIGHT;
    this.maskCtx = this.maskCanvas.getContext("2d", { alpha: true })!;

    this.video = document.createElement("video");
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.srcObject = sourceStream;
  }

  async init(logoUrl: string | null): Promise<void> {
    await this.video.play().catch(() => {});
    if (this.options.blurBackground) {
      this.segmenter = await loadSegmenter();
      if (!this.segmenter) {
        // Fallback : désactive le flou si le modèle n'a pas chargé
        this.options.blurBackground = false;
      }
    }
    if (logoUrl) {
      this.logoImg = await loadImage(logoUrl).catch(() => null);
    }
    this.loop();
  }

  setOptions(opts: Partial<ComposerOptions>) {
    this.options = { ...this.options, ...opts };
    if (this.options.blurBackground && !this.segmenter) {
      // Charge à la volée
      void loadSegmenter().then((seg) => {
        if (!this.destroyed) this.segmenter = seg;
        if (!seg) this.options.blurBackground = false;
      });
    }
  }

  async setLogoUrl(url: string | null) {
    if (!url) {
      this.logoImg = null;
      return;
    }
    this.logoImg = await loadImage(url).catch(() => null);
  }

  /** Retourne le canvas pour l'aperçu (à insérer dans le DOM). */
  getPreviewCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /** Retourne un MediaStream composite (canvas vidéo + audio source). */
  getOutputStream(): MediaStream {
    if (!this.outputStream) {
      const canvasStream = (this.canvas as HTMLCanvasElement & {
        captureStream: (fps?: number) => MediaStream;
      }).captureStream(TARGET_FPS);
      const audioTracks = this.sourceStream.getAudioTracks();
      this.outputStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioTracks,
      ]);
    }
    return this.outputStream;
  }

  destroy() {
    this.destroyed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    try {
      this.video.pause();
      this.video.srcObject = null;
    } catch {
      /* noop */
    }
    if (this.outputStream) {
      this.outputStream.getTracks().forEach((t) => t.stop());
      this.outputStream = null;
    }
  }

  private loop = () => {
    if (this.destroyed) return;
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    if (elapsed >= this.frameInterval) {
      this.lastFrameTime = now - (elapsed % this.frameInterval);
      this.renderFrame(now);
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  private renderFrame(now: number) {
    const v = this.video;
    if (v.readyState < 2 || v.videoWidth === 0) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Calcul du recadrage "cover" (comme object-fit: cover)
    const srcAR = v.videoWidth / v.videoHeight;
    const dstAR = w / h;
    let sx = 0, sy = 0, sw = v.videoWidth, sh = v.videoHeight;
    if (srcAR > dstAR) {
      // source plus large : crop horizontal
      sw = v.videoHeight * dstAR;
      sx = (v.videoWidth - sw) / 2;
    } else {
      sh = v.videoWidth / dstAR;
      sy = (v.videoHeight - sh) / 2;
    }

    ctx.save();
    if (this.options.mirrorPreview) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    if (this.options.blurBackground && this.segmenter) {
      const blurPx = Math.max(0, this.options.blurPx ?? DEFAULT_BLUR_PX);
      // 1) Dessine le fond flouté plein cadre
      ctx.filter = `blur(${blurPx}px)`;
      ctx.drawImage(v, sx, sy, sw, sh, -blurPx, -blurPx, w + 2 * blurPx, h + 2 * blurPx);
      ctx.filter = "none";

      // 2) Segmente sur la frame source (confidence mask = proba foreground)
      try {
        const result: ImageSegmenterResult = this.segmenter.segmentForVideo(v, now);
        const masks = result.confidenceMasks;
        const mask = masks && masks.length > 0 ? masks[masks.length - 1] : null;
        if (mask) {
          const data = mask.getAsFloat32Array();
          const mw = mask.width;
          const mh = mask.height;
          // Détermine la convention en mesurant la zone centrale (probablement sujet) :
          // si la moyenne y est faible, c'est que cette valeur représente le background → on inverse.
          let centerSum = 0;
          let centerCount = 0;
          const cx0 = Math.floor(mw * 0.4);
          const cx1 = Math.floor(mw * 0.6);
          const cy0 = Math.floor(mh * 0.4);
          const cy1 = Math.floor(mh * 0.6);
          for (let y = cy0; y < cy1; y++) {
            for (let x = cx0; x < cx1; x++) {
              centerSum += data[y * mw + x];
              centerCount++;
            }
          }
          const centerAvg = centerCount > 0 ? centerSum / centerCount : 0.5;
          const invert = centerAvg < 0.5;
          const imgData = this.maskCtx.createImageData(mw, mh);
          for (let i = 0; i < data.length; i++) {
            const p = invert ? 1 - data[i] : data[i];
            // Seuil doux : >0.5 = sujet net, sinon fond flou
            const alpha = p > 0.5 ? 255 : 0;
            imgData.data[i * 4] = 255;
            imgData.data[i * 4 + 1] = 255;
            imgData.data[i * 4 + 2] = 255;
            imgData.data[i * 4 + 3] = alpha;
          }
          this.maskCanvas.width = mw;
          this.maskCanvas.height = mh;
          this.maskCtx.putImageData(imgData, 0, 0);

          // 3) Dessine le sujet net : drawImage(video) puis composite avec le masque
          const tmpCanvas = document.createElement("canvas");
          tmpCanvas.width = w;
          tmpCanvas.height = h;
          const tctx = tmpCanvas.getContext("2d")!;
          tctx.drawImage(v, sx, sy, sw, sh, 0, 0, w, h);
          tctx.globalCompositeOperation = "destination-in";
          tctx.drawImage(this.maskCanvas, 0, 0, w, h);
          ctx.drawImage(tmpCanvas, 0, 0);
          mask.close();
        }
      } catch (err) {
        // Sur erreur de segmentation, on tombe juste sur le fond flouté.
        console.warn("[videoComposer] segment frame failed", err);
      }
    } else {
      // Pas de flou : dessin direct.
      ctx.drawImage(v, sx, sy, sw, sh, 0, 0, w, h);
    }

    ctx.restore();

    // Logo en haut à gauche (jamais miroité)
    if (this.options.showLogo && this.logoImg) {
      const scale = Math.max(0.1, this.options.logoScale ?? 1);
      const logoH = Math.round(h * LOGO_HEIGHT_RATIO * scale);
      const ratio = this.logoImg.width / this.logoImg.height || 1;
      const logoW = Math.round(logoH * ratio);
      ctx.drawImage(this.logoImg, LOGO_PADDING, LOGO_PADDING, logoW, logoH);
    }
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

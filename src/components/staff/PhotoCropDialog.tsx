import { useEffect, useRef, useState } from "react";
import { Loader2, Save, ZoomIn } from "lucide-react";

import {
  cropOfficerPhoto,
  ImagePrepError,
  loadOfficerPhotoBitmap,
} from "../../utils/imagePrep";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "../ui/dialog";

interface PhotoCropDialogProps {
  file: File;
  onCancel: () => void;
  onConfirm: (photo: Blob) => void;
}

const VIEWPORT = 288;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export default function PhotoCropDialog({
  file,
  onCancel,
  onConfirm,
}: PhotoCropDialogProps) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startOffset: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadOfficerPhotoBitmap(file)
      .then((loaded) => {
        if (cancelled) {
          loaded.close();
          return;
        }
        setBitmap(loaded);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof ImagePrepError
              ? loadError.message
              : "Unable to open this image.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    return () => {
      bitmap?.close();
    };
  }, [bitmap]);

  const clampOffset = (
    nextZoom: number,
    candidate: { x: number; y: number },
  ) => {
    if (!bitmap) return candidate;
    const baseFit = VIEWPORT / Math.min(bitmap.width, bitmap.height);
    const effectiveScale = baseFit * nextZoom;
    const maxX = Math.max(0, (bitmap.width * effectiveScale - VIEWPORT) / 2);
    const maxY = Math.max(0, (bitmap.height * effectiveScale - VIEWPORT) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, candidate.x)),
      y: Math.min(maxY, Math.max(-maxY, candidate.y)),
    };
  };

  // Redraw the live preview whenever the bitmap, zoom, or pan changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const baseFit = VIEWPORT / Math.min(bitmap.width, bitmap.height);
    const effectiveScale = baseFit * zoom;
    const destWidth = bitmap.width * effectiveScale;
    const destHeight = bitmap.height * effectiveScale;
    const destX = VIEWPORT / 2 - destWidth / 2 + offset.x;
    const destY = VIEWPORT / 2 - destHeight / 2 + offset.y;

    context.clearRect(0, 0, VIEWPORT, VIEWPORT);
    context.drawImage(bitmap, destX, destY, destWidth, destHeight);
  }, [bitmap, zoom, offset]);

  const handleZoomChange = (nextZoom: number) => {
    setZoom(nextZoom);
    setOffset((current) => clampOffset(nextZoom, current));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startOffset: offset,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const candidate = {
      x: drag.startOffset.x + (event.clientX - drag.startX),
      y: drag.startOffset.y + (event.clientY - drag.startY),
    };
    setOffset(clampOffset(zoom, candidate));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  };

  const handleConfirm = async () => {
    if (!bitmap) return;
    setSaving(true);
    setError(null);
    try {
      const baseFit = VIEWPORT / Math.min(bitmap.width, bitmap.height);
      const effectiveScale = baseFit * zoom;
      const imageTopLeftX =
        VIEWPORT / 2 - (bitmap.width * effectiveScale) / 2 + offset.x;
      const imageTopLeftY =
        VIEWPORT / 2 - (bitmap.height * effectiveScale) / 2 + offset.y;
      const sourceX = -imageTopLeftX / effectiveScale;
      const sourceY = -imageTopLeftY / effectiveScale;
      const sourceSide = VIEWPORT / effectiveScale;

      const photo = await cropOfficerPhoto(
        bitmap,
        sourceX,
        sourceY,
        sourceSide,
      );
      onConfirm(photo);
    } catch (cropError) {
      setError(
        cropError instanceof Error
          ? cropError.message
          : "Unable to crop this image.",
      );
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onCancel()}>
      <DialogContent
        className="max-w-md overflow-hidden rounded-[16px] border-[#d9e1dc] bg-white p-0 text-[#16211b] shadow-2xl"
        style={{ fontFamily: "'Manrope', 'Noto Sans Khmer', system-ui, sans-serif" }}
      >
        <div className="border-b border-[#d9e1dc] bg-[#f3f5f2] px-6 py-5">
          <DialogTitle className="text-[15px] font-extrabold tracking-[-0.015em] text-[#16211b]">
            Position the photo
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-[12px] font-medium text-[#66716b]">
            Drag to reposition, use the slider to zoom. Only what's inside the circle is used.
          </DialogDescription>
        </div>

        <div className="grid place-items-center gap-4 px-6 py-6">
          {error && (
            <div
              role="alert"
              className="w-full rounded-[10px] border border-[#efc8c4] bg-[#fdecea] px-3.5 py-2.5 text-[12px] font-semibold text-[#9c332d]"
            >
              {error}
            </div>
          )}

          <div
            className="relative overflow-hidden rounded-[10px] bg-[#0b1220]"
            style={{ width: VIEWPORT, height: VIEWPORT }}
          >
            {bitmap ? (
              <canvas
                ref={canvasRef}
                width={VIEWPORT}
                height={VIEWPORT}
                className="cursor-grab touch-none active:cursor-grabbing"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              />
            ) : (
              !error && (
                <div className="grid size-full place-items-center">
                  <Loader2 className="size-6 animate-spin text-white/70" />
                </div>
              )
            )}
            {/* Circular crop guide: darkens everything outside the circle. */}
            <div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
            />
          </div>

          <div className="flex w-full items-center gap-3">
            <ZoomIn className="size-4 shrink-0 text-[#66716b]" />
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              disabled={!bitmap}
              onChange={(event) => handleZoomChange(Number(event.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#d9e1dc] accent-[#136232] disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-[#d9e1dc] bg-[#f3f5f2] px-6 py-4">
          <button
            type="button"
            className="min-h-10 rounded-[9px] border border-[#d9e1dc] px-4 text-[12.5px] font-bold text-[#16211b] transition hover:bg-[#eef2ee] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[9px] bg-[#136232] px-5 text-[12.5px] font-extrabold text-white transition hover:bg-[#0f5129] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleConfirm()}
            disabled={!bitmap || saving}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Use this photo
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

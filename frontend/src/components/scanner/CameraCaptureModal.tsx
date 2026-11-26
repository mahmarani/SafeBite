import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, RefreshCw, SwitchCamera, Upload, X } from 'lucide-react';
import { Button } from '../common/Button';
import { UploadedImageAsset } from './ImageDropzone';

interface CameraCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (asset: UploadedImageAsset) => void;
  onFallbackNativeCamera: () => void;
}

export function CameraCaptureModal({
  open,
  onClose,
  onCapture,
  onFallbackNativeCamera,
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<UploadedImageAsset | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(
    async (mode: 'environment' | 'user') => {
      stopStream();
      setCameraError(null);
      setIsStarting(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsStarting(false);
        setCameraError(
          'Live browser camera preview is not supported here. Use your device camera picker below.'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        const errorName = err instanceof Error ? err.name : '';
        if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
          setCameraError(
            'Camera permission was denied. Allow camera access in your browser or use the device camera option below.'
          );
        } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
          setCameraError(
            'No active camera was detected on this device. You can open the native camera or file picker below.'
          );
        } else {
          setCameraError(
            'Unable to start live camera preview. Use the native device camera button below.'
          );
        }
      } finally {
        setIsStarting(false);
      }
    },
    [stopStream]
  );

  useEffect(() => {
    if (!open) {
      stopStream();
      setCapturedPreview(null);
      setCameraError(null);
      return;
    }

    if (!capturedPreview) {
      startCamera(facingMode);
    }

    return () => {
      stopStream();
    };
  }, [open, facingMode, capturedPreview, startCamera, stopStream]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleTakeSnapshot = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            stopStream();
            setCapturedPreview({
              dataUrl: reader.result,
              fileName: `label-camera-${Date.now()}.jpg`,
              fileSize: blob.size,
              mimeType: 'image/jpeg',
            });
          }
        };
        reader.readAsDataURL(blob);
      },
      'image/jpeg',
      0.92
    );
  };

  const handleConfirmCapture = () => {
    if (!capturedPreview) return;
    onCapture(capturedPreview);
    setCapturedPreview(null);
    onClose();
  };

  const handleRetake = () => {
    setCapturedPreview(null);
  };

  const handleUseNativeCamera = () => {
    stopStream();
    onClose();
    onFallbackNativeCamera();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#1F1A17]/65 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      onClick={onClose}
    >
      <div
        className="overlay-surface w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#E8E1D5] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-[8px] bg-[#E9F7EF] border border-[#BDE5CE] flex items-center justify-center text-[#1D7A46] shrink-0">
              <Camera className="w-4 h-4" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h2
                id="camera-modal-title"
                className="font-display text-[16px] font-bold text-[#1F1A17] truncate"
              >
                Capture Ingredient Label
              </h2>
              <p className="text-[12px] text-[#6A6057] truncate">
                Center the nutrition facts or ingredients list inside the frame
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close camera"
            className="p-1.5 rounded-[8px] text-[#6A6057] hover:text-[#1F1A17] hover:bg-[#F3EDE2] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {capturedPreview ? (
            <div className="rounded-[12px] border border-[#E8E1D5] bg-[#F6F1E8] overflow-hidden">
              <img
                src={capturedPreview.dataUrl}
                alt="Captured product label preview"
                className="w-full max-h-[52vh] object-contain bg-[#1F1A17]"
              />
            </div>
          ) : cameraError ? (
            <div className="rounded-[12px] border border-[#E8E1D5] bg-[#FAF7F2] p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-[11px] bg-[#FEF8E6] border border-[#F6DC93] flex items-center justify-center text-[#D99B16] mx-auto">
                <Camera className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <div>
                <p className="font-display text-[16px] font-bold text-[#1F1A17]">
                  Camera preview unavailable
                </p>
                <p className="mt-1.5 text-[13px] leading-[20px] text-[#5C534A]">
                  {cameraError}
                </p>
              </div>
              <Button variant="primary" onClick={handleUseNativeCamera} fullWidth>
                <Camera className="w-4 h-4" strokeWidth={2} />
                <span>Open Device Camera App</span>
              </Button>
            </div>
          ) : (
            <div className="relative rounded-[12px] overflow-hidden bg-[#1F1A17] aspect-[4/3] flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
              />
              {/* Label framing guide */}
              <div
                className="pointer-events-none absolute inset-4 sm:inset-6 rounded-[10px] border-2 border-dashed border-white/75"
                aria-hidden="true"
              />
              {isStarting && (
                <div className="absolute inset-0 bg-[#1F1A17]/70 flex items-center justify-center text-[13px] font-medium text-white">
                  Starting camera...
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {capturedPreview ? (
              <>
                <Button variant="secondary" onClick={handleRetake} className="flex-1">
                  <RefreshCw className="w-4 h-4" strokeWidth={1.8} />
                  <span>Retake</span>
                </Button>
                <Button variant="primary" onClick={handleConfirmCapture} className="flex-1">
                  <Check className="w-4 h-4" strokeWidth={2} />
                  <span>Use This Photo</span>
                </Button>
              </>
            ) : (
              <>
                {!cameraError && (
                  <>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() =>
                        setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                      }
                      aria-label="Switch camera"
                    >
                      <SwitchCamera className="w-4 h-4" strokeWidth={1.8} />
                      <span>Flip</span>
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      disabled={isStarting}
                      onClick={handleTakeSnapshot}
                      className="flex-1"
                    >
                      <Camera className="w-4 h-4" strokeWidth={2} />
                      <span>Capture Photo</span>
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleUseNativeCamera}
                  className={cameraError ? 'w-full' : ''}
                >
                  <Upload className="w-4 h-4" strokeWidth={1.8} />
                  <span>Device Camera</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

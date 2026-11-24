import React, { useRef, useState } from 'react';
import { AlertCircle, Camera, ImagePlus, RefreshCw, Trash2, Upload } from 'lucide-react';
import { formatFileSize } from '../../utils/healthScoring';
import { validateImageFile } from '../../utils/validation';
import { Button } from '../common/Button';
import { CameraCaptureModal } from './CameraCaptureModal';

export interface UploadedImageAsset {
  dataUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface ImageDropzoneProps {
  asset: UploadedImageAsset | null;
  error: string | null;
  onSelectAsset: (asset: UploadedImageAsset) => void;
  onRemoveAsset: () => void;
  onError: (message: string | null) => void;
  disabled?: boolean;
}

function createSampleLabelDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="540" viewBox="0 0 800 540">
    <rect width="800" height="540" fill="#F6F1E8"/>
    <rect x="60" y="40" width="680" height="460" rx="14" fill="#FFFFFF" stroke="#DED5C6" stroke-width="2"/>
    <text x="96" y="96" font-family="sans-serif" font-size="30" font-weight="700" fill="#1F1A17">Nutrition Facts</text>
    <text x="96" y="128" font-family="sans-serif" font-size="16" fill="#6A6057">Serving size 1/2 cup (50g) · About 8 servings per container</text>
    <line x1="96" y1="146" x2="704" y2="146" stroke="#1F1A17" stroke-width="6"/>
    <text x="96" y="186" font-family="sans-serif" font-size="24" font-weight="700" fill="#1F1A17">Calories 215</text>
    <text x="590" y="186" font-family="sans-serif" font-size="16" font-weight="700" fill="#1D7A46">% Daily Value*</text>
    <line x1="96" y1="202" x2="704" y2="202" stroke="#E8E1D5" stroke-width="2"/>
    <text x="96" y="236" font-family="sans-serif" font-size="17" fill="#1F1A17">Total Fat 7.5g (Saturated Fat 1.2g)</text>
    <text x="655" y="236" font-family="sans-serif" font-size="17" font-weight="600" fill="#1F1A17">10%</text>
    <text x="96" y="268" font-family="sans-serif" font-size="17" fill="#1F1A17">Sodium 110mg</text>
    <text x="664" y="268" font-family="sans-serif" font-size="17" font-weight="600" fill="#1F1A17">5%</text>
    <text x="96" y="300" font-family="sans-serif" font-size="17" fill="#1F1A17">Total Carbohydrate 31g · Dietary Fiber 5g · Sugars 9g (7g Added)</text>
    <text x="655" y="300" font-family="sans-serif" font-size="17" font-weight="600" fill="#1F1A17">11%</text>
    <text x="96" y="332" font-family="sans-serif" font-size="17" fill="#1F1A17">Protein 6g</text>
    <text x="655" y="332" font-family="sans-serif" font-size="17" font-weight="600" fill="#1F1A17">12%</text>
    <line x1="96" y1="354" x2="704" y2="354" stroke="#E8E1D5" stroke-width="2"/>
    <text x="96" y="388" font-family="sans-serif" font-size="15" font-weight="700" fill="#1D7A46">INGREDIENTS:</text>
    <text x="96" y="416" font-family="sans-serif" font-size="15" fill="#423A34">Organic Whole Grain Rolled Oats, Sliced Roasted Almonds, Raw Wildflower Honey,</text>
    <text x="96" y="440" font-family="sans-serif" font-size="15" fill="#423A34">Cold-Pressed Sunflower Oil, Pumpkin Seeds, Ceylon Cinnamon, Sea Salt.</text>
    <text x="96" y="474" font-family="sans-serif" font-size="14" font-weight="700" fill="#D97706">CONTAINS: TREE NUTS (ALMONDS), WHEAT/GLUTEN TRACES.</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function ImageDropzone({
  asset,
  error,
  onSelectAsset,
  onRemoveAsset,
  onError,
  disabled = false,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  const processFile = (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      onError(validationError);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onError(null);
        onSelectAsset({
          dataUrl: reader.result,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'image/jpeg',
        });
      } else {
        onError('Could not read the selected image file. Please try another photo.');
      }
    };
    reader.onerror = () => {
      onError('Failed to load the selected file preview. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
    event.target.value = '';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleLoadSampleLabel = () => {
    onError(null);
    onSelectAsset({
      dataUrl: createSampleLabelDataUrl(),
      fileName: 'artisan-honey-almond-granola-label.png',
      fileSize: 284600,
      mimeType: 'image/png',
    });
  };

  const handleOpenCamera = () => {
    if (disabled) return;
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function'
    ) {
      setCameraModalOpen(true);
    } else {
      cameraInputRef.current?.click();
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        onChange={handleFileChange}
        disabled={disabled}
        className="sr-only"
        aria-label="Upload ingredient label image"
      />

      {/* Native rear-camera capture input for mobile/tablet fallback */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        onChange={handleFileChange}
        disabled={disabled}
        className="sr-only"
        aria-label="Capture ingredient label photo with camera"
      />

      {!asset ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`rounded-[12px] border-2 border-dashed p-6 sm:p-10 text-center transition-colors ${
            isDragging
              ? 'border-[#1D7A46] bg-[#E9F7EF]/70'
              : error
                ? 'border-[#D43832] bg-[#FDECEC]/60'
                : 'border-[#D5C9B6] bg-[#FAF7F2] hover:border-[#1D7A46]/70'
          }`}
        >
          <div className="w-12 h-12 rounded-[11px] bg-white border border-[#E8E1D5] flex items-center justify-center text-[#1D7A46] mx-auto shadow-xs">
            <Upload className="w-6 h-6" strokeWidth={1.75} />
          </div>

          <h3 className="mt-4 font-display text-[17px] font-bold text-[#1F1A17]">
            Drag and drop an ingredient label image
          </h3>
          <p className="mt-1.5 text-[14px] text-[#5C534A] max-w-md mx-auto">
            Upload a clear photo of the nutrition facts panel or ingredient list. Accepted formats:
            JPG, JPEG, or PNG up to 8 MB.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {/* Mobile & Tablet direct camera option (< 1024px) */}
            <Button
              variant="primary"
              disabled={disabled}
              onClick={handleOpenCamera}
              className="lg:hidden"
            >
              <Camera className="w-4 h-4" strokeWidth={2} />
              <span>Take Photo</span>
            </Button>

            <Button
              variant="primary"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="hidden lg:inline-flex"
            >
              <ImagePlus className="w-4 h-4" strokeWidth={2} />
              <span>Select Image File</span>
            </Button>

            <Button
              variant="secondary"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="lg:hidden"
            >
              <ImagePlus className="w-4 h-4" strokeWidth={1.8} />
              <span>Choose File</span>
            </Button>

            <Button
              variant="secondary"
              disabled={disabled}
              onClick={handleLoadSampleLabel}
            >
              <span>Use Sample Label Photo</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-[12px] border border-[#E8E1D5] bg-white overflow-hidden">
          <div className="bg-[#F6F1E8] p-4 flex items-center justify-center border-b border-[#E8E1D5]">
            <img
              src={asset.dataUrl}
              alt={`Preview of ${asset.fileName}`}
              className="max-h-[300px] w-auto rounded-[9px] border border-[#E8E1D5] object-contain bg-white shadow-xs"
            />
          </div>
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-[#1F1A17] truncate">{asset.fileName}</p>
              <p className="text-[12px] text-[#6A6057] font-data tabular-nums mt-0.5">
                {formatFileSize(asset.fileSize)} · Ready for ingredient extraction
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={handleOpenCamera}
                className="lg:hidden"
              >
                <Camera className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>Retake</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
              >
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>Replace</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={onRemoveAsset}
                className="text-[#9B1F1B] hover:bg-[#FDECEC] hover:border-[#F7BEBC]"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>Remove</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-[9px] bg-[#FDECEC] border border-[#F7BEBC] px-3.5 py-2.5 text-[13px] text-[#9B1F1B]"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#D43832]" strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      <CameraCaptureModal
        open={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={(capturedAsset) => {
          onError(null);
          onSelectAsset(capturedAsset);
        }}
        onFallbackNativeCamera={() => cameraInputRef.current?.click()}
      />
    </div>
  );
}

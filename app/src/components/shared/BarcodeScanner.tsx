import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, SwitchCamera } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');
  const [isStarting, setIsStarting] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const hasScannedRef = useRef(false);

  const startScanner = async (facing: 'environment' | 'user') => {
    if (!containerRef.current) return;

    try {
      setIsStarting(true);
      setError('');

      // Clean up any existing scanner
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // ignore
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode('barcode-scanner-viewport');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: facing },
        {
          fps: 10,
          qrbox: { width: 280, height: 120 },
          aspectRatio: 1.5,
          formatsToSupport: [
            0,  // QR_CODE
            2,  // EAN_13
            3,  // EAN_8
            4,  // CODE_128
            6,  // CODE_39
            10, // UPC_A
            11, // UPC_E
          ],
        },
        (decodedText) => {
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;
          onScan(decodedText);
        },
        () => {
          // ignore scan failure (no barcode detected in frame)
        }
      );
      setIsStarting(false);
    } catch (err: any) {
      setIsStarting(false);
      if (err?.message?.includes('Permission')) {
        setError('Camera permission denied. Please allow camera access and try again.');
      } else if (err?.message?.includes('NotFoundError') || err?.message?.includes('not found')) {
        setError('No camera found on this device.');
      } else {
        setError('Failed to start camera. Please try again.');
      }
    }
  };

  useEffect(() => {
    startScanner(facingMode);

    return () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2 /* SCANNING */ || state === 3 /* PAUSED */) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch {
          // ignore – scanner was never started or already stopped
        }
        try {
          scannerRef.current.clear();
        } catch {
          // ignore
        }
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwitchCamera = async () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    hasScannedRef.current = false;
    await startScanner(newFacing);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-card overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-navy" />
            <h3 className="font-semibold text-sm">Scan Book Barcode</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={handleSwitchCamera}
              title="Switch camera"
            >
              <SwitchCamera className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scanner viewport */}
        <div ref={containerRef} className="relative bg-black">
          <div id="barcode-scanner-viewport" className="w-full" style={{ minHeight: 300 }} />
          {isStarting && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center text-white">
                <Camera className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                <p className="text-sm">Starting camera...</p>
              </div>
            </div>
          )}
        </div>

        {/* Error or instructions */}
        <div className="p-4 text-center">
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Point the camera at the book's ISBN barcode
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

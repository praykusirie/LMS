import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, BrowserCodeReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { Camera, X, SwitchCamera, ScanBarcode, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  onClose: () => void;
}

type ScanPhase = 'starting' | 'scanning' | 'success' | 'error';

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const hasScannedRef = useRef(false);
  const [phase, setPhase] = useState<ScanPhase>('starting');
  const [errorMessage, setErrorMessage] = useState('');
  const [scannedIsbn, setScannedIsbn] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceIndex, setDeviceIndex] = useState(0);
  const [manualInput, setManualInput] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);

  const stopControls = useCallback(() => {
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch { /* ignore */ }
      controlsRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async (devIndex: number, devList: MediaDeviceInfo[]) => {
    stopControls();
    hasScannedRef.current = false;
    setPhase('starting');
    setErrorMessage('');

    const reader = new BrowserMultiFormatReader();
    try {
      const deviceId = devList[devIndex]?.deviceId;
      if (!videoRef.current) return;

      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result) => {
          if (hasScannedRef.current) return;
          if (result) {
            hasScannedRef.current = true;
            const isbn = result.getText();
            setScannedIsbn(isbn);
            setPhase('success');
            setTimeout(() => {
              stopControls();
              onScan(isbn);
              onClose();
            }, 1500);
          }
        },
      );

      controlsRef.current = controls;
      setPhase('scanning');
    } catch (err: unknown) {
      const msg = String((err as Error)?.message ?? err ?? '');
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setErrorMessage('Camera permission denied. Please allow camera access and try again.');
      } else if (msg.includes('NotFound') || msg.includes('not found')) {
        setErrorMessage('No camera found on this device.');
      } else {
        setErrorMessage('Failed to start camera. Please try again.');
      }
      setPhase('error');
    } finally {
      setIsSwitching(false);
    }
  }, [onScan, onClose, stopControls]);

  useEffect(() => {
    let cancelled = false;
    BrowserCodeReader.listVideoInputDevices()
      .then((devList) => {
        if (cancelled) return;
        setDevices(devList);
        // Prefer back/rear/environment camera; fall back to last device (front cameras are usually index 0)
        const backIndex = devList.findIndex(d => /back|rear|environment/i.test(d.label));
        const defaultIndex = backIndex !== -1 ? backIndex : (devList.length > 1 ? devList.length - 1 : 0);
        setDeviceIndex(defaultIndex);
        startScanner(defaultIndex, devList);
      })
      .catch(() => {
        if (cancelled) return;
        startScanner(0, []);
      });
    return () => {
      cancelled = true;
      stopControls();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSwitchCamera = () => {
    if (devices.length < 2 || isSwitching) return;
    const nextIndex = (deviceIndex + 1) % devices.length;
    setDeviceIndex(nextIndex);
    setIsSwitching(true);
    startScanner(nextIndex, devices);
  };

  const handleManualSubmit = () => {
    const val = manualInput.trim();
    if (!val) return;
    hasScannedRef.current = true;
    stopControls();
    onScan(val);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-card overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm">Scan Book Barcode</h3>
          </div>
          <div className="flex items-center gap-2">
            {devices.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={handleSwitchCamera}
                title="Switch camera"
                disabled={isSwitching || phase === 'starting'}
              >
                {isSwitching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SwitchCamera className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Video viewport */}
        <div className="relative bg-black" style={{ minHeight: 280 }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full object-cover"
            style={{ minHeight: 280, maxHeight: 340 }}
          />
          {/* Animated guide + sweep line */}
          {phase === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-64 h-24 rounded-sm overflow-hidden">
                <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-primary" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-primary" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-primary" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-primary" />
                <div className="absolute left-0 right-0 h-0.5 bg-primary/80 barcode-sweep" />
              </div>
            </div>
          )}
          {phase === 'starting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                <p className="text-sm">Starting camera...</p>
              </div>
            </div>
          )}
          {phase === 'success' && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-500/85">
              <div className="text-center text-white px-6">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3" />
                <p className="text-sm font-semibold">Found!</p>
                <p className="text-xs mt-1 font-mono opacity-90 break-all">{scannedIsbn}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="p-4 space-y-3">
          {phase === 'error' ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-destructive">{errorMessage}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startScanner(deviceIndex, devices)}
                className="rounded-xl"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground text-center">
                Point camera at the book's ISBN barcode
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ScanBarcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Or type ISBN manually..."
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
                    className="pl-10 rounded-xl h-10 text-sm"
                    autoComplete="off"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-xl px-3"
                  onClick={handleManualSubmit}
                  disabled={!manualInput.trim()}
                >
                  Go
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

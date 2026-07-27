import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface Props {
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export function BarcodeScannerModal({ onClose, onScan }: Props) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "barcode-reader",
      { fps: 10, qrbox: { width: 300, height: 150 } },
      /* verbose= */ false
    );
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        scanner.clear();
        onScan(decodedText);
      },
      (errorMessage) => {
        // ignore scan failures during continuous scanning
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', zIndex: 1000,
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="card neu-convex" style={{ width: '90%', maxWidth: '500px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Scan Barcode</h3>
          <button className="btn neu-pressed" onClick={onClose} style={{ padding: '0.25rem 0.75rem' }}>Close</button>
        </div>
        <div id="barcode-reader" style={{ width: '100%', borderRadius: '8px', overflow: 'hidden' }}></div>
      </div>
    </div>
  );
}

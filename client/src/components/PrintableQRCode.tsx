import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  companyId: string;
  companyName: string;
}

export const PrintableQRCode = ({ companyId, companyName }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);
  const registrationUrl = `${window.location.origin}/register?companyId=${companyId}`;

  // Fonction d'impression
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Inscription_${companyName}`,
  });

  // Fonction de téléchargement
  const downloadQRCode = () => {
    const svg = document.getElementById("qr-code-svg") as any;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${companyName}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <>
      <style>{`
        @keyframes pulse-scale {
          0% { transform: scale(1); }
          50% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
      `}</style>
      {/* Icon Trigger */}
      <button 
        onClick={() => setIsOpen(true)}
        style={{ 
          background: '#ffffff', padding: '8px', borderRadius: '14px', 
          border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '8px',
          animation: 'pulse-scale 2s infinite ease-in-out'
        }}
        title="Afficher le QR Code"
      >
        <QRCodeSVG value={registrationUrl} size={48} />
      </button>

      {/* Popup Modal */}
      {isOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.6)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          {/* Modal Window Card */}
          <div style={{ 
            background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '440px', 
            overflow: 'hidden', display: 'flex', flexDirection: 'column', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)', position: 'relative' 
          }}>
            
            {/* Close button */}
            <button 
              onClick={() => setIsOpen(false)} 
              style={{ 
                position: 'absolute', top: '16px', right: '16px', background: '#f1f5f9', 
                border: 'none', borderRadius: '50%', width: 36, height: 36, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                cursor: 'pointer', color: 'var(--text)' 
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>

            {/* The Printable Area */}
            <div ref={componentRef} style={{ padding: '40px 24px 24px 24px', textAlign: 'center', fontFamily: "'Inter', Arial, sans-serif" }}>
              {/* Brand Logo inside the poster */}
              <div style={{ marginBottom: 24 }}>
                <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                  <span style={{ fontFamily: "'Pacifico', cursive", fontWeight: 400, fontSize: '2rem', color: 'var(--text)', letterSpacing: '0.5px' }}>prim'</span>
                  <span style={{ fontFamily: "'Pacifico', cursive", fontWeight: 400, fontSize: '2.8rem', color: 'var(--primary)', lineHeight: 1 }}>o</span>
                </span>
              </div>

              <div style={{ display: "inline-block", padding: 16, background: '#fff', borderRadius: 16, border: '1px solid var(--border)', marginBottom: 24 }}>
                <QRCodeSVG id="qr-code-svg" value={registrationUrl} size={200} />
              </div>

              <h1 style={{ textTransform: "uppercase", fontSize: "1.6rem", fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
                {companyName}
              </h1>
              <h2 style={{ marginBottom: "16px", fontSize: "1.1rem", color: 'var(--text-muted)', fontWeight: 500 }}>
                Rejoignez notre équipe sur Prim'o
              </h2>

              <p style={{ marginTop: "8px", fontSize: "1.05rem", fontWeight: 700, color: 'var(--text)' }}>
                Scannez ce QR Code pour vous inscrire
              </p>
            </div>

            {/* Actions Area (NOT in contentRef so it doesn't print) */}
            <div style={{ padding: '0 24px 32px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => handlePrint()} className="btn btn-primary" style={{ padding: '14px 0', fontSize: '1.05rem', borderRadius: 999, fontWeight: 700 }}>
                Imprimer l'affiche
              </button>
              <button onClick={downloadQRCode} className="btn btn-outline" style={{ padding: '14px 0', fontSize: '1.05rem', borderRadius: 999, fontWeight: 700 }}>
                Télécharger le QR Code
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

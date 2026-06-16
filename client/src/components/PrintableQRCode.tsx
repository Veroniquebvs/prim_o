import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  companyId: string;
  companyName: string;
}

export const PrintableQRCode = ({ companyId, companyName }: Props) => {
  const componentRef = useRef<HTMLDivElement>(null);

  // Fonction d'impression
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Inscription_${companyName}`,
  });

  const registrationUrl = `${window.location.origin}/register?companyId=${companyId}`;
  // Récupérer l'URL :
  console.log("Voici ton lien à tester :", registrationUrl);

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
    <div style={{ marginTop: "20px" }}>
      {/* Zone visible et imprimable */}
      <div
        ref={componentRef}
        style={{
          padding: "clamp(16px, 5vw, 50px)",
          textAlign: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1 style={{ textTransform: "uppercase", fontSize: "clamp(1.2rem, 4vw, 2rem)" }}>
          {companyName}
        </h1>
        <h2 style={{ marginBottom: "24px", fontSize: "clamp(1rem, 3vw, 1.5rem)" }}>
          Rejoignez notre équipe sur Prim'o
        </h2>

        {/* Le QR Code avec l'ID pour la fonction téléchargement */}
        <div style={{ display: "inline-block", maxWidth: "100%" }}>
          <QRCodeSVG id="qr-code-svg" value={registrationUrl} size={Math.min(240, window.innerWidth - 80)} />
        </div>

        <p style={{ marginTop: "16px", fontSize: "clamp(14px, 3vw, 18px)" }}>
          Scannez ce QR Code pour vous inscrire
        </p>
      </div>

      {/* Les boutons d'action */}
      <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={() => handlePrint()} className="btn btn-outline">
          Imprimer l'affiche
        </button>
        <button onClick={downloadQRCode} className="btn btn-outline">
          Télécharger le QR Code
        </button>
      </div>
    </div>
  );
};

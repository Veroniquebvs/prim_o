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
          padding: "50px",
          textAlign: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1 style={{ textTransform: "uppercase" }}>{companyName}</h1>
        <h2 style={{ marginBottom: "40px" }}>
          Rejoignez notre équipe sur Prim'o
        </h2>

        {/* Le QR Code avec l'ID pour la fonction téléchargement */}
        <QRCodeSVG id="qr-code-svg" value={registrationUrl} size={300} />

        <p style={{ marginTop: "20px", fontSize: "18px" }}>
          Scannez ce QR Code pour vous inscrire
        </p>
      </div>

      {/* Les boutons d'action */}
      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <button onClick={() => handlePrint()} className="btn btn-secondary">
          Imprimer l'affiche
        </button>
        <button onClick={downloadQRCode} className="btn btn-secondary">
          Télécharger le QR Code
        </button>
      </div>
    </div>
  );
};

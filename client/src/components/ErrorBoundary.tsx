import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "30px", background: "#fff5f5", color: "#c53030", fontFamily: "monospace", borderRadius: "12px", margin: "30px", border: "2px solid #feb2b2", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "12px" }}>⚠️ Une erreur inattendue est survenue</h2>
          <p style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "16px" }}>
            {this.state.error?.toString()}
          </p>
          <details style={{ whiteSpace: "pre-wrap", background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid #fed7d7", fontSize: "0.85rem", color: "#4a5568" }}>
            <summary style={{ cursor: "pointer", fontWeight: "bold", marginBottom: "8px" }}>Afficher les détails de la trace</summary>
            {this.state.error?.stack}
          </details>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: "16px", padding: "8px 16px", background: "#c53030", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
          >
            Recharger la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

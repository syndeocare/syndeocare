import React, { Component, ErrorInfo, ReactNode } from "react";
import i18n from "@/i18n";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  private readonly chunkReloadKey = "__sc_chunk_error_reloaded__";

  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[SyndeoCare] Uncaught error:", error, errorInfo);

    // Auto-recover once from stale chunk/import errors after deployments.
    const message = error?.message || "";
    const isChunkError =
      message.includes("Failed to fetch dynamically imported module") ||
      message.includes("ChunkLoadError") ||
      message.includes("Importing a module script failed") ||
      message.includes(
        "Cannot read properties of undefined (reading 'default')",
      );

    if (isChunkError) {
      try {
        const hasReloaded = sessionStorage.getItem(this.chunkReloadKey) === "1";
        if (!hasReloaded) {
          sessionStorage.setItem(this.chunkReloadKey, "1");
          const url = new URL(window.location.href);
          url.searchParams.set("refresh", Date.now().toString());
          window.location.replace(url.toString());
        }
      } catch {
        // Ignore storage access failures and keep fallback UI visible.
      }
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("refresh", Date.now().toString());
    window.location.replace(url.toString());
  };

  private handleSafeLogout = () => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (/^sb-.*-auth-token$/.test(key)) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.removeItem(this.chunkReloadKey);
    } finally {
      window.location.assign("/logout");
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {i18n.t("errors.unexpectedTitle")}
              </h1>
              <p className="text-muted-foreground">
                {i18n.t("errors.unexpectedMessage")}
              </p>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs bg-muted p-4 rounded-lg overflow-auto max-h-40 text-destructive">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 rounded-xl gradient-brand text-white font-semibold hover:opacity-90 transition-opacity"
              >
                {i18n.t("errors.tryAgain")}
              </button>
              <button
                onClick={this.handleReload}
                className="px-6 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-colors"
              >
                {i18n.t("errors.reloadPage")}
              </button>
              <button
                onClick={this.handleSafeLogout}
                className="px-6 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-colors"
              >
                {i18n.t("errors.safeLogout")}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              SyndeoCare &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

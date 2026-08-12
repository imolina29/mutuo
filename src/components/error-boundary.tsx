// src/components/error-boundary.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] px-4 py-8 text-center">
          <h2 className="text-xl font-semibold text-mutuo-primary mb-2">
            {this.props.fallbackTitle ?? "Algo salió mal"}
          </h2>
          <p className="text-sm text-mutuo-gray mb-4 max-w-md">
            Ocurrió un error inesperado. Intenta recargar la página.
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Recargar página
          </Button>
          <p className="text-xs text-mutuo-gray mt-6 border-t pt-4">
            Si el problema persiste, llama a la{" "}
            <a href="tel:155" className="font-semibold text-mutuo-primary underline">
              Línea 155
            </a>{" "}
            — atención a víctimas de violencia de género.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

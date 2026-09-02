import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Last-resort guard so a render error shows a recovery screen instead of a
 * blank page. Copy is intentionally hardcoded English: the i18n provider may be
 * the very thing that failed.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled error in Fit2Fit', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="text-muted max-w-sm text-sm">{error.message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-primary text-primary-fg h-11 rounded-xl px-5 font-semibold"
        >
          Reload
        </button>
      </div>
    );
  }
}

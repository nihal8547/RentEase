import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-sand-050 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-line shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-ruby-100 text-ruby-700 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-ruby-100/50">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-ink-900 font-serif">
                Something went wrong
              </h1>
              <p className="text-sm text-ink-600 leading-relaxed">
                An unexpected application error occurred. You can attempt to refresh the page or return to the main dashboard.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-sand-100 rounded-xl text-xs text-ruby-700 font-mono text-left overflow-auto max-h-24 border border-line">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-maroon-700 hover:bg-maroon-800 text-white rounded-xl text-sm font-medium transition-all shadow-md cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Reload Application
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-sand-100 hover:bg-sand-200 text-ink-900 rounded-xl text-sm font-medium transition-all border border-line cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
          <p className="font-semibold text-destructive">Error al cargar la página</p>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
            {this.state.error.message}
            {'\n'}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

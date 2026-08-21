import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled application error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-fallback">
          <h1>Dashboard unavailable</h1>
          <p>The application encountered an unexpected error. Please reload the page.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

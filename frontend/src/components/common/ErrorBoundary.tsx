import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to an error reporting service in production
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className='flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center'>
          <div className='rounded-full bg-red-50 p-4'>
            <AlertTriangle className='h-8 w-8 text-red-500' />
          </div>
          <div className='space-y-1'>
            <h2 className='text-xl font-semibold text-slate-800'>
              Something went wrong
            </h2>
            <p className='text-sm text-slate-500'>
              An unexpected error occurred. Try refreshing or go back.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <p className='mt-2 rounded bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-600'>
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className='flex gap-3'>
            <Button variant='outline' onClick={this.handleReset}>
              <RefreshCw className='mr-2 h-4 w-4' />
              Try Again
            </Button>
            <Button
              variant='outline'
              onClick={() => (window.location.href = '/')}
            >
              Go to Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

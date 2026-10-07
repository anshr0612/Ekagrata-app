import React, { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-lg mx-auto text-center space-y-4">
          <div className="text-4xl text-amber-500">🌱</div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            Something encountered an unexpected pause
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400 font-mono bg-stone-100 dark:bg-stone-800 p-3 rounded-xl break-all">
            {this.state.error?.toString()}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.href = '/';
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl"
          >
            Return to Home (Begin again)
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

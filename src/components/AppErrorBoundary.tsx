import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/**
 * Catches render/parser crashes so the UI shows a friendly recovery screen
 * instead of a blank page.
 */
export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong while processing the page.",
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    console.error("[ContextBridge] UI error boundary caught:", error, errorInfo);
  }

  private reset = (): void => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16">
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            A parser or page crash was caught so the app wouldn’t go blank. You
            can try again, or paste the conversation manually.
          </p>
          {this.state.message ? (
            <p className="mt-3 rounded-md bg-stone-100 px-3 py-2 font-mono text-xs text-stone-700">
              {this.state.message}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
            >
              Try again
            </button>
            <Link
              to="/"
              onClick={this.reset}
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
            >
              Back to paste
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

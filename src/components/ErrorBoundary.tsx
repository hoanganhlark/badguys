import React from "react";

type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  State
> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <p className="text-slate-600 text-sm">
            Đã xảy ra lỗi. Vui lòng tải lại trang.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-xs text-slate-500 underline"
          >
            Tải lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

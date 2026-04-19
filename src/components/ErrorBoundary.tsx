import React from "react";
import i18n from "../i18n";

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
            {i18n.t("errorBoundary.error")}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-xs text-slate-500 underline"
          >
            {i18n.t("errorBoundary.reload")}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import React from "react";
import { Button, Result } from "antd";
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
        <Result
          status="error"
          title={i18n.t("errorBoundary.error")}
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              {i18n.t("errorBoundary.reload")}
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}

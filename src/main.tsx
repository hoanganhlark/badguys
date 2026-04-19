import React from "react";
import ReactDOM from "react-dom/client";
import { App as AntApp, ConfigProvider, type ThemeConfig } from "antd";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import "antd/dist/reset.css";
import "./i18n";
import "./styles.css";

const appTheme: ThemeConfig = {
  token: {
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    colorPrimary: "#1a1a1a",
    colorInfo: "#1a1a1a",
    colorSuccess: "#15803d",
    colorWarning: "#d97706",
    colorError: "#dc2626",
    colorBgLayout: "#fafafa",
    colorBgContainer: "#ffffff",
    colorBorder: "#f0f0f0",
    borderRadius: 12,
    controlHeight: 40,
  },
  components: {
    Layout: {
      headerBg: "rgba(250, 250, 250, 0.92)",
      bodyBg: "#fafafa",
      siderBg: "#ffffff",
      triggerBg: "#ffffff",
    },
    Card: {
      borderRadiusLG: 16,
    },
    Input: {
      activeBorderColor: "#1a1a1a",
      hoverBorderColor: "#1a1a1a",
    },
    InputNumber: {
      activeBorderColor: "#1a1a1a",
      hoverBorderColor: "#1a1a1a",
    },
    Select: {
      activeBorderColor: "#1a1a1a",
      hoverBorderColor: "#1a1a1a",
    },
    Menu: {
      itemBorderRadius: 10,
    },
    Drawer: {
      colorBgMask: "rgba(15, 23, 42, 0.3)",
    },
  },
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider theme={appTheme}>
      <AntApp>
        <ErrorBoundary>
          <AuthProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <App />
            </BrowserRouter>
          </AuthProvider>
        </ErrorBoundary>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);

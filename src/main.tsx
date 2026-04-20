import React from "react";
import ReactDOM from "react-dom/client";
import { App as AntApp, ConfigProvider } from "antd";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import { queryClient } from "./hooks/queries/config";
import "antd/dist/reset.css";
import "./i18n";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
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
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>,
);

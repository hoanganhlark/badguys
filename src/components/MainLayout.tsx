import { lazy } from "react";
import { useTranslation } from "react-i18next";
import AppHeader from "./AppHeader";
import ConfigSidebar from "./ConfigSidebar";
import ChangePasswordModal from "./ChangePasswordModal";
import LoginModal from "./LoginModal";
import SessionsModal from "./SessionsModal";
import { useSessionContext } from "../context/SessionContext";
import type { AppConfig } from "../types";
import { envConfig } from "../env";

const Calculator = lazy(() => import("./calculator/Calculator"));

interface MainLayoutProps {
  isAuthenticated: boolean;
  isAdmin: boolean;
  currentUsername: string;
  userId: string;
  appConfig: AppConfig;
  // Header & menus
  rankingMenuItems: any[] | undefined;
  userMenuItems: any[] | undefined;
  // Config sidebar
  configOpen: boolean;
  onConfigClose: () => void;
  onConfigChange: (config: AppConfig) => void;
  // Password modal
  changePasswordOpen: boolean;
  changePasswordSubmitting: boolean;
  changePasswordError: string;
  passwordForm: any;
  onChangePasswordClose: () => void;
  onChangePasswordSubmit: (values: any) => Promise<void>;
  onClearChangePasswordError: () => void;
  // Login modal
  loginModalOpen: boolean;
  loginRedirectTarget: string;
  onLoginModalClose: () => void;
  onLoginSuccess: (target: string) => void;
  // Auth
  onLogout: () => void;
}

/**
 * Main application layout for the calculator home page.
 * Contains header, calculator, config sidebar, and modals.
 */
export function MainLayout({
  isAuthenticated,
  isAdmin,
  currentUsername,
  userId,
  appConfig,
  rankingMenuItems,
  userMenuItems,
  configOpen,
  onConfigClose,
  onConfigChange,
  changePasswordOpen,
  changePasswordSubmitting,
  changePasswordError,
  passwordForm,
  onChangePasswordClose,
  onChangePasswordSubmit,
  onClearChangePasswordError,
  loginModalOpen,
  loginRedirectTarget,
  onLoginModalClose,
  onLoginSuccess,
  onLogout,
}: MainLayoutProps) {
  const { t } = useTranslation();
  const {
    sessionsOpen,
    sessionsLoading,
    sessionsError,
    sessions,
    openSessionsModal,
    closeSessions,
    handleRemoveSession,
    handleCopySessionNote,
  } = useSessionContext();

  return (
    <div className="relative min-h-screen bg-[#fafafa]">
      <AppHeader
        isAuthenticated={isAuthenticated}
        username={currentUsername}
        onOpenConfig={onConfigClose}
        rankingMenuItems={rankingMenuItems}
        userMenuItems={userMenuItems}
        configOpenLabel={t("app.openConfig")}
        rankingLabel={t("app.ranking")}
        accountMenuLabel={t("app.openAccountMenu")}
      />

      <div className="px-5 pb-5 pt-20 md:px-12 md:pb-12">
        <div className="max-w-md mx-auto">
          <header className="mb-12 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isAdmin ? "@BadGuys" : "BadGuys"}
              <span className="text-slate-400">.</span>
            </h1>
            {isAuthenticated ? (
              <p className="mt-2 text-xs text-slate-500">
                {t("app.loggedIn", {
                  username: currentUsername,
                })}
              </p>
            ) : null}
          </header>
          <Calculator userId={userId} isAdmin={isAdmin} appConfig={appConfig} />
        </div>
      </div>

      <ConfigSidebar
        open={configOpen}
        backdropInteractive={!sessionsOpen}
        config={appConfig}
        isAdmin={isAdmin}
        currentUsername={currentUsername}
        onClose={onConfigClose}
        onOpenSessions={openSessionsModal}
        onConfigChange={onConfigChange}
        onLogout={onLogout}
        appVersion={envConfig.appVersion}
      />

      <SessionsModal
        open={sessionsOpen}
        loading={sessionsLoading}
        error={sessionsError}
        sessions={sessions}
        canRemove={isAdmin}
        onClose={closeSessions}
        onRemove={handleRemoveSession}
        onCopyNote={handleCopySessionNote}
      />

      <ChangePasswordModal
        open={changePasswordOpen}
        submitting={changePasswordSubmitting}
        error={changePasswordError}
        form={passwordForm}
        onCancel={onChangePasswordClose}
        onSubmit={onChangePasswordSubmit}
        onClearError={onClearChangePasswordError}
      />

      <LoginModal
        open={loginModalOpen}
        redirectTo={loginRedirectTarget}
        onClose={onLoginModalClose}
        onSuccess={onLoginSuccess}
      />
    </div>
  );
}

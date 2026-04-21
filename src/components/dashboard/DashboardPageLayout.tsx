import { useEffect, useRef, useState, type ReactNode } from "react";
import { MenuOutlined } from "@ant-design/icons";
import { Button, Layout, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import RankingSidebar from "../ranking/RankingSidebar";
import { useDashboardPageConfig } from "./DashboardPageContext";

type DashboardPageLayoutProps = {
  children: ReactNode;
};

const DASHBOARD_APPBAR_STYLE = {
  position: "sticky" as const,
  top: 0,
  zIndex: 55,
  height: 56,
  lineHeight: "56px",
  padding: "0 16px",
  borderBottom: "1px solid #e2e8f0",
  background: "rgba(250, 250, 250, 0.92)",
  backdropFilter: "blur(8px)",
  boxShadow: "0 2px 12px rgba(15, 23, 42, 0.08)",
};

export default function DashboardPageLayout({
  children,
}: DashboardPageLayoutProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const {
    pageTitle,
    menuAriaLabel,
    usersActive = false,
    auditActive = false,
    categoriesActive = false,
    showCategoriesLink = false,
  } = useDashboardPageConfig();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const mainContentRef = useRef<HTMLElement | null>(null);

  const handleSetDashboardView = (
    view: "member" | "match-form" | "ranking",
  ) => {
    navigate(`/dashboard/${view}`);
  };

  useEffect(() => {
    const container = mainContentRef.current;
    if (!container) return;

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (
        !(
          target instanceof HTMLInputElement ||
          target instanceof HTMLSelectElement ||
          target instanceof HTMLTextAreaElement
        )
      ) {
        return;
      }

      window.setTimeout(() => {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }, 220);
    };

    container.addEventListener("focusin", handleFocusIn);
    return () => container.removeEventListener("focusin", handleFocusIn);
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardInset = () => {
      const keyboardInset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      document.documentElement.style.setProperty(
        "--mobile-keyboard-inset",
        `${keyboardInset}px`,
      );
    };

    viewport.addEventListener("resize", updateKeyboardInset);
    viewport.addEventListener("scroll", updateKeyboardInset);
    updateKeyboardInset();

    return () => {
      viewport.removeEventListener("resize", updateKeyboardInset);
      viewport.removeEventListener("scroll", updateKeyboardInset);
      document.documentElement.style.setProperty(
        "--mobile-keyboard-inset",
        "0px",
      );
    };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Layout.Header style={DASHBOARD_APPBAR_STYLE}>
        <div className="flex h-14 items-center justify-between">
          <div>
            {!mobileSidebarOpen ? (
              <Button
                type="default"
                shape="circle"
                icon={<MenuOutlined />}
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden"
                aria-label={menuAriaLabel}
              />
            ) : null}
          </div>
          <Typography.Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {pageTitle}
          </Typography.Text>
        </div>
      </Layout.Header>

      <Layout
        className="flex min-h-0 flex-col md:flex-row"
        style={{ background: "transparent" }}
      >
        <RankingSidebar
          currentView="ranking"
          onSetView={handleSetDashboardView}
          onGoHome={() => navigate("/")}
          isAdmin={isAdmin}
          onGoUsers={() => navigate("/dashboard/users")}
          onGoAudit={() => navigate("/dashboard/audit")}
          onGoCategories={
            showCategoriesLink
              ? () => navigate("/dashboard/categories")
              : undefined
          }
          showMatchForm={true}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
          usersActive={usersActive}
          auditActive={auditActive}
          categoriesActive={categoriesActive}
          activeView={null}
        />

        <Layout.Content
          ref={mainContentRef}
          className="flex-1 overflow-auto px-4 py-4 md:p-8"
          style={{
            paddingBottom: "calc(6rem + var(--mobile-keyboard-inset, 0px))",
          }}
        >
          {children}
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

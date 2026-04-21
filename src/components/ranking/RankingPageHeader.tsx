import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dropdown, type MenuProps } from "antd";
import {
  HomeOutlined,
  LoginOutlined,
  LogoutOutlined,
  MenuOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useRankingUIContext } from "../../features/ranking/context";

const DASHBOARD_APPBAR_STYLE: React.CSSProperties = {
  position: "sticky",
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

export default function RankingPageHeader() {
  const { currentUser, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    mobileSidebarOpen,
    setMobileSidebarOpen,
    isPublicRankingRoute,
  } = useRankingUIContext();

  const currentUserInitial = useMemo(() => {
    if (!currentUser?.username) return "U";
    return currentUser.username.charAt(0).toUpperCase();
  }, [currentUser?.username]);

  const hideFloatingHeaderActions = mobileSidebarOpen;

  const userMenuItems = useMemo<MenuProps["items"]>(
    () => [
      {
        key: "home",
        icon: <HomeOutlined />,
        label: t("app.home"),
      },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: t("common.logout"),
        danger: true,
      },
    ],
    [t],
  );

  const guestMenuItems = useMemo<MenuProps["items"]>(
    () => [
      {
        key: "home",
        icon: <HomeOutlined />,
        label: t("app.home"),
      },
      {
        key: "login",
        icon: <LoginOutlined />,
        label: t("common.login"),
      },
    ],
    [t],
  );

  return (
    <div
      className={`z-[55] ${
        mobileSidebarOpen
          ? "opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto"
          : ""
      }`}
      style={DASHBOARD_APPBAR_STYLE}
    >
      <div className="flex h-14 items-center justify-between">
        <div>
          {!mobileSidebarOpen ? (
            <Button
              type="default"
              shape="circle"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden"
              aria-label={t("rankingPage.menu")}
              icon={<MenuOutlined />}
            />
          ) : null}
        </div>

        {currentUser && !hideFloatingHeaderActions ? (
          <Dropdown
            menu={{
              items: userMenuItems,
              onClick: ({ key }) => {
                if (key === "home") {
                  navigate("/");
                  return;
                }

                if (key === "logout") {
                  navigate("/");
                  logout();
                }
              },
            }}
            trigger={["click"]}
          >
            <Button
              type="text"
              shape="circle"
              title={t("rankingPage.userMenuTitle", {
                username: currentUser.username,
              })}
              aria-label={t("rankingPage.userMenuTitle", {
                username: currentUser.username,
              })}
            >
              {currentUserInitial}
            </Button>
          </Dropdown>
        ) : null}

        {isPublicRankingRoute && !currentUser && !hideFloatingHeaderActions ? (
          <Dropdown
            menu={{
              items: guestMenuItems,
              onClick: ({ key }) => {
                if (key === "home") {
                  navigate("/");
                  return;
                }

                if (key === "login") {
                  navigate("/ranking/login", {
                    state: {
                      from: `${location.pathname}${location.search}`,
                    },
                  });
                }
              },
            }}
            trigger={["click"]}
          >
            <Button
              type="text"
              shape="circle"
              aria-label={t("rankingPage.guestMenu")}
              icon={<UserOutlined />}
            />
          </Dropdown>
        ) : null}
      </div>
    </div>
  );
}

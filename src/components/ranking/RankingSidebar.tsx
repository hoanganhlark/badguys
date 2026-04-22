import {
  AppstoreOutlined,
  HomeOutlined,
  PlusCircleOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  TeamOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import {
  Button,
  Drawer,
  Layout,
  Menu,
  Space,
  Typography,
  type MenuProps,
} from "antd";
import { useTranslation } from "react-i18next";
import type { RankingView } from "./types";

interface RankingSidebarProps {
  currentView: RankingView;
  onSetView: (view: "member" | "match-form" | "ranking") => void;
  onGoHome: () => void;
  isAdmin: boolean;
  onGoUsers: () => void;
  onGoAudit?: () => void;
  onGoCategories?: () => void;
  showMatchForm?: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  usersActive?: boolean;
  auditActive?: boolean;
  categoriesActive?: boolean;
  activeView?: RankingView | null;
}

export default function RankingSidebar({
  currentView,
  onSetView,
  onGoHome,
  isAdmin,
  onGoUsers,
  onGoAudit,
  onGoCategories,
  showMatchForm = true,
  mobileOpen,
  onMobileClose,
  usersActive = false,
  auditActive = false,
  categoriesActive = false,
  activeView,
}: RankingSidebarProps) {
  const { t } = useTranslation();
  const highlightedView = activeView === undefined ? currentView : activeView;

  const selectedKey = usersActive
    ? "users"
    : auditActive
      ? "audit"
      : categoriesActive
        ? "categories"
        : (highlightedView ?? "ranking");

  const menuItems: MenuProps["items"] = [
    {
      key: "member",
      icon: <TeamOutlined />,
      label: t("rankingSidebar.members"),
    },
    ...(showMatchForm
      ? [
          {
            key: "match-form",
            icon: <PlusCircleOutlined />,
            label: t("rankingSidebar.addMatch"),
          },
        ]
      : []),
    {
      key: "ranking",
      icon: <TrophyOutlined />,
      label: t("rankingSidebar.ranking"),
    },
    {
      key: "how-it-works",
      icon: <QuestionCircleOutlined />,
      label: t("rankingSidebar.howItWorks"),
    },
    ...(isAdmin
      ? [
          {
            key: "users",
            icon: <SettingOutlined />,
            label: t("rankingSidebar.userManagement"),
          },
          ...(onGoAudit
            ? [
                {
                  key: "audit",
                  icon: <SettingOutlined />,
                  label: t("rankingSidebar.auditLogs"),
                },
              ]
            : []),
          ...(onGoCategories
            ? [
                {
                  key: "categories",
                  icon: <AppstoreOutlined />,
                  label: t("rankingSidebar.categories"),
                },
              ]
            : []),
        ]
      : []),
    {
      key: "home",
      icon: <HomeOutlined />,
      label: t("rankingSidebar.home"),
    },
  ];

  const handleSelectView = (nextView: string) => {
    if (
      nextView === "member" ||
      nextView === "match-form" ||
      nextView === "ranking"
    ) {
      onSetView(nextView as "member" | "match-form" | "ranking");
    }
    onMobileClose();
  };

  const handleMenuSelect: MenuProps["onClick"] = ({ key }) => {
    if (key === "home") {
      onGoHome();
      onMobileClose();
      return;
    }

    if (key === "users") {
      onGoUsers();
      onMobileClose();
      return;
    }

    if (key === "audit") {
      onGoAudit?.();
      onMobileClose();
      return;
    }

    if (key === "categories") {
      onGoCategories?.();
      onMobileClose();
      return;
    }

    if (
      key === "member" ||
      key === "match-form" ||
      key === "ranking" ||
      key === "how-it-works"
    ) {
      handleSelectView(key);
    }
  };

  return (
    <>
      <Drawer
        open={mobileOpen}
        onClose={onMobileClose}
        placement="left"
        width={320}
        title={
          <Space>
            <TrophyOutlined />
            <Typography.Text strong>BadGuys</Typography.Text>
          </Space>
        }
        className="md:hidden"
      >
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuSelect}
        />
      </Drawer>

      <Layout.Sider
        width={280}
        className="hidden md:block"
        theme="light"
        style={{
          borderRight: "1px solid rgba(5, 5, 5, 0.06)",
          padding: 16,
          position: "fixed",
          left: 0,
          top: 56,
          bottom: 0,
          zIndex: 40,
          overflowY: "auto",
        }}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Button type="text" onClick={onGoHome} style={{ textAlign: "left" }}>
            <Space>
              <TrophyOutlined />
              <Typography.Text strong>BadGuys</Typography.Text>
            </Space>
          </Button>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={handleMenuSelect}
          />
        </Space>
      </Layout.Sider>
      <div
        className="hidden md:block"
        style={{ width: 280, flex: "0 0 280px" }}
        aria-hidden="true"
      />
    </>
  );
}

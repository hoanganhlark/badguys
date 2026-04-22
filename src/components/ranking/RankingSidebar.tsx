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
import { useNavigate, useLocation } from "react-router-dom";

interface RankingSidebarProps {
  isAdmin: boolean;
  showMatchForm?: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function RankingSidebar({
  isAdmin,
  showMatchForm = true,
  mobileOpen,
  onMobileClose,
}: RankingSidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine selected key from current route
  const pathname = location.pathname;
  let selectedKey = "ranking"; // default

  if (pathname.includes("/users")) {
    selectedKey = "users";
  } else if (pathname.includes("/audit")) {
    selectedKey = "audit";
  } else if (pathname.includes("/categories")) {
    selectedKey = "categories";
  } else if (pathname.includes("/member")) {
    selectedKey = "member";
  } else if (pathname.includes("/match-form")) {
    selectedKey = "match-form";
  } else if (pathname.includes("/how-it-works")) {
    selectedKey = "how-it-works";
  }

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
          {
            key: "audit",
            icon: <SettingOutlined />,
            label: t("rankingSidebar.auditLogs"),
          },
          {
            key: "categories",
            icon: <AppstoreOutlined />,
            label: t("rankingSidebar.categories"),
          },
        ]
      : []),
    {
      key: "home",
      icon: <HomeOutlined />,
      label: t("rankingSidebar.home"),
    },
  ];

  const handleMenuSelect: MenuProps["onClick"] = ({ key }) => {
    const isPublicRankingRoute = pathname.startsWith("/ranking");
    const baseRoute = isPublicRankingRoute ? "/ranking" : "/dashboard";

    switch (key) {
      case "home":
        navigate("/");
        break;
      case "member":
      case "match-form":
      case "ranking":
      case "how-it-works":
        navigate(`${baseRoute}/${key}`);
        break;
      case "users":
        navigate("/dashboard/users");
        break;
      case "audit":
        navigate("/dashboard/audit");
        break;
      case "categories":
        navigate("/dashboard/categories");
        break;
    }

    onMobileClose();
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
            <Typography.Text strong>Badguys</Typography.Text>
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
          <Button
            type="text"
            onClick={() => navigate("/")}
            style={{ textAlign: "left" }}
          >
            <Space>
              <TrophyOutlined />
              <Typography.Text strong>Badguys</Typography.Text>
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

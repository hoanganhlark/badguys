import { Button, Dropdown, Layout } from "antd";
import { SettingOutlined, TrophyOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { useAuth } from "../context/AuthContext";
import AccountMenuDropdown from "./AccountMenuDropdown";

interface AppHeaderProps {
  onOpenConfig: () => void;
  rankingMenuItems: MenuProps["items"];
  userMenuItems: MenuProps["items"];
  configOpenLabel: string;
  rankingLabel: string;
  accountMenuLabel: string;
}

export default function AppHeader(props: AppHeaderProps) {
  const { isAuthenticated, currentUser } = useAuth();
  const {
    onOpenConfig,
    rankingMenuItems,
    userMenuItems,
    configOpenLabel,
    rankingLabel,
    accountMenuLabel,
  } = props;

  return (
    <Layout.Header
      className="z-40"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        lineHeight: "56px",
        padding: 0,
        borderBottom: "1px solid #e2e8f0",
        background: "rgba(250, 250, 250, 0.92)",
        backdropFilter: "blur(8px)",
        boxShadow: "0 2px 12px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4 md:px-6">
        <Button
          shape="circle"
          icon={<SettingOutlined />}
          onClick={onOpenConfig}
          aria-label={configOpenLabel}
        />

        {!isAuthenticated ? (
          <Dropdown menu={{ items: rankingMenuItems }} trigger={["click"]}>
            <Button
              shape="circle"
              icon={<TrophyOutlined />}
              aria-label={rankingLabel}
            />
          </Dropdown>
        ) : null}

        {isAuthenticated ? (
          <AccountMenuDropdown
            username={currentUser?.username}
            items={userMenuItems}
            ariaLabel={accountMenuLabel}
          />
        ) : null}
      </div>
    </Layout.Header>
  );
}

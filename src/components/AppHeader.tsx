import { Button, Dropdown } from "antd";
import { SettingOutlined, TrophyOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { useAuth } from "../context/AuthContext";
import AccountMenuDropdown from "./AccountMenuDropdown";
import SharedAppBar from "./SharedAppBar";

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
    <SharedAppBar
      position="fixed"
      className="z-40"
      contentClassName="flex h-14 items-center justify-between px-4"
      left={
        <Button
          shape="circle"
          icon={<SettingOutlined />}
          onClick={onOpenConfig}
          aria-label={configOpenLabel}
        />
      }
      right={
        isAuthenticated ? (
          <AccountMenuDropdown
            username={currentUser?.username}
            items={userMenuItems}
            ariaLabel={accountMenuLabel}
          />
        ) : (
          <Dropdown menu={{ items: rankingMenuItems }} trigger={["click"]}>
            <Button
              shape="circle"
              icon={<TrophyOutlined />}
              aria-label={rankingLabel}
            />
          </Dropdown>
        )
      }
    />
  );
}

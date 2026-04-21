import { UserOutlined } from "@ant-design/icons";
import { Button, Dropdown } from "antd";
import type { ButtonProps, MenuProps } from "antd";

type AccountMenuDropdownProps = {
  username?: string;
  items: MenuProps["items"];
  onMenuClick?: MenuProps["onClick"];
  ariaLabel: string;
  title?: string;
  buttonType?: ButtonProps["type"];
};

export default function AccountMenuDropdown({
  username,
  items,
  onMenuClick,
  ariaLabel,
  title,
  buttonType,
}: AccountMenuDropdownProps) {
  const initial = username?.charAt(0)?.toUpperCase();

  return (
    <Dropdown menu={{ items, onClick: onMenuClick }} trigger={["click"]}>
      <Button
        type={buttonType}
        shape="circle"
        aria-label={ariaLabel}
        title={title}
      >
        {initial || <UserOutlined />}
      </Button>
    </Dropdown>
  );
}

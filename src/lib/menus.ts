import type { MenuProps } from "antd";
import {
  LogoutOutlined,
  TrophyOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import { Typography } from "antd";
import React from "react";

export interface RankingMenuOptions {
  onViewRanking: () => void;
  onLogin: () => void;
  t: (key: string) => string;
}

export interface UserMenuOptions {
  username: string;
  onOpenDashboard: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
  t: (key: string) => string;
}

export function buildRankingMenuItems(
  options: RankingMenuOptions,
): MenuProps["items"] {
  const { onViewRanking, onLogin, t } = options;

  return [
    {
      key: "ranking-view",
      label: t("app.viewRanking"),
      onClick: onViewRanking,
    },
    {
      key: "ranking-login",
      label: t("common.login"),
      onClick: onLogin,
    },
  ];
}

export function buildUserMenuItems(
  options: UserMenuOptions,
): MenuProps["items"] {
  const { username, onOpenDashboard, onChangePassword, onLogout, t } = options;

  return [
    {
      key: "user-name",
      label: React.createElement(
        Typography.Text,
        { strong: true, style: { maxWidth: 130 }, ellipsis: true },
        username,
      ),
      disabled: true,
    },
    {
      key: "dashboard-open",
      label: t("app.openDashboard"),
      icon: React.createElement(TrophyOutlined),
      onClick: onOpenDashboard,
    },
    {
      key: "password-change",
      label: t("app.changePasswordTitle"),
      icon: React.createElement(KeyOutlined),
      onClick: onChangePassword,
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      label: t("common.logout"),
      icon: React.createElement(LogoutOutlined),
      danger: true,
      onClick: onLogout,
    },
  ];
}

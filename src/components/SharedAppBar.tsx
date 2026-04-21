import { Layout } from "antd";
import type { ReactNode } from "react";

type SharedAppBarProps = {
  position?: "fixed" | "sticky";
  zIndex?: number;
  className?: string;
  contentClassName?: string;
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
};

export default function SharedAppBar({
  position = "sticky",
  zIndex = 55,
  className,
  contentClassName = "flex h-14 items-center justify-between px-4",
  left,
  center,
  right,
}: SharedAppBarProps) {
  return (
    <Layout.Header
      className={className}
      style={{
        position,
        top: 0,
        left: 0,
        right: 0,
        zIndex,
        height: 56,
        lineHeight: "56px",
        padding: 0,
        borderBottom: "1px solid #e2e8f0",
        background: "rgba(250, 250, 250, 0.92)",
        backdropFilter: "blur(8px)",
        boxShadow: "0 2px 12px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div className={contentClassName}>
        <div>{left}</div>
        <div>{center}</div>
        <div>{right}</div>
      </div>
    </Layout.Header>
  );
}

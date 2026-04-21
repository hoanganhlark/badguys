import { useState, useEffect } from "react";
import { Layout } from "antd";
import { isSupabaseReady } from "../lib/api";
import { useUsers } from "../hooks/queries";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  RankingUIProvider,
  useRankingUIContext,
  RankingMembersProvider,
  useRankingMembersContext,
  RankingMatchesProvider,
} from "../features/ranking/context";
import RankingPageHeader from "./ranking/RankingPageHeader";
import RankingPageContent from "./ranking/RankingViewContent";
import RankingSidebar from "./ranking/RankingSidebar";
import PlayerStatsModalWrapper from "./ranking/PlayerStatsModalWrapper";

interface RankingPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RankingPage({ isOpen, onClose }: RankingPageProps) {
  const { currentUser, isAdmin } = useAuth();
  const { users } = useUsers();
  const location = useLocation();
  const isPublicRankingRoute = location.pathname.startsWith("/ranking");

  const [usernamesById, setUsernamesById] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || !isSupabaseReady()) return;

    const nextMap = users.reduce<Record<string, string>>((acc, user) => {
      acc[user.id] = user.username;
      return acc;
    }, {});
    setUsernamesById(nextMap);
  }, [isOpen, users]);

  if (!isOpen) return null;

  return (
    <RankingUIProvider
      isOpen={isOpen}
      onClose={onClose}
      isPublicRankingRoute={isPublicRankingRoute}
    >
      <RankingMembersProvider isAdmin={isAdmin}>
        <RankingMatchesBridge
          currentUserId={currentUser?.userId || ""}
          currentUsername={currentUser?.username || ""}
          usernamesById={usernamesById}
        >
          <RankingPageInner onClose={onClose} />
        </RankingMatchesBridge>
      </RankingMembersProvider>
    </RankingUIProvider>
  );
}

function RankingMatchesBridge({
  currentUserId,
  currentUsername,
  usernamesById,
  children,
}: {
  currentUserId: string;
  currentUsername: string;
  usernamesById: Record<string, string>;
  children: React.ReactNode;
}) {
  const { isAdmin } = useAuth();
  const { members } = useRankingMembersContext();

  return (
    <RankingMatchesProvider
      members={members}
      currentUserId={currentUserId}
      currentUsername={currentUsername}
      isAdmin={isAdmin}
      usernamesById={usernamesById}
    >
      {children}
    </RankingMatchesProvider>
  );
}

function RankingPageInner({ onClose }: { onClose: () => void }) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { view, setViewWithRoute, mobileSidebarOpen, setMobileSidebarOpen } =
    useRankingUIContext();
  const isPublicRankingRoute = location.pathname.startsWith("/ranking");

  const categoriesActive = location.pathname === "/dashboard/categories";

  return (
    <div className="min-h-screen">
      <div className="min-h-screen w-full text-slate-900 font-sans">
        <RankingPageHeader />

        <Layout hasSider style={{ minHeight: 0 }}>
          <RankingSidebar
            currentView={view}
            onSetView={setViewWithRoute}
            onGoHome={onClose}
            isAdmin={isAdmin}
            onGoUsers={() => navigate("/dashboard/users")}
            onGoAudit={() => navigate("/dashboard/audit")}
            onGoCategories={() => navigate("/dashboard/categories")}
            showMatchForm={!isPublicRankingRoute}
            mobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
            categoriesActive={categoriesActive}
          />

          <Layout.Content>
            <main
              className="flex-1 overflow-auto px-4 py-4 md:p-8 relative"
              style={{
                paddingBottom: "calc(6rem + var(--mobile-keyboard-inset, 0px))",
              }}
            >
              <RankingPageContent />
            </main>
          </Layout.Content>
        </Layout>
      </div>

      <PlayerStatsModalWrapper />
    </div>
  );
}

import { useState } from 'react';
import {
  Clapperboard,
  CreditCard,
  Film,
  FolderDown,
  LayoutGrid,
  Menu,
  Mic,
  Scissors,
  Shield,
  UserCircle,
  X,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VyroLogo } from './components/VyroLogo';
import { AuthModal } from './components/AuthModal';
import { StudioOverview } from './components/StudioOverview';
import { VideoGeneratorView } from './components/VideoGeneratorView';
import { AudioLipSyncView } from './components/AudioLipSyncView';
import { StoryCharactersView } from './components/StoryCharactersView';
import { EditingStudioView } from './components/EditingStudioView';
import { ProjectsDownloadsView } from './components/ProjectsDownloadsView';
import { AccountBillingView } from './components/AccountBillingView';
import { AdminConsoleView } from './components/AdminConsoleView';
import { NavSection, StudioTransferPayload } from './types/studio';

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  breadcrumb: string;
  icon: typeof LayoutGrid;
}> = [
  {
    id: 'overview',
    label: 'Studio Hub',
    breadcrumb: 'VYRO Studio / Overview',
    icon: LayoutGrid,
  },
  {
    id: 'video',
    label: 'Video Generator',
    breadcrumb: 'Production / AI Video Engine',
    icon: Film,
  },
  {
    id: 'audio-lipsync',
    label: 'Voice, Lip Sync & Music',
    breadcrumb: 'Audio Suite / TTS, Visemes & Score',
    icon: Mic,
  },
  {
    id: 'story-characters',
    label: 'Story & Characters',
    breadcrumb: 'Pre-Production / Consistency & Scripts',
    icon: Clapperboard,
  },
  {
    id: 'editor',
    label: 'Editing Studio',
    breadcrumb: 'Post-Production / NLE Timeline',
    icon: Scissors,
  },
  {
    id: 'downloads',
    label: 'Projects & Downloads',
    breadcrumb: 'Library / Queue & Download Center',
    icon: FolderDown,
  },
  {
    id: 'billing',
    label: 'Account & Plans',
    breadcrumb: 'Workspace / Subscription',
    icon: CreditCard,
  },
  {
    id: 'admin',
    label: 'Admin Console',
    breadcrumb: 'Operations / GPU & Governance',
    icon: Shield,
  },
];

function StudioShell() {
  const { dbUser, loadingAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<NavSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [editorPayload, setEditorPayload] =
    useState<StudioTransferPayload | null>(null);

  const currentNav =
    NAV_ITEMS.find((n) => n.id === activeTab) ?? NAV_ITEMS[0];

  const handleNavigate = (tab: NavSection) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleSendToEditor = (payload: StudioTransferPayload) => {
    setEditorPayload(payload);
    setActiveTab('editor');
  };

  return (
    <div className="min-h-screen bg-[#06070B] text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-800/80 bg-[#090B10]">
        <div className="h-16 px-5 flex items-center border-b border-slate-800/80">
          <button
            type="button"
            onClick={() => handleNavigate('overview')}
            className="focus:outline-none"
          >
            <VyroLogo />
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-600/15 text-blue-300 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80">
          <p className="text-xs text-slate-500">Your Imagination. AI Creates.</p>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-full bg-[#090B10] border-r border-slate-800 flex flex-col z-50">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
              <VyroLogo />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-600/15 text-blue-300 border border-blue-500/30'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 border-b border-slate-800/80 bg-[#06070B]/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs sm:text-sm font-medium text-slate-300 truncate">
              {currentNav.breadcrumb}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {loadingAuth ? (
              <span className="text-xs text-slate-500">Syncing...</span>
            ) : dbUser ? (
              <button
                type="button"
                onClick={() => handleNavigate('billing')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0D1017] hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 whitespace-nowrap shrink-0"
              >
                <UserCircle className="w-4 h-4 text-blue-400" />
                <span className="max-w-[140px] truncate">
                  {dbUser.displayName || dbUser.email}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Viewport */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1440px] w-full mx-auto">
          {activeTab === 'overview' && (
            <StudioOverview
              onNavigate={handleNavigate}
              onOpenAuth={() => setAuthModalOpen(true)}
            />
          )}
          {activeTab === 'video' && (
            <VideoGeneratorView
              onOpenAuth={() => setAuthModalOpen(true)}
              onSendToEditor={handleSendToEditor}
              onNavigate={handleNavigate}
            />
          )}
          {activeTab === 'audio-lipsync' && (
            <AudioLipSyncView
              onOpenAuth={() => setAuthModalOpen(true)}
              onSendToEditor={handleSendToEditor}
            />
          )}
          {activeTab === 'story-characters' && (
            <StoryCharactersView
              onOpenAuth={() => setAuthModalOpen(true)}
              onSendToEditor={handleSendToEditor}
            />
          )}
          {activeTab === 'editor' && (
            <EditingStudioView
              transferPayload={editorPayload}
              onOpenAuth={() => setAuthModalOpen(true)}
            />
          )}
          {activeTab === 'downloads' && (
            <ProjectsDownloadsView
              onOpenAuth={() => setAuthModalOpen(true)}
              onOpenProjectInEditor={handleSendToEditor}
            />
          )}
          {activeTab === 'billing' && (
            <AccountBillingView onOpenAuth={() => setAuthModalOpen(true)} />
          )}
          {activeTab === 'admin' && <AdminConsoleView />}
        </main>
      </div>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StudioShell />
    </AuthProvider>
  );
}

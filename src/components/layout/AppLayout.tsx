import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useTrackVisit } from '@/lib/useTrackVisit';

export function AppLayout() {
  useTrackVisit();

  return (
    <div className="flex min-h-screen bg-[#f8fafc] dark:bg-slate-900">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <TopBar />
        <main className="px-4 py-6 lg:px-8 lg:py-8 max-w-[1600px] mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

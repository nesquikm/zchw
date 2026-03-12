import { Outlet } from '@tanstack/react-router';
import { Sidebar } from '../components/layout/sidebar';

export function RootLayout() {
  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}

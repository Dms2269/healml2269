import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 dark:bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white shadow-xl shadow-amber-900/20 border border-amber-400 animate-bounce">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Offline Mode — Cached data and local SQLite buffer active.</span>
    </div>
  );
};

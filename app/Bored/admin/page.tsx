'use client';

import React, { useEffect, useState } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, ChevronDownIcon, ClockIcon, SearchIcon, BookmarkIcon, PlayIcon } from '../lib/icons';

interface UserAnalytics {
  id: string;
  email: string;
  name: string;
  image: string;
  createdAt: number;
  stats: {
    watchlistCount: number;
    historyCount: number;
  };
  watchlistItems?: {
    title: string;
    poster: string;
    mediaType: 'movie' | 'tv';
    year: string;
  }[];
  recentHistory: {
    title: string;
    mediaType: 'movie' | 'tv';
    progress: number;
    duration: number;
    timestamp: number;
    poster?: string;
    backdrop?: string;
    season?: number;
    episode?: number;
    episodeTitle?: string;
  }[];
}

interface AnalyticsData {
  summary: {
    totalUsers: number;
    totalWatchlistItems: number;
    totalHistoryItems: number;
  };
  users: UserAnalytics[];
}

export default function AdminDashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const isAuthorizedAdmin = isSignedIn && user?.primaryEmailAddress?.emailAddress === adminEmail;

  // Fetch analytics data
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    if (!isAuthorizedAdmin) {
      setLoading(false);
      return;
    }

    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/admin/analytics');
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('Forbidden: You do not have admin access');
          }
          throw new Error('Failed to load analytics data');
        }
        const json = await res.json();
        setData(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [isLoaded, isSignedIn, isAuthorizedAdmin]);

  const toggleExpand = (userId: string) => {
    setExpandedUsers((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const filteredUsers = data?.users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // 1. Clerk still loading state
  if (!isLoaded || (loading && isAuthorizedAdmin)) {
    return (
      <div className="admin-bg min-h-screen flex items-center justify-center text-white font-sans bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-t-white border-white/10 animate-spin" />
          <span className="text-gray-400 text-sm tracking-wider uppercase">Loading Analytics...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated state
  if (!isSignedIn) {
    return (
      <div className="admin-bg min-h-screen flex items-center justify-center text-white font-sans bg-[#0a0a0a] px-4">
        <div className="max-w-md w-full bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-xl text-center">
          <h2 className="text-2xl font-bold mb-2">Admin Panel Access</h2>
          <p className="text-gray-400 mb-6 text-sm">Please sign in with your administrator account to access dashboard metrics.</p>
          <SignInButton mode="modal">
            <button className="w-full bg-white text-black font-semibold py-3 px-6 rounded-full hover:bg-gray-200 transition-colors">
              Sign In
            </button>
          </SignInButton>
          <button onClick={() => router.push('/Bored')} className="mt-4 text-xs text-gray-400 hover:text-white underline transition-colors block mx-auto">
            Back to Bored Route
          </button>
        </div>
      </div>
    );
  }

  // 3. Authenticated but unauthorized email state
  if (!isAuthorizedAdmin || error) {
    return (
      <div className="admin-bg min-h-screen flex items-center justify-center text-white font-sans bg-[#0a0a0a] px-4">
        <div className="max-w-md w-full bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-xl text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            🔒
          </div>
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-6 text-sm">
            {error || `Account (${user.primaryEmailAddress?.emailAddress}) does not have admin permissions.`}
          </p>
          <button
            onClick={() => router.push('/Bored')}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-full transition-colors border border-white/10"
          >
            Back to Bored Route
          </button>
        </div>
      </div>
    );
  }

  // 4. Authorized Admin Dashboard UI
  return (
    <div className="admin-bg min-h-screen text-white font-sans bg-[#050505] pb-12 px-4 md:px-8">
      {/* Decorative gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto pt-8 relative z-10">
        {/* Back Button & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <button
              onClick={() => router.push('/Bored')}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 w-fit"
            >
              <div className="w-4 h-4 flex items-center justify-center"><ArrowLeftIcon /></div>
              <span>Back to Browse</span>
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">Real-time metrics, register details, and user watch records.</p>
          </div>
          <div className="text-right text-xs text-gray-400 bg-white/5 border border-white/5 px-4 py-2.5 rounded-2xl w-fit">
            Logged in as: <span className="text-white font-semibold block mt-0.5">{user.primaryEmailAddress?.emailAddress}</span>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/[0.03] border border-white/10 p-6 rounded-2xl backdrop-blur-lg">
            <span className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Total Users</span>
            <h3 className="text-4xl font-extrabold mt-1">{data?.summary.totalUsers || 0}</h3>
          </div>
          <div className="bg-white/[0.03] border border-white/10 p-6 rounded-2xl backdrop-blur-lg">
            <span className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Total Watchlist Items</span>
            <h3 className="text-4xl font-extrabold mt-1">{data?.summary.totalWatchlistItems || 0}</h3>
          </div>
          <div className="bg-white/[0.03] border border-white/10 p-6 rounded-2xl backdrop-blur-lg">
            <span className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Total Watch Logs</span>
            <h3 className="text-4xl font-extrabold mt-1">{data?.summary.totalHistoryItems || 0}</h3>
          </div>
        </div>

        {/* Users Management Glass Box */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
          {/* Header & Search */}
          <div className="p-6 border-bottom border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5">
            <h2 className="text-xl font-bold">Registered Users</h2>
            <div className="relative max-w-sm w-full">
              <div className="absolute inset-y-0 left-3 flex items-center justify-center pointer-events-none text-gray-400 w-4 h-4 my-auto">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Search name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white/20 transition-all placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Users List */}
          <div className="divide-y divide-white/5">
            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-sm">
                No users matching query found.
              </div>
            ) : (
              filteredUsers.map((item) => {
                const isExpanded = !!expandedUsers[item.id];
                return (
                  <div key={item.id} className="transition-colors hover:bg-white/[0.01]">
                    {/* User Summary Bar */}
                    <div
                      onClick={() => toggleExpand(item.id)}
                      className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image || '/blue-profile.png'}
                          alt={item.name}
                          className="w-10 h-10 rounded-full object-cover border border-white/10"
                        />
                        <div className="overflow-hidden">
                          <h4 className="font-bold text-sm truncate">{item.name}</h4>
                          <span className="text-xs text-gray-400 block truncate">{item.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 md:gap-12">
                        <div className="text-left md:text-right">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Joined</span>
                          <span className="text-xs font-medium">{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-left md:text-right">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Watchlist</span>
                          <span className="text-xs font-medium flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 text-gray-400"><BookmarkIcon /></span>
                            {item.stats.watchlistCount}
                          </span>
                        </div>
                        <div className="text-left md:text-right">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Watching</span>
                          <span className="text-xs font-medium flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 text-gray-400"><PlayIcon /></span>
                            {item.stats.historyCount}
                          </span>
                        </div>
                        <button
                          className={`w-6 h-6 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        >
                          <div className="w-3.5 h-3.5 flex items-center justify-center"><ChevronDownIcon /></div>
                        </button>
                      </div>
                    </div>

                    {/* Expandable Activity Details */}
                    {isExpanded && (
                      <div className="px-6 pb-6 pt-4 border-t border-white/[0.02] bg-black/20">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* Watchlist Column */}
                          <div>
                            <h5 className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider mb-3 flex items-center gap-1.5 border-b border-white/5 pb-2">
                              <span className="w-3.5 h-3.5"><BookmarkIcon /></span> Watchlist Titles
                            </h5>
                            {!item.watchlistItems || item.watchlistItems.length === 0 ? (
                              <p className="text-xs text-gray-500 italic">No watchlist items saved.</p>
                            ) : (
                              <div className="max-h-[250px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                                {item.watchlistItems.map((w, index) => (
                                  <div key={index} className="bg-white/[0.02] border border-white/5 p-2 rounded-xl flex items-center gap-3">
                                    <img 
                                      src={w.poster || '/blue-profile.png'} 
                                      alt={w.title}
                                      className="w-10 h-14 rounded object-cover bg-white/5" 
                                    />
                                    <div className="overflow-hidden">
                                      <span className="text-xs font-bold block truncate">{w.title}</span>
                                      <span className="text-[10px] text-gray-400 block mt-0.5">{w.year} • {w.mediaType.toUpperCase()}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Watch History Column */}
                          <div>
                            <h5 className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider mb-3 flex items-center gap-1.5 border-b border-white/5 pb-2">
                              <span className="w-3.5 h-3.5"><PlayIcon /></span> Watch History & Progress
                            </h5>
                            {item.recentHistory.length === 0 ? (
                              <p className="text-xs text-gray-500 italic">No watched items recorded yet.</p>
                            ) : (
                              <div className="max-h-[250px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                                {item.recentHistory.map((h, index) => {
                                  const pct = h.duration > 0 ? Math.min(100, Math.round((h.progress / h.duration) * 100)) : 0;
                                  return (
                                    <div key={index} className="bg-white/[0.02] border border-white/5 p-2 rounded-xl flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                                        <img 
                                          src={h.poster || h.backdrop || '/blue-profile.png'} 
                                          alt={h.title}
                                          className="w-10 h-14 rounded object-cover bg-white/5" 
                                        />
                                        <div className="overflow-hidden flex-1">
                                          <div className="flex items-center gap-1.5 mb-1">
                                            <span className="text-xs font-bold truncate block">{h.title}</span>
                                            <span className="text-[8px] bg-white/10 px-1 py-0.2 rounded text-gray-300 uppercase font-bold flex-shrink-0">
                                              {h.mediaType}
                                            </span>
                                          </div>
                                          {h.episodeTitle && (
                                            <span className="text-[10px] text-gray-400 block truncate -mt-0.5 mb-1">
                                              S{h.season}E{h.episode} - {h.episodeTitle}
                                            </span>
                                          )}
                                          <div className="flex items-center gap-2">
                                            <div className="w-16 bg-white/10 h-1.5 rounded-full overflow-hidden">
                                              <div className="bg-white h-full" style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="text-[9px] text-gray-400">{pct}%</span>
                                          </div>
                                        </div>
                                      </div>
                                      <span className="text-[9px] text-gray-400 whitespace-nowrap align-self-start pr-1">{formatTime(h.timestamp)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

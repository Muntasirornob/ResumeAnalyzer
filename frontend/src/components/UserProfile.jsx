import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext.jsx';

const UserProfile = () => {
    const { user, logout } = useContext(AuthContext);

    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center px-4">
                <div className="flex items-center gap-2.5 text-sm text-slate-500">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500" />
                    Loading profile…
                </div>
            </div>
        );
    }

    const initial = user.username?.[0]?.toUpperCase() ?? '?'

    return (
        <div className="flex min-h-screen items-center justify-center px-4 py-12">
            <div className="w-full max-w-sm rounded-[1.75rem] border border-white/70 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.1)] backdrop-blur-sm">
                <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-2xl font-bold text-sky-700 ring-4 ring-sky-50">
                        {initial}
                    </div>
                    <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{user.username}</h2>
                    {user.email ? (
                        <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                    ) : null}
                </div>

                <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-100">
                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Username</span>
                        <span className="text-sm font-semibold text-slate-900">{user.username}</span>
                    </div>
                    {user.email ? (
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Email</span>
                            <span className="max-w-[190px] truncate text-sm font-semibold text-slate-900">{user.email}</span>
                        </div>
                    ) : null}
                </div>

                <button
                    onClick={logout}
                    className="mt-5 w-full rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 active:scale-[0.98]"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default UserProfile;
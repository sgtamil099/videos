import { useCallback, useEffect, useState } from 'react';
import { Activity, Cpu, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  AiModelRecord,
  DbUser,
  GpuNodeRecord,
  RenderJobRecord,
} from '../types/studio';

interface AdminOverviewPayload {
  users: DbUser[];
  renderJobs: RenderJobRecord[];
  aiModels: AiModelRecord[];
  gpuNodes: GpuNodeRecord[];
  revenue: {
    mrrUsd: number;
    activeSubscriptions: number;
    totalCreditsIssued: number;
  };
}

export function AdminConsoleView() {
  const { dbUser, authFetch } = useAuth();
  const [data, setData] = useState<AdminOverviewPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAdmin = useCallback(async () => {
    if (!dbUser || dbUser.role !== 'admin') return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/admin/overview');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load admin console');
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Admin load failed');
    } finally {
      setLoading(false);
    }
  }, [authFetch, dbUser]);

  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

  if (!dbUser || dbUser.role !== 'admin') {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0D1017] p-10 text-center space-y-3">
        <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto" />
        <h2 className="font-display text-xl font-semibold text-slate-100">
          Administrator Access Required
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          The Admin Console is restricted to accounts with the PostgreSQL
          <code className="mx-1 text-slate-200">admin</code> role (auto-assigned
          to <span className="text-blue-300 font-mono">sgtamil099@gmail.com</span>{' '}
          and the primary workspace owner).
        </p>
      </div>
    );
  }

  const handleToggleModel = async (model: AiModelRecord) => {
    await authFetch(`/api/admin/models/${model.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !model.enabled }),
    });
    await loadAdmin();
  };

  const handleToggleRole = async (user: DbUser) => {
    const nextRole = user.role === 'admin' ? 'creator' : 'admin';
    await authFetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: nextRole }),
    });
    await loadAdmin();
  };

  const handleCancelJob = async (job: RenderJobRecord) => {
    await authFetch(`/api/admin/jobs/${job.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'cancelled',
        progress: 0,
        errorMessage: 'Cancelled by administrator',
      }),
    });
    await loadAdmin();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-100">
            Admin Console & GPU Telemetry
          </h1>
          <p className="text-sm text-slate-400">
            User Management, GPU Cluster Monitoring, Render Queue, Models &
            Revenue
          </p>
        </div>
        <button
          type="button"
          onClick={loadAdmin}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#131722] border border-slate-800 text-xs font-medium text-slate-200"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-950/40 border border-red-900/60 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Revenue Analytics */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#0D1017] p-5">
          <p className="text-xs text-slate-400 mb-1">Monthly Recurring Revenue</p>
          <p className="font-mono text-2xl font-semibold text-emerald-400 tabular-nums">
            ${data?.revenue.mrrUsd ?? 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {data?.revenue.activeSubscriptions ?? 0} active subscriptions
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0D1017] p-5">
          <p className="text-xs text-slate-400 mb-1">Registered Creators</p>
          <p className="font-mono text-2xl font-semibold text-slate-100 tabular-nums">
            {data?.users.length ?? 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">PostgreSQL users table</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0D1017] p-5">
          <p className="text-xs text-slate-400 mb-1">Total Credits Issued</p>
          <p className="font-mono text-2xl font-semibold text-blue-400 tabular-nums">
            {(data?.revenue.totalCreditsIssued ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">Across active accounts</p>
        </div>
      </section>

      {/* GPU Cluster Monitoring */}
      <section className="rounded-xl border border-slate-800 bg-[#0D1017] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-400" />
          <h2 className="font-display text-base font-semibold text-slate-100">
            NVIDIA CUDA & Cloud GPU Infrastructure
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(data?.gpuNodes ?? []).map((gpu) => (
            <div
              key={gpu.id}
              className="rounded-lg border border-slate-800 bg-[#06070B] p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-slate-100">
                  {gpu.name}
                </span>
                <span
                  className={`text-xs font-mono ${
                    gpu.status === 'online'
                      ? 'text-emerald-400'
                      : 'text-slate-400'
                  }`}
                >
                  {gpu.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">{gpu.architecture}</p>
              <p className="text-xs text-slate-500">{gpu.location}</p>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs font-mono tabular-nums">
                <div>
                  <span className="text-slate-500 block">VRAM</span>
                  <span className="text-slate-200">
                    {gpu.vramUsedGb}/{gpu.vramTotalGb}GB
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">CUDA</span>
                  <span className="text-slate-200">{gpu.cudaVersion}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">TEMP</span>
                  <span className="text-slate-200">{gpu.tempCelsius}°C</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Model Management */}
      <section className="rounded-xl border border-slate-800 bg-[#0D1017] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-400" />
          <h2 className="font-display text-base font-semibold text-slate-100">
            AI Model Registry Control
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-4">Model</th>
                <th className="py-2 pr-4">Provider</th>
                <th className="py-2 pr-4">VRAM</th>
                <th className="py-2 pr-4">Availability</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(data?.aiModels ?? []).map((m) => (
                <tr key={m.id}>
                  <td className="py-2.5 pr-4 font-medium text-slate-100">
                    {m.name}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-400">{m.provider}</td>
                  <td className="py-2.5 pr-4 font-mono tabular-nums text-slate-300">
                    {m.vramGb} GB
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-slate-400">
                    {m.availability}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleModel(m)}
                      className={`px-2.5 py-1 rounded text-xs font-medium ${
                        m.enabled
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {m.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* User Management & Queue Management */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-xl border border-slate-800 bg-[#0D1017] p-6 space-y-3">
          <h2 className="font-display text-base font-semibold text-slate-100">
            User Directory
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Plan</th>
                  <th className="py-2 pr-3">Credits</th>
                  <th className="py-2 text-right">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(data?.users ?? []).map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 pr-3 text-slate-200">{u.email}</td>
                    <td className="py-2.5 pr-3 font-mono text-slate-400">
                      {u.plan}
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-slate-300">
                      {u.credits}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleRole(u)}
                        className="text-blue-400 hover:text-blue-300 font-mono"
                      >
                        {u.role}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-[#0D1017] p-6 space-y-3">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Global Rendering Queue ({data?.renderJobs.length ?? 0})
          </h2>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-3">Job</th>
                  <th className="py-2 pr-3">Engine</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 text-right">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(data?.renderJobs ?? []).map((j) => (
                  <tr key={j.id}>
                    <td className="py-2 pr-3 text-slate-200">{j.title}</td>
                    <td className="py-2 pr-3 font-mono text-slate-400">
                      {j.modelId}
                    </td>
                    <td className="py-2 pr-3 font-mono text-slate-300">
                      {j.status}
                    </td>
                    <td className="py-2 text-right">
                      {j.status !== 'cancelled' && j.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => handleCancelJob(j)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

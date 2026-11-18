import { useState } from 'react';
import { CreditCard, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AccountBillingViewProps {
  onOpenAuth: () => void;
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    audience: 'For individual experimentation',
    priceUsd: 0,
    credits: '500 credits / mo',
    gpuHours: '4 Cloud GPU hours',
    maxRes: '1080p MP4 Export',
  },
  {
    id: 'pro',
    name: 'Pro Creator',
    audience: 'For independent filmmakers & creators',
    priceUsd: 29,
    credits: '2,500 credits / mo',
    gpuHours: '25 A100 GPU hours',
    maxRes: '4K MP4 & MOV Export',
  },
  {
    id: 'studio',
    name: 'Studio Production',
    audience: 'For scaling creative teams',
    priceUsd: 99,
    credits: '10,000 credits / mo',
    gpuHours: '120 Multi-GPU hours',
    maxRes: '8K Upscale + Priority Queue',
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pod',
    audience: 'For studios & custom CUDA clusters',
    priceUsd: 299,
    credits: '45,000 credits / mo',
    gpuHours: '500 H100 NVLink hours',
    maxRes: '8K ProRes + Dedicated Worker',
  },
];

export function AccountBillingView({ onOpenAuth }: AccountBillingViewProps) {
  const { dbUser, subscription, authFetch, refreshWorkspace, logout } =
    useAuth();
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!dbUser) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0D1017] p-10 text-center space-y-4">
        <CreditCard className="w-8 h-8 text-blue-400 mx-auto" />
        <h2 className="font-display text-xl font-semibold text-slate-100">
          Account & Subscription Management
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Sign in to manage your VYRO AI STUDIO credits, GPU quota hours, and
          billing tier.
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
        >
          Sign in to Studio
        </button>
      </div>
    );
  }

  const handleSelectPlan = async (planId: string) => {
    setUpdating(planId);
    setMessage(null);
    try {
      const res = await authFetch('/api/subscription/change', {
        method: 'POST',
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to switch plan');
      await refreshWorkspace();
      setMessage(`Subscription updated to ${planId.toUpperCase()} tier.`);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Subscription error');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-100">
            Account & Subscription Management
          </h1>
          <p className="text-sm text-slate-400">
            Authenticated via Firebase Auth · Persisted in PostgreSQL
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 self-start"
        >
          Sign Out
        </button>
      </div>

      {/* Account Summary */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#0D1017] p-5">
          <p className="text-xs text-slate-400 mb-1">Creator Identity</p>
          <p className="text-sm font-semibold text-slate-100">
            {dbUser.displayName || dbUser.email}
          </p>
          <p className="text-xs text-slate-500 mt-1">{dbUser.email}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0D1017] p-5">
          <p className="text-xs text-slate-400 mb-1">Active Plan & Role</p>
          <p className="text-sm font-semibold text-blue-400 uppercase font-mono">
            {dbUser.plan} · {dbUser.role}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Renews {subscription?.renewDate || 'Monthly'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0D1017] p-5">
          <p className="text-xs text-slate-400 mb-1">Available Studio Credits</p>
          <p className="font-mono text-2xl font-semibold text-slate-100 tabular-nums">
            {dbUser.credits.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {subscription?.gpuQuotaHours ?? 25} GPU hrs / cycle
          </p>
        </div>
      </section>

      {message && (
        <div className="rounded-lg border border-blue-900/60 bg-blue-950/30 p-3.5 text-xs text-blue-200 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" />
          <span>{message}</span>
        </div>
      )}

      {/* Plans Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = dbUser.plan === plan.id;
          return (
            <div
              key={plan.id}
              className={`rounded-xl border p-6 flex flex-col justify-between gap-6 ${
                isCurrent
                  ? 'border-blue-500 bg-[#111624]'
                  : 'border-slate-800 bg-[#0D1017]'
              }`}
            >
              <div className="space-y-3">
                <div>
                  <h3 className="font-display text-lg font-semibold text-slate-100">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-slate-400">{plan.audience}</p>
                </div>

                <p className="font-mono text-3xl font-semibold text-slate-100 tabular-nums">
                  ${plan.priceUsd}
                  <span className="text-xs font-sans font-normal text-slate-500">
                    {' '}
                    / month
                  </span>
                </p>

                <ul className="space-y-2 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
                  <li>{plan.credits}</li>
                  <li>{plan.gpuHours}</li>
                  <li>{plan.maxRes}</li>
                </ul>
              </div>

              <button
                type="button"
                disabled={isCurrent || updating === plan.id}
                onClick={() => handleSelectPlan(plan.id)}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-medium transition-colors ${
                  isCurrent
                    ? 'bg-slate-800 text-slate-400 cursor-default'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {isCurrent
                  ? 'Current Active Plan'
                  : updating === plan.id
                  ? 'Updating...'
                  : `Switch to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </section>
    </div>
  );
}

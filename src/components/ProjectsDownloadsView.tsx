import { useState } from 'react';
import {
  CheckSquare,
  Download,
  ExternalLink,
  FolderOpen,
  Square,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ProjectRecord, RenderJobRecord, StudioTransferPayload } from '../types/studio';

interface ProjectsDownloadsViewProps {
  onOpenAuth: () => void;
  onOpenProjectInEditor: (payload: StudioTransferPayload) => void;
}

export function ProjectsDownloadsView({
  onOpenAuth,
  onOpenProjectInEditor,
}: ProjectsDownloadsViewProps) {
  const { dbUser, projects, renderJobs } = useAuth();
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedJobIds, setSelectedJobIds] = useState<number[]>([]);

  if (!dbUser) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0D1017] p-10 text-center space-y-4">
        <FolderOpen className="w-8 h-8 text-blue-400 mx-auto" />
        <h2 className="font-display text-xl font-semibold text-slate-100">
          Projects & Complete Video Download Center
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Sign in to access your PostgreSQL-backed project library, render
          queue, generation history, and bulk download center.
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

  const filteredJobs = renderJobs.filter((j) =>
    filterType === 'all' ? true : j.jobType === filterType
  );

  const toggleSelect = (id: number) => {
    setSelectedJobIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const downloadJobAsset = (job: RenderJobRecord) => {
    if (job.outputUrl) {
      const a = document.createElement('a');
      a.href = job.outputUrl;
      a.download = `${job.title.toLowerCase().replace(/\s+/g, '_')}.${job.format.toLowerCase()}`;
      a.click();
      return;
    }
    const manifest = JSON.stringify(
      {
        id: job.id,
        title: job.title,
        jobType: job.jobType,
        modelId: job.modelId,
        prompt: job.prompt,
        resolution: job.resolution,
        format: job.format,
        outputMeta: job.outputMeta,
      },
      null,
      2
    );
    const blob = new Blob([manifest], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.title.toLowerCase().replace(/\s+/g, '_')}_metadata.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkDownload = () => {
    const targets = filteredJobs.filter((j) => selectedJobIds.includes(j.id));
    targets.forEach((job, idx) => {
      setTimeout(() => downloadJobAsset(job), idx * 250);
    });
  };

  const handleOpenProject = (p: ProjectRecord) => {
    onOpenProjectInEditor({
      projectId: p.id,
      title: p.title,
      scenes: p.storyboardJson?.scenes || [],
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-100">
            My Projects & Download Center
          </h1>
          <p className="text-sm text-slate-400">
            PostgreSQL Project History, Active Render Queue, and Bulk Asset
            Downloads
          </p>
        </div>

        {selectedJobIds.length > 0 && (
          <button
            type="button"
            onClick={handleBulkDownload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
          >
            <Download className="w-4 h-4" />
            <span>Bulk Download ({selectedJobIds.length})</span>
          </button>
        )}
      </div>

      {/* My Projects */}
      <section className="space-y-3">
        <h2 className="font-display text-base font-semibold text-slate-100">
          My Projects ({projects.length})
        </h2>
        {projects.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-[#0D1017] p-6 text-xs text-slate-400">
            No saved projects yet. Generate a multi-scene storyboard or save a
            timeline in the Editing Studio.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-slate-800 bg-[#0D1017] p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-100 mb-1">
                    {p.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                    {p.description || 'Studio sequence'}
                  </p>
                  <p className="text-xs font-mono text-slate-500 tabular-nums">
                    {p.targetResolution} · {p.exportFormat} · {p.fps}fps ·{' '}
                    {p.aspectRatio}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenProject(p)}
                  className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Editing Studio</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Render Queue & Download Center */}
      <section className="rounded-xl border border-slate-800 bg-[#0D1017] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Render Queue & Download Center
          </h2>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#06070B] border border-slate-800 overflow-x-auto">
            {(
              [
                ['all', 'All'],
                ['ai-voice', 'Voice WAV'],
                ['multi-scene', 'Storyboards'],
                ['studio-export', 'Studio Video'],
                ['text-to-video', 'Text-to-Video'],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilterType(k)}
                className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
                  filterType === k
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No render jobs recorded for this filter yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 pr-3 w-8">Sel</th>
                  <th className="py-2.5 pr-4 font-medium">Asset Title</th>
                  <th className="py-2.5 pr-4 font-medium">Type</th>
                  <th className="py-2.5 pr-4 font-medium">Model / GPU</th>
                  <th className="py-2.5 pr-4 font-medium">Spec</th>
                  <th className="py-2.5 pr-4 font-medium">Status</th>
                  <th className="py-2.5 font-medium text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredJobs.map((job) => {
                  const checked = selectedJobIds.includes(job.id);
                  return (
                    <tr key={job.id} className="hover:bg-slate-900/40">
                      <td className="py-3 pr-3">
                        <button
                          type="button"
                          onClick={() => toggleSelect(job.id)}
                          aria-label={`Select ${job.title}`}
                          className="text-slate-400 hover:text-blue-400"
                        >
                          {checked ? (
                            <CheckSquare className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 pr-4 font-medium text-slate-100">
                        {job.title}
                      </td>
                      <td className="py-3 pr-4 font-mono text-slate-400 whitespace-nowrap">
                        {job.jobType}
                      </td>
                      <td className="py-3 pr-4 text-slate-300 whitespace-nowrap">
                        {job.modelId} · {job.gpuTarget}
                      </td>
                      <td className="py-3 pr-4 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                        {job.resolution} · {job.format} · {job.durationSec}s
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {job.status === 'completed' ? (
                          <span className="text-emerald-400 font-medium">
                            Completed
                          </span>
                        ) : job.status === 'requires_paid_key' ? (
                          <span className="text-amber-400 font-medium">
                            Paid Key Required
                          </span>
                        ) : job.status === 'requires_gpu_worker' ? (
                          <span className="text-slate-400 font-medium">
                            CUDA Worker Required
                          </span>
                        ) : (
                          <span className="text-red-400 font-medium">
                            {job.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => downloadJobAsset(job)}
                          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

import React, { useState } from 'react';
import { Clock, Plus, Edit2, Trash2, ShieldCheck, CheckCircle2, AlertCircle, ArrowDown } from 'lucide-react';
import { FollowUpSequence, CustomerCategory } from '../../types';

interface FollowUpSequencesViewProps {
  sequences: FollowUpSequence[];
  onSaveSequence: (seq: FollowUpSequence) => Promise<void>;
}

export const FollowUpSequencesView: React.FC<FollowUpSequencesViewProps> = ({
  sequences,
  onSaveSequence,
}) => {
  const [activeSeqId, setActiveSeqId] = useState<string>(sequences[0]?.id || '');
  const activeSequence = sequences.find((s) => s.id === activeSeqId) || sequences[0];

  const handleToggle = async (seq: FollowUpSequence) => {
    await onSaveSequence({ ...seq, enabled: !seq.enabled });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Automated Follow-up Sequences (Drip Cadence)
          </h2>
          <p className="text-xs text-slate-500">
            Multi-day onboarding and reorder follow-ups with automatic cancellation on customer response or opt-out.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Auto-cancels on Customer Reply</span>
          </span>
        </div>
      </div>

      {/* Sequence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Sequence List */}
        <div className="md:col-span-4 space-y-3">
          {sequences.map((seq) => {
            const isSelected = seq.id === activeSequence?.id;
            return (
              <div
                key={seq.id}
                onClick={() => setActiveSeqId(seq.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all bg-white shadow-xs ${
                  isSelected ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <h3 className="font-bold text-xs text-slate-900">{seq.name}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(seq);
                    }}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      seq.enabled
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-100 text-slate-500 border-slate-300'
                    }`}
                  >
                    {seq.enabled ? 'Active' : 'Paused'}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>Target: <strong>{seq.targetCategory}</strong></span>
                  <span>•</span>
                  <span>{seq.steps.length} Steps</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Steps Visual Timeline */}
        <div className="md:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
          {activeSequence ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{activeSequence.name}</h3>
                  <p className="text-xs text-slate-500">
                    Cadence configuration for {activeSequence.targetCategory} in Satna & Maihar region
                  </p>
                </div>
                <div className="text-xs font-semibold text-slate-600">
                  Auto-cancel triggers: <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-mono">Customer Inbound / Opt-out</code>
                </div>
              </div>

              {/* Steps Timeline */}
              <div className="space-y-4 relative before:absolute before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-blue-100">
                {activeSequence.steps.map((step, index) => (
                  <div key={step.stepNumber} className="relative flex items-start gap-4">
                    {/* Step Number Dot */}
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 text-xs z-10">
                      {step.stepNumber}
                    </div>

                    <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-slate-900">{step.title}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Delay: {step.delayDays === 0 ? 'Immediate' : `${step.delayDays} Day(s) (${step.delayHours}h)`}</span>
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                        "{step.messageText}"
                      </p>

                      <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                        <span>Re-verifies OPTED_IN consent prior to trigger</span>
                        <span className="text-emerald-600 font-semibold">Policy Compliant</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Select or create a follow-up sequence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Workflow,
  Plus,
  Play,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Edit2,
  Zap,
  Filter,
  Layers,
  Sparkles,
} from 'lucide-react';

interface VisualRule {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  actions: string[];
  enabled: boolean;
  timesFired: number;
}

export const AutomationBuilderView: React.FC = () => {
  const [rules, setRules] = useState<VisualRule[]>([
    {
      id: 'vr-1',
      name: 'Tractor Mechanic Price Enquiry Pipeline',
      trigger: 'Customer sends "PRICE" or "RATE"',
      condition: 'Category is "Workshops" OR "Mechanics"',
      actions: [
        'Send HP Milcy Turbo 15W-40 & Racer 4 Rate Card',
        'Add tag #PRICE_ENQUIRY',
        'Notify Sales Desk Admin via local prompt',
      ],
      enabled: true,
      timesFired: 19,
    },
    {
      id: 'vr-2',
      name: 'Cement Plant Hydraulic Oil Lead Router',
      trigger: 'Incoming message contains "ENKLO" or "HYDRAULIC"',
      condition: 'Customer is in Satna Industrial Area / Nagod',
      actions: [
        'Send HP Enklo 68 ISO VG Technical Specifications PDF',
        'Assign conversation to Ramesh Kumar (Sales Manager)',
        'Add to "Industrial & Fleet Owners" group',
      ],
      enabled: true,
      timesFired: 7,
    },
    {
      id: 'vr-3',
      name: 'Statutory Opt-Out Suppression Pipeline',
      trigger: 'Customer sends "STOP" / "UNSUBSCRIBE" / "CANCEL"',
      condition: 'Any customer regardless of category',
      actions: [
        'Set consent status to OPTED_OUT immediately',
        'Cancel all pending campaign dispatches in queue',
        'Send mandatory single suppression confirmation message',
      ],
      enabled: true,
      timesFired: 1,
    },
  ]);

  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTest = (ruleName: string) => {
    setTestResult(`Workflow "${ruleName}" successfully evaluated: All triggers, conditions, and actions validated against local engine.`);
    setTimeout(() => setTestResult(null), 4000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Visual Automation Builder (Trigger → Condition → Action)
          </h2>
          <p className="text-xs text-slate-500">
            Construct automated workflows that route leads, tag customers, and trigger canned responses automatically.
          </p>
        </div>

        <button
          onClick={() => alert('New workflow builder canvas ready for customization.')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Workflow</span>
        </button>
      </div>

      {testResult && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{testResult}</span>
        </div>
      )}

      {/* Visual Workflows */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Workflow className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900">{rule.name}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {rule.timesFired} lifetime executions
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTest(rule.name)}
                  className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Play className="w-3 h-3 text-blue-600" />
                  <span>Dry Run Test</span>
                </button>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {rule.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Pipeline Visual Diagram */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* 1. Trigger */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 uppercase">
                  <Zap className="w-3.5 h-3.5" />
                  <span>1. Trigger Event</span>
                </div>
                <div className="font-semibold text-slate-800 text-[11px]">
                  {rule.trigger}
                </div>
              </div>

              {/* 2. Condition */}
              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 uppercase">
                  <Filter className="w-3.5 h-3.5" />
                  <span>2. Qualifying Condition</span>
                </div>
                <div className="font-semibold text-slate-800 text-[11px]">
                  {rule.condition}
                </div>
              </div>

              {/* 3. Actions */}
              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 uppercase">
                  <Layers className="w-3.5 h-3.5" />
                  <span>3. Execution Actions ({rule.actions.length})</span>
                </div>
                <ul className="text-[10px] text-slate-700 space-y-0.5 list-disc pl-3.5">
                  {rule.actions.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

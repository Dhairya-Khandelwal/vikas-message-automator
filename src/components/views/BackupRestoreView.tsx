import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  HardDrive,
  FileText,
  Lock,
} from 'lucide-react';
import { api } from '../../services/api';

interface BackupRestoreViewProps {
  onRestoreSuccess: () => void;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({ onRestoreSuccess }) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  const handleDownloadBackup = () => {
    window.location.href = api.getBackupDownloadUrl();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.contacts || !json.consentRecords) {
          alert('Invalid backup file. Missing required customer or consent tables.');
          return;
        }

        if (confirm(`Restore database from ${file.name}? This will update your local database with ${json.contacts.length} contacts and ${json.consentRecords.length} consent records.`)) {
          setIsRestoring(true);
          const res = await api.restoreBackup(json);
          if (res.success) {
            setRestoreStatus(`Database successfully restored from ${file.name}!`);
            onRestoreSuccess();
          } else {
            alert(res.error || 'Restore failed');
          }
        }
      } catch (err: any) {
        alert('Failed to parse backup JSON file: ' + err.message);
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto text-xs">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
              Zero-Cloud Privacy Guarantee
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Local Path: data/database.json
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Local Database Backup & Point-in-Time Recovery
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            All customer records, messages, and statutory consent logs remain strictly on your local computer. No customer data is ever sent to external cloud servers.
          </p>
        </div>

        <button
          onClick={handleDownloadBackup}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-500/20 shrink-0 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Download Database Snapshot</span>
        </button>
      </div>

      {restoreStatus && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{restoreStatus}</span>
        </div>
      )}

      {/* Backup and Restore Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manual Backup Box */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Export Local Backup</h3>
                <p className="text-[11px] text-slate-500">Create timestamped JSON archive</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
              Exports a complete snapshot containing all contacts, consent logs, groups, message templates, automations, and conversation histories.
            </p>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1 text-slate-700 font-mono">
              <div className="flex justify-between"><span>Format:</span><span>JSON Schema v2.4</span></div>
              <div className="flex justify-between"><span>Storage Location:</span><span>Local Windows PC</span></div>
              <div className="flex justify-between"><span>External Cloud:</span><span className="text-emerald-700 font-bold">NONE (Offline Safe)</span></div>
            </div>
          </div>

          <button
            onClick={handleDownloadBackup}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors mt-2"
          >
            <Download className="w-4 h-4" />
            <span>Generate & Download Backup</span>
          </button>
        </div>

        {/* Restore Box */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Restore from File</h3>
                <p className="text-[11px] text-slate-500">Recover from previously exported archive</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
              Select a valid backup JSON file to restore contacts and configuration. Only authorized Administrators can execute database restoration.
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Restoring will update local database tables with the contents of the chosen snapshot.</span>
            </div>
          </div>

          <div>
            <label className="w-full py-2.5 bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{isRestoring ? 'Restoring Database...' : 'Choose JSON Backup File'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                disabled={isRestoring}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

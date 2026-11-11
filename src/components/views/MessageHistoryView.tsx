import React, { useState } from 'react';
import {
  History,
  Search,
  Download,
  Check,
  CheckCheck,
  ShieldCheck,
  Ban,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { Message } from '../../types';

interface MessageHistoryViewProps {
  messages: Message[];
}

export const MessageHistoryView: React.FC<MessageHistoryViewProps> = ({ messages }) => {
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const filtered = messages.filter((m) => {
    const q = search.toLowerCase();
    const matchesSearch =
      m.customerName.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      m.content.toLowerCase().includes(q);

    const matchesDirection = directionFilter === 'All' || m.direction === directionFilter;
    const matchesStatus = statusFilter === 'All' || m.status === statusFilter;

    return matchesSearch && matchesDirection && matchesStatus;
  });

  const exportCSV = () => {
    const headers = ['Timestamp', 'Direction', 'Recipient/Sender', 'Phone', 'Content', 'Status', 'Category'];
    const rows = filtered.map((m) => [
      `"${m.timestamp}"`,
      `"${m.direction}"`,
      `"${m.customerName}"`,
      `"${m.phone}"`,
      `"${m.content.replace(/"/g, '""')}"`,
      `"${m.status}"`,
      `"${m.category || 'General'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `vikas_message_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Dispatched & Inbound Message Audit History
          </h2>
          <p className="text-xs text-slate-500">
            Complete local audit trail of all messages sent and received via Vikas Automobiles.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export History (CSV)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by customer, phone, or message text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
        >
          <option value="All">All Directions</option>
          <option value="outbound">Outbound (Sent)</option>
          <option value="inbound">Inbound (Received)</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
        >
          <option value="All">All Statuses</option>
          <option value="DELIVERED">Delivered</option>
          <option value="READ">Read</option>
          <option value="SENT">Sent</option>
          <option value="FAILED">Failed / Blocked</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Direction / Time</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Message Content</th>
                <th className="py-3 px-4">Delivery Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No message records found.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const isOutbound = m.direction === 'outbound';
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-semibold">
                          {isOutbound ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span className={isOutbound ? 'text-blue-700' : 'text-emerald-700'}>
                            {isOutbound ? 'Outbound' : 'Inbound'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {new Date(m.timestamp).toLocaleString()}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800">
                        {m.customerName}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {m.phone}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {m.category || 'General'}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <p className="line-clamp-2 text-slate-700 leading-relaxed font-sans" title={m.content}>
                          {m.content}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.status === 'READ'
                            ? 'bg-blue-100 text-blue-800'
                            : m.status === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {m.status === 'READ' ? (
                            <CheckCheck className="w-3 h-3 text-blue-600" />
                          ) : (
                            <Check className="w-3 h-3 text-emerald-600" />
                          )}
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

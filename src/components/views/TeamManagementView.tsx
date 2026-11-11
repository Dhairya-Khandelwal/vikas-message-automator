import React, { useState } from 'react';
import { UserCheck, Shield, User, Lock, CheckCircle2 } from 'lucide-react';
import { TeamMember, UserRole } from '../../types';

interface TeamManagementViewProps {
  teamMembers: TeamMember[];
  currentUser: { userId: string; userName: string; role: string };
  onSwitchRole: (role: string, userId?: string) => void;
}

export const TeamManagementView: React.FC<TeamManagementViewProps> = ({
  teamMembers,
  currentUser,
  onSwitchRole,
}) => {
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto text-xs">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
              Active Role: {currentUser.role}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Logged in as {currentUser.userName}
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Team Management & Role-Based Access Control (RBAC)
          </h2>
          <p className="text-xs text-slate-500">
            Manage permissions across Administrator, Sales Manager, and Dispatch Support staff.
          </p>
        </div>
      </div>

      {/* Role Permissions Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
            <Shield className="w-5 h-5" />
            <span>ADMINISTRATOR</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Full root authority. Can pair WhatsApp, configure local message pacing, update statutory consent overrides with audit evidence, and restore backups.
          </p>
          <ul className="text-[11px] text-slate-700 space-y-1.5 list-disc pl-4">
            <li>WhatsApp pairing & session keys</li>
            <li>Configure rate pacing limits</li>
            <li>Database backups & restore</li>
            <li>Business settings & profile</li>
          </ul>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
            <UserCheck className="w-5 h-5" />
            <span>MANAGER</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Campaign and customer management. Can launch promotional broadcasts, configure keyword automations, and view business analytics.
          </p>
          <ul className="text-[11px] text-slate-700 space-y-1.5 list-disc pl-4">
            <li>Create & launch bulk campaigns</li>
            <li>Manage customer directory & groups</li>
            <li>Configure auto replies & keywords</li>
            <li>Export performance reports</li>
          </ul>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
            <User className="w-5 h-5" />
            <span>EMPLOYEE</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Support agent and counter desk. Can view WhatsApp inbox, answer customer inquiries, and view assigned conversations.
          </p>
          <ul className="text-[11px] text-slate-700 space-y-1.5 list-disc pl-4">
            <li>Send manual inbox replies</li>
            <li>Assign and resolve chat tickets</li>
            <li>View customer notes and order requests</li>
            <li>No access to delete contacts or override consent</li>
          </ul>
        </div>
      </div>

      {/* Team Members List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Vikas Automobiles Team Directory ({teamMembers.length})
          </h3>
          <span className="text-[11px] text-slate-400">Click to switch active session user</span>
        </div>

        <div className="divide-y divide-slate-100">
          {teamMembers.map((member) => {
            const isCurrent = currentUser.userId === member.id;
            return (
              <div
                key={member.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${member.avatarColor} text-white font-bold flex items-center justify-center text-xs shrink-0`}>
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{member.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                          Active Session
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {member.email} • Ph: {member.phone}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                    member.role === 'ADMIN'
                      ? 'bg-blue-100 text-blue-800'
                      : member.role === 'MANAGER'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {member.role}
                  </span>

                  <button
                    onClick={() => onSwitchRole(member.role, member.id)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white hover:border-blue-500 transition-colors"
                  >
                    Switch to {member.role}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Send,
  Check,
  CheckCheck,
  Paperclip,
  Smile,
  User,
  ShieldCheck,
  AlertCircle,
  FileText,
  UserCheck,
  CheckCircle2,
  Phone,
  Building,
  Tag,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { Conversation, Message, CustomerCategory, TeamMember } from '../../types';

interface MessageInboxViewProps {
  conversations: Conversation[];
  messages: Message[];
  teamMembers: TeamMember[];
  onSendMessage: (payload: { contactId?: string; phone?: string; content: string; category?: string }) => Promise<void>;
  onResolveConversation: (id: string, resolved: boolean) => Promise<void>;
  onAssignConversation: (id: string, assignedTo: string) => Promise<void>;
}

export const MessageInboxView: React.FC<MessageInboxViewProps> = ({
  conversations,
  messages,
  teamMembers,
  onSendMessage,
  onResolveConversation,
  onAssignConversation,
}) => {
  const [selectedConvId, setSelectedConvId] = useState<string>(conversations[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [showDetails, setShowDetails] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === selectedConvId) || conversations[0];
  const activeMessages = messages.filter(
    (m) =>
      m.conversationId === activeConversation?.id ||
      m.contactId === activeConversation?.contactId ||
      m.phone === activeConversation?.phone
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, selectedConvId]);

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.businessName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUnread = unreadOnly ? c.unreadCount > 0 : true;
    return matchesSearch && matchesUnread;
  });

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || !activeConversation) return;

    setIsSending(true);
    try {
      await onSendMessage({
        contactId: activeConversation.contactId,
        phone: activeConversation.phone,
        content: textToSend.trim(),
        category: 'support',
      });
      setInputMessage('');
    } catch (err: any) {
      alert('Failed to send message: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSending(false);
    }
  };

  const cannedReplies = [
    { label: 'PRICE', text: 'Please tell us which HP lubricant (Milcy Turbo, Racer 4, Enklo 68) and pack size you require.' },
    { label: 'CATALOGUE', text: 'Thank you for your interest! We stock complete HP Automotive & Industrial lubricants at our Satna warehouse.' },
    { label: 'LOCATION', text: 'Vikas Automobiles, Opp. Transport Nagar / Maihar Bypass, Rewa Road, Satna MP. Ph: 9827003016.' },
    { label: 'DISPATCH', text: 'Your HP Lubricants order has been invoiced and queued for transport dispatch tomorrow morning.' },
    { label: 'PAYMENT', text: 'Kindly transfer the invoice amount to Vikas Automobiles bank account or UPI and share screenshot.' },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-slate-100">
      {/* 1. Left Sidebar: Conversation List */}
      <div className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Search & Filters */}
        <div className="p-3 border-b border-slate-200 space-y-2 bg-slate-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search chat or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Conversations ({filteredConversations.length})</span>
            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={`text-[11px] px-2 py-0.5 rounded font-medium border transition-colors ${
                unreadOnly
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
              }`}
            >
              Unread only
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No conversations match your search.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === activeConversation?.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`w-full p-3 text-left transition-colors flex items-start gap-3 ${
                    isSelected ? 'bg-blue-50/70 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center shrink-0 text-xs">
                    {conv.customerName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {conv.customerName}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(conv.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                        {conv.businessName || conv.phone}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {conv.category}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-500 truncate pr-2">
                        {conv.lastMessage}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Middle: Active Chat Window */}
      <div className="flex-1 flex flex-col bg-[#eef2f6] relative">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-white border-b border-slate-200 px-5 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                  {activeConversation.customerName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs text-slate-900">
                      {activeConversation.customerName}
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                      {activeConversation.consentStatus}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {activeConversation.phone} • {activeConversation.businessName || 'Satna Customer'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onResolveConversation(activeConversation.id, !activeConversation.resolved)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                    activeConversation.resolved
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{activeConversation.resolved ? 'Resolved' : 'Mark Resolved'}</span>
                </button>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {showDetails ? 'Hide Info' : 'Customer Info'}
                </button>
              </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeMessages.map((msg) => {
                const isOutbound = msg.direction === 'outbound';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-md rounded-2xl px-4 py-2.5 shadow-xs text-xs relative ${
                        isOutbound
                          ? 'bg-blue-600 text-white rounded-br-xs'
                          : 'bg-white text-slate-900 rounded-bl-xs border border-slate-200/80'
                      }`}
                    >
                      {msg.category === 'auto_reply' && (
                        <div className="text-[10px] font-semibold tracking-wider uppercase mb-1 opacity-80 flex items-center gap-1">
                          <span>Auto Reply</span>
                        </div>
                      )}
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                          isOutbound ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        <span className="font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOutbound && (
                          <span>
                            {msg.status === 'READ' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-200" />
                            ) : msg.status === 'DELIVERED' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-blue-200" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Canned HP Lube Response Chips */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                Quick Reply:
              </span>
              {cannedReplies.map((cr) => (
                <button
                  key={cr.label}
                  onClick={() => handleSend(cr.text)}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-md text-[11px] font-medium text-slate-700 shrink-0 transition-colors shadow-2xs"
                >
                  {cr.label}
                </button>
              ))}
            </div>

            {/* Message Input Bar */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                placeholder="Type your WhatsApp message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                className="flex-1 px-4 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                onClick={() => handleSend()}
                disabled={isSending || !inputMessage.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
            Select a customer conversation from the left to start messaging.
          </div>
        )}
      </div>

      {/* 3. Right: Customer Details Drawer */}
      {showDetails && activeConversation && (
        <div className="w-72 bg-white border-l border-slate-200 p-4 space-y-4 text-xs overflow-y-auto shrink-0">
          <div className="text-center pb-3 border-b border-slate-100">
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-lg mx-auto mb-2">
              {activeConversation.customerName.slice(0, 2).toUpperCase()}
            </div>
            <h4 className="font-bold text-slate-900 text-sm">
              {activeConversation.customerName}
            </h4>
            <p className="text-slate-500 font-mono text-[11px]">{activeConversation.phone}</p>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Customer Category</span>
              <div className="text-xs font-semibold text-slate-800 mt-0.5">
                {activeConversation.category}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Statutory Consent Status</span>
              <div className="mt-0.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                  activeConversation.consentStatus === 'OPTED_IN'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  <ShieldCheck className="w-3 h-3" />
                  {activeConversation.consentStatus}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Assigned Team Member</span>
              <select
                value={activeConversation.assignedTo || ''}
                onChange={(e) => onAssignConversation(activeConversation.id, e.target.value)}
                className="w-full mt-1 px-2 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {tm.name} ({tm.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400">Distributor Notes</span>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
                Customer account active at Vikas Automobiles Satna. Special HP Lubricant rate card applicable.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

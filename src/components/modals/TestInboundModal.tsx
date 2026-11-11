import React, { useState } from 'react';
import { X, Send, Bot, Zap, ShieldAlert, Sparkles, MessageSquare } from 'lucide-react';

interface TestInboundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendSimulation: (phone: string, text: string, name?: string) => Promise<any>;
}

export const TestInboundModal: React.FC<TestInboundModalProps> = ({
  isOpen,
  onClose,
  onSendSimulation,
}) => {
  const [phone, setPhone] = useState('+919827223344');
  const [customerName, setCustomerName] = useState('Sunil Verma');
  const [text, setText] = useState('PRICE for HP Milcy Turbo 15W-40');
  const [result, setResult] = useState<any | null>(null);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const quickTriggers = [
    { label: 'HI / HELLO', text: 'HI', icon: Bot, desc: 'Triggers General Welcome Greeting' },
    { label: 'PRICE', text: 'PRICE for HP Racer 4 1L pack', icon: Zap, desc: 'Triggers Price list response & tags contact' },
    { label: 'CATALOGUE', text: 'CATALOGUE for HP lubricants', icon: MessageSquare, desc: 'Triggers product portfolio details' },
    { label: 'DEALER', text: 'DEALER enquiry for Satna / Maihar region', icon: Sparkles, desc: 'Routes to distributor manager' },
    { label: 'LOCATION', text: 'LOCATION of Vikas Automobiles Satna', icon: MessageSquare, desc: 'Sends address & warehouse phone' },
    { label: 'ORDER', text: 'ORDER 5 buckets HP Milcy Turbo 20L', icon: Sparkles, desc: 'Triggers order booking intake' },
    { label: 'STOP (Opt-Out)', text: 'STOP', icon: ShieldAlert, desc: 'Automatic Opt-Out & permanent suppression!' },
  ];

  const handleSend = async (messageText?: string) => {
    const msg = messageText || text;
    if (!msg.trim()) return;

    setIsSending(true);
    setResult(null);
    try {
      const res = await onSendSimulation(phone, msg, customerName);
      setResult(res);
    } catch (err: any) {
      setResult({ error: err?.message || 'Simulation failed' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-[#0b1329] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Inbound WhatsApp Simulator</h2>
              <p className="text-xs text-slate-400">Test Auto-Replies, Keyword Rules & Opt-Out Triggers</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sender Mobile</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Quick Test Triggers</label>
            <div className="grid grid-cols-2 gap-2">
              {quickTriggers.map((qt) => {
                const Icon = qt.icon;
                const isStop = qt.label.includes('STOP');
                return (
                  <button
                    key={qt.label}
                    type="button"
                    onClick={() => {
                      setText(qt.text);
                      handleSend(qt.text);
                    }}
                    className={`p-2 rounded-lg text-left border transition-all ${
                      isStop
                        ? 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-0.5">
                      <Icon className={`w-3.5 h-3.5 ${isStop ? 'text-rose-600' : 'text-blue-600'}`} />
                      <span>{qt.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{qt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Custom Message Text</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type customer message..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={isSending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>

          {/* Results Display */}
          {result && (
            <div className="p-3 bg-slate-900 text-slate-200 rounded-lg border border-slate-800 space-y-1 font-mono text-[11px]">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1">
                <span>Simulation Engine Result</span>
                <span className="text-emerald-400">STATUS 200 OK</span>
              </div>
              <pre className="whitespace-pre-wrap break-all pt-1 text-slate-300">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

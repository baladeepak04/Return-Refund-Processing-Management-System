import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../lib/AuthContext.jsx';
import { listReturns, getReturn } from '../../lib/api.js';
import Button from '../../components/ui/Button.jsx';
import { ChatIcon, RefreshIcon, CheckIcon, AlertIcon } from '../../components/ui/icons.jsx';
import { humanize } from '../../lib/enums.js';

export default function SupportChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'm-init',
      sender: 'bot',
      text: `Hello ${user?.name || 'there'}! I'm your ReturnFlow Assistant. How can I assist you with your returns, reverse logistics, or refunds today?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [myReturns, setMyReturns] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!user?.id) return;
    listReturns({ customerId: user.id })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setMyReturns(list.filter((r) => !r.draft));
      })
      .catch((err) => console.error('SupportChat load returns err:', err));
  }, [user?.id]);

  const QUICK_QUESTIONS = [
    'How long does a refund take to process?',
    'Check status of my latest return',
    'Can I exchange for a different size?',
    'Why are food items non-returnable?',
    'Can I reschedule my reverse pickup?',
    'How do I request a return window extension?',
  ];

  async function handleSend(textToSend) {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg = {
      id: `m-${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate intelligent response
    setTimeout(async () => {
      let reply = '';
      const lower = query.toLowerCase();

      // Check if user is asking about specific return ID
      const foundReturn = myReturns.find((r) => query.includes(r.id) || query.includes(String(r.id).slice(0, 8)));

      if (foundReturn) {
        reply = `Return **#${String(foundReturn.id).slice(0, 8)}** (${humanize(foundReturn.reasonCode)}) is currently in **${foundReturn.status.replace(/_/g, ' ')}** status. Refund method selected: **${humanize(foundReturn.preferredRefundMethod)}**.`;
      } else if (lower.includes('how long') || lower.includes('refund take') || lower.includes('sla')) {
        reply = `Per RBI & Consumer Protection Rules:\n• **Store Credit (Wallet)**: Processed within **24 hours** with an automatic **+5% bonus incentive**!\n• **Card, UPI, Netbanking**: Credited in **5–7 business days** to your original payment method.\n• **COD Orders**: Bank NEFT transfer within **7 business days** once bank details (IFSC + Account #) are verified.`;
      } else if (lower.includes('status') || lower.includes('latest return')) {
        if (myReturns.length > 0) {
          const latest = myReturns[0];
          reply = `Your latest return request is **#${String(latest.id).slice(0, 8)}** for **${humanize(latest.reasonCode)}**.\n• Current Status: **${latest.status.replace(/_/g, ' ')}**\n• Initiated: ${new Date(latest.initiatedAt).toLocaleDateString('en-IN')}\n• Preferred Refund: ${humanize(latest.preferredRefundMethod)}`;
        } else {
          reply = `You do not have any active return requests right now. You can initiate one from **My Orders** or the **Initiate Return** wizard!`;
        }
      } else if (lower.includes('exchange') || lower.includes('size')) {
        reply = `Yes! Product exchanges are eligible for **Size/Fit issues** and **Wrong item received** on Apparel and Footwear categories. Only 1 exchange is allowed per order item. If the replacement size is unavailable, a full refund will be automatically offered.`;
      } else if (lower.includes('food') || lower.includes('non-returnable')) {
        reply = `Per FSSAI safety regulations and category return policies, perishable foods, dairy, and grocery items are strictly **Non-Returnable** (0-day window) to ensure food safety and hygiene. Defective items can be escalated to support for a direct credit note.`;
      } else if (lower.includes('reschedule') || lower.includes('pickup')) {
        reply = `You can reschedule your reverse pickup up to **2 times** per carrier policy. Go to **Return History → Reschedule Pickup**, select your new preferred date and time slot, and our carrier network will update their dispatch schedule automatically!`;
      } else if (lower.includes('extension') || lower.includes('window') || lower.includes('override')) {
        reply = `If your standard return window has closed, Customer Support has the authority to grant an exception extension of up to **+7 additional days** for genuine travel or logistics delays under authorized exception policies. Please reach out with your order ID and reason.`;
      } else {
        reply = `Thank you for reaching out! I've noted your query regarding "${query}". If you need immediate assistance with an ongoing return, please provide your Return ID or call our helpline at **1800-RETURN-FLOW** (8 AM – 8 PM IST).`;
      }

      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now() + 1}`,
          sender: 'bot',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 700);
  }

  return (
    <div className="max-w-4xl mx-auto h-[650px] bg-white border border-border rounded-xl shadow-xs flex flex-col overflow-hidden">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold">
            <ChatIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm">ReturnFlow Support Assistant</h3>
            <p className="text-[11px] text-white/80 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success inline-block"></span> Online · Instant Return & Refund Help
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-white/85">
          <p className="font-medium">Toll-Free: 1800-738-876</p>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-2xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-primary text-white rounded-tr-xs'
                  : 'bg-white border border-border text-text rounded-tl-xs'
              }`}
            >
              <div className="whitespace-pre-line">{m.text}</div>
              <span className={`block text-[10px] mt-1 text-right ${m.sender === 'user' ? 'text-white/70' : 'text-text-muted'}`}>
                {m.time}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-border rounded-2xl rounded-tl-xs px-4 py-2 text-xs text-text-muted flex items-center gap-1">
              <span className="animate-pulse font-medium">Assistant is searching policies & records...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-4 py-2 bg-white border-t border-border flex gap-2 overflow-x-auto">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => handleSend(q)}
            className="text-[11px] font-medium bg-gray-100 hover:bg-primary-50 hover:text-primary text-text-secondary px-3 py-1 rounded-full whitespace-nowrap border border-border transition-colors shrink-0"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white border-t border-border flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question, enter Return ID or ask about policies..."
          className="flex-1 border border-border rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-200"
        />
        <Button type="submit" size="sm" disabled={!input.trim() || isTyping}>
          Send
        </Button>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Phone,
  Radio,
  Bell,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  Smartphone,
} from "lucide-react";
import { MOCK_ALERTS } from "@/lib/data";
import type { AlertChannel, Language } from "@/types";

const CHANNEL_CONFIG: Record<
  AlertChannel,
  { icon: React.ReactNode; color: string; label: string }
> = {
  SMS: { icon: <Phone size={11} />, color: "#10b981", label: "SMS" },
  WhatsApp: { icon: <MessageSquare size={11} />, color: "#25d366", label: "WhatsApp" },
  Siren: { icon: <Bell size={11} />, color: "#ef4444", label: "Siren" },
  Radio: { icon: <Radio size={11} />, color: "#f59e0b", label: "Radio" },
  AppPush: { icon: <Smartphone size={11} />, color: "#3b82f6", label: "App Push" },
};

const STATUS_CONFIG = {
  sent: { icon: <CheckCircle size={10} />, color: "#10b981" },
  pending: { icon: <Clock size={10} />, color: "#f59e0b" },
  failed: { icon: <XCircle size={10} />, color: "#ef4444" },
};

const BROADCAST_CHANNELS: AlertChannel[] = ["SMS", "WhatsApp", "Siren", "Radio", "AppPush"];

interface Props {
  t: Record<string, string>;
  language: Language;
}

export function AlertBroadcast({ t, language }: Props) {
  const [activeChannels, setActiveChannels] = useState<Set<AlertChannel>>(
    new Set(["SMS", "WhatsApp", "Siren"])
  );
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  const toggleChannel = (ch: AlertChannel) => {
    setActiveChannels((prev) => {
      const next = new Set(prev);
      next.has(ch) ? next.delete(ch) : next.add(ch);
      return next;
    });
  };

  const handleBroadcast = () => {
    setBroadcasting(true);
    setTimeout(() => {
      setBroadcasting(false);
      setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 3000);
    }, 2000);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}
          >
            <Send size={12} color="white" />
          </div>
          <div>
            <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
              CAP Alert Broadcast
            </div>
            <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>
              Multi-Channel · Common Alerting Protocol
            </div>
          </div>
        </div>
      </div>

      {/* Channel Toggles */}
      <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="text-[9px] font-bold mb-2" style={{ color: "var(--text-muted)" }}>
          BROADCAST CHANNELS
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BROADCAST_CHANNELS.map((ch) => {
            const cfg = CHANNEL_CONFIG[ch];
            const isOn = activeChannels.has(ch);
            return (
              <button
                key={ch}
                onClick={() => toggleChannel(ch)}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold transition-all"
                style={{
                  background: isOn ? `rgba(${hexToRgb(cfg.color)},0.15)` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isOn ? cfg.color : "rgba(255,255,255,0.08)"}`,
                  color: isOn ? cfg.color : "var(--text-muted)",
                }}
              >
                {cfg.icon}
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Broadcast button */}
        <motion.button
          onClick={handleBroadcast}
          disabled={broadcasting || activeChannels.size === 0}
          whileTap={{ scale: 0.97 }}
          className="mt-2 w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
          style={{
            background: broadcastSuccess
              ? "rgba(16,185,129,0.2)"
              : broadcasting
              ? "rgba(239,68,68,0.15)"
              : "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(249,115,22,0.2))",
            border: `1px solid ${broadcastSuccess ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.4)"}`,
            color: broadcastSuccess ? "var(--accent-emerald)" : "var(--accent-red)",
            opacity: activeChannels.size === 0 ? 0.5 : 1,
          }}
        >
          {broadcastSuccess ? (
            <>
              <CheckCircle size={13} />
              BROADCAST SENT SUCCESSFULLY
            </>
          ) : broadcasting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              >
                <Radio size={13} />
              </motion.div>
              BROADCASTING...
            </>
          ) : (
            <>
              <Send size={13} />
              BROADCAST ALERT ({activeChannels.size} channels)
            </>
          )}
        </motion.button>
      </div>

      {/* Recent Alerts Log */}
      <div className="px-3 py-2">
        <div className="text-[9px] font-bold mb-2" style={{ color: "var(--text-muted)" }}>
          RECENT TRANSMISSIONS
        </div>
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {MOCK_ALERTS.map((alert, i) => {
            const chCfg = CHANNEL_CONFIG[alert.channel];
            const stCfg = STATUS_CONFIG[alert.status];
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-2 p-2 rounded-lg"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="flex items-center gap-1 shrink-0 mt-0.5"
                  style={{ color: chCfg.color }}
                >
                  {chCfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-semibold" style={{ color: chCfg.color }}>
                      {chCfg.label}
                    </span>
                    <div
                      className="flex items-center gap-0.5"
                      style={{ color: stCfg.color }}
                    >
                      {stCfg.icon}
                      <span className="text-[9px] font-bold">
                        {alert.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div
                    className="text-[10px] mt-0.5 leading-tight"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {alert.message.slice(0, 80)}
                    {alert.message.length > 80 ? "..." : ""}
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    → {alert.recipient}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const map: Record<string, string> = {
    "#10b981": "16,185,129",
    "#25d366": "37,211,102",
    "#ef4444": "239,68,68",
    "#f59e0b": "245,158,11",
    "#3b82f6": "59,130,246",
  };
  return map[hex] || "59,130,246";
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles, ArrowLeft, Search, Filter, RotateCw, Mail,
  MessageSquare, Trash2, Check, Copy, Clock, TrendingUp,
  UserCheck, Users, Calendar, ExternalLink, ChevronRight,
  Inbox
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState("All");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"email" | "sms">("email");
  const [copiedText, setCopiedText] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/leads`);
      if (!response.ok) throw new Error("Failed to load leads from backend server.");
      const data = await response.json();
      setLeads(data);
      if (data.length > 0 && !selectedLead) {
        setSelectedLead(data[0]);
      } else if (data.length > 0 && selectedLead) {
        const updated = data.find((l: any) => l.id === selectedLead.id);
        if (updated) setSelectedLead(updated);
      }
    } catch (err: any) {
      setError(err.message || "Could not retrieve leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  const handleStatusChange = async (leadId: number, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error("Failed to update lead status.");
      const updatedLead = await response.json();
      setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
      if (selectedLead && selectedLead.id === leadId) setSelectedLead(updatedLead);
    } catch (err: any) {
      alert(err.message || "Error updating status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteLead = async (leadId: number) => {
    if (!confirm("Are you sure you want to delete this lead? This cannot be undone.")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/leads/${leadId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete lead.");
      const filtered = leads.filter(l => l.id !== leadId);
      setLeads(filtered);
      setSelectedLead(filtered.length > 0 ? filtered[0] : null);
    } catch (err: any) {
      alert(err.message || "Error deleting lead");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const totalLeadsCount = leads.length;
  const conversionRate = totalLeadsCount > 0
    ? Math.round((leads.filter(l => ["Qualified", "Closed"].includes(l.status)).length / totalLeadsCount) * 100)
    : 0;
  const followupsGenerated = leads.filter(l => l.followups && l.followups.length > 0).length;
  const hoursSaved = Math.round((totalLeadsCount * 15 / 60) * 10) / 10;

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.role && lead.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.message && lead.message.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch && (scoreFilter === "All" || lead.lead_score === scoreFilter);
  });

  const hotCount = leads.filter(l => l.lead_score === "Hot").length;
  const warmCount = leads.filter(l => l.lead_score === "Warm").length;
  const coldCount = leads.filter(l => l.lead_score === "Cold").length;
  const maxScoreCount = Math.max(hotCount, warmCount, coldCount, 1);

  const scoreColor = (score: string) => {
    if (score === "Hot") return "bg-rose-50 text-rose-600 border-rose-200";
    if (score === "Warm") return "bg-amber-50 text-amber-600 border-amber-200";
    return "bg-blue-50 text-blue-600 border-blue-200";
  };

  const statusColor = (status: string) => {
    if (status === "New") return "bg-blue-50 border-blue-200 text-blue-600";
    if (status === "Contacted") return "bg-amber-50 border-amber-200 text-amber-600";
    if (status === "Qualified") return "bg-emerald-50 border-emerald-200 text-emerald-600";
    return "bg-gray-100 border-gray-300 text-gray-500";
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">

      {/* Top Navbar */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 bg-white border border-gray-300 text-gray-500 hover:text-gray-900 rounded-lg hover:border-gray-400 transition-all shadow-sm"
              title="Back to Landing Page"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-1.5 rounded-lg text-white shadow-md shadow-indigo-200">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-indigo-700 bg-clip-text text-transparent">
                LeadNova Admin
              </span>
              <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-600 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                SaaS Panel
              </span>
            </div>
          </div>

          <button
            onClick={fetchLeads}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-300 hover:border-gray-400 rounded-lg transition-all disabled:opacity-50 w-full sm:w-auto justify-center sm:justify-start shadow-sm"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Sync Data
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 w-full space-y-6 flex-1">

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm flex items-center gap-3">
            <span className="text-rose-500 text-base">⚠</span>
            {error}
            <button onClick={fetchLeads} className="ml-auto text-rose-600 hover:text-rose-700 underline text-xs">Retry</button>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Inbound Leads", value: totalLeadsCount, sub: "Captured from website forms", icon: <Users className="h-4 w-4" />, iconBg: "bg-indigo-50 text-indigo-600", border: "border-indigo-100" },
            { label: "Pipeline Conversion", value: `${conversionRate}%`, sub: "Qualified/Closed ratio", icon: <UserCheck className="h-4 w-4" />, iconBg: "bg-emerald-50 text-emerald-600", border: "border-emerald-100" },
            { label: "Follow-ups Drafted", value: followupsGenerated, sub: "AI-personalized message batches", icon: <Mail className="h-4 w-4" />, iconBg: "bg-purple-50 text-purple-600", border: "border-purple-100" },
            { label: "Time Saved", value: `${hoursSaved}h`, sub: "Based on 15m savings/lead", icon: <Clock className="h-4 w-4" />, iconBg: "bg-pink-50 text-pink-600", border: "border-pink-100" },
          ].map((card, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 relative overflow-hidden hover:shadow-md hover:border-gray-300 transition-all group shadow-sm">
              <div className={`absolute right-4 top-4 ${card.iconBg} border ${card.border} p-2 rounded-lg transition-transform group-hover:scale-110 duration-300`}>
                {card.icon}
              </div>
              <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-1 pr-10">{card.label}</p>
              <p className="text-3xl font-extrabold text-gray-900">
                {loading ? <span className="skeleton inline-block w-16 h-8 rounded" /> : card.value}
              </p>
              <p className="text-[10px] text-gray-400 mt-2">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Analytics */}
        <div className="grid md:grid-cols-3 gap-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 md:col-span-2 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-6 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-indigo-500" /> Lead Score Breakdown
            </h3>
            <div className="space-y-5">
              {[
                { label: "Hot Leads", sub: "High Interest", count: hotCount, bar: "from-rose-500 to-orange-500", text: "text-rose-600" },
                { label: "Warm Leads", sub: "Evaluation Stage", count: warmCount, bar: "from-amber-500 to-yellow-500", text: "text-amber-600" },
                { label: "Cold Leads", sub: "General Inbound", count: coldCount, bar: "from-blue-500 to-cyan-500", text: "text-blue-600" },
              ].map((row, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className={`font-semibold ${row.text}`}>{row.label} <span className="text-gray-400 font-normal">· {row.sub}</span></span>
                    <span className="text-gray-500">{row.count} ({totalLeadsCount > 0 ? Math.round(row.count / totalLeadsCount * 100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden border border-gray-200">
                    <div
                      className={`bg-gradient-to-r ${row.bar} h-full rounded-full transition-all duration-700`}
                      style={{ width: `${(row.count / maxScoreCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Pipeline Status</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { status: "New", color: "text-blue-600", dot: "bg-blue-500" },
                  { status: "Contacted", color: "text-amber-600", dot: "bg-amber-500" },
                  { status: "Qualified", color: "text-emerald-600", dot: "bg-emerald-500" },
                  { status: "Closed", color: "text-gray-500", dot: "bg-gray-400" },
                ].map(({ status, color, dot }) => (
                  <div key={status} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${dot} shrink-0`} />
                    <span className={color}>{status}</span>
                    <span className="text-gray-400 ml-auto font-bold">{leads.filter(l => l.status === status).length}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-gray-200 text-xs text-gray-400 leading-relaxed">
              <span className="font-semibold text-gray-600">Pro Tip:</span> Select a lead to view AI output and update its pipeline status.
            </div>
          </div>
        </div>

        {/* Pipeline split view */}
        <div className="grid lg:grid-cols-5 gap-5 items-start">

          {/* Lead list (3/5) */}
          <div className="lg:col-span-3 bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
            <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-3 bg-gray-50/50">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text" value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, company, role..."
                  className="w-full bg-white border border-gray-300 hover:border-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-lg py-2 pl-9 pr-4 text-xs text-gray-900 placeholder-gray-400 outline-none transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <select
                  value={scoreFilter}
                  onChange={(e) => setScoreFilter(e.target.value)}
                  className="bg-white border border-gray-300 hover:border-gray-400 text-xs text-gray-700 px-3 py-2 rounded-lg outline-none cursor-pointer transition-all"
                >
                  <option value="All">All Scores</option>
                  <option value="Hot">Hot Leads</option>
                  <option value="Warm">Warm Leads</option>
                  <option value="Cold">Cold Leads</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              {loading ? (
                <div className="p-8 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-4 items-center p-4 rounded-xl border border-gray-100">
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-3.5 w-32 rounded" />
                        <div className="skeleton h-2.5 w-20 rounded" />
                      </div>
                      <div className="skeleton h-3 w-16 rounded" />
                      <div className="skeleton h-5 w-12 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="py-16 px-6 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-14 h-14 bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center">
                    <Inbox className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500">No leads found</p>
                  <p className="text-xs text-gray-400">
                    {leads.length === 0 ? "Submit your first lead via the landing page demo." : "Try adjusting your search or filter."}
                  </p>
                  {leads.length === 0 && (
                    <Link href="/" className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                      Go to Landing Page <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-4">Contact</th>
                      <th className="p-4">Company</th>
                      <th className="p-4 text-center">Score</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => {
                      const isSelected = selectedLead && selectedLead.id === lead.id;
                      const dateFormatted = new Date(lead.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                      return (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                            isSelected ? "bg-indigo-50/60 border-l-2 border-l-indigo-500" : ""
                          }`}
                        >
                          <td className="p-4">
                            <p className="font-bold text-gray-900">{lead.name}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{lead.role || "Lead"}</p>
                          </td>
                          <td className="p-4 text-gray-600 text-[11px]">{lead.company}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${scoreColor(lead.lead_score)}`}>
                              {lead.lead_score}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColor(lead.status)}`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="p-4 text-right text-gray-400 text-[10px]">{dateFormatted}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex justify-between items-center text-[10px] text-gray-400 font-medium">
              <span>Showing {filteredLeads.length} of {leads.length} leads</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> System Connected</span>
            </div>
          </div>

          {/* Lead detail (2/5) */}
          <div className="lg:col-span-2">
            {!selectedLead ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center gap-3 text-center shadow-sm">
                <div className="w-14 h-14 bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center">
                  <Inbox className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 font-medium">No lead selected</p>
                <p className="text-xs text-gray-400">Select a lead from the list to view details and AI-generated responses.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col shadow-md">

                {/* Detail header */}
                <div className="p-5 border-b border-gray-200 bg-gray-50/60">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 leading-tight">{selectedLead.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {selectedLead.role || "Lead"} at{" "}
                        <span className="font-bold text-indigo-600">{selectedLead.company}</span>
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${scoreColor(selectedLead.lead_score)}`}>
                      {selectedLead.lead_score}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 shrink-0">Pipeline:</span>
                    <select
                      value={selectedLead.status}
                      disabled={updatingStatus}
                      onChange={(e) => handleStatusChange(selectedLead.id, e.target.value)}
                      className="bg-white border border-gray-300 hover:border-gray-400 text-xs text-gray-700 font-semibold px-2.5 py-1.5 rounded-lg outline-none cursor-pointer transition-all disabled:opacity-50 flex-1"
                    >
                      <option value="New">🔵 New</option>
                      <option value="Contacted">🟡 Contacted</option>
                      <option value="Qualified">🟢 Qualified</option>
                      <option value="Closed">⚫ Closed</option>
                    </select>
                    {updatingStatus && <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />}
                  </div>
                </div>

                {/* Lead info */}
                <div className="p-5 space-y-4 border-b border-gray-200">
                  {selectedLead.email && (
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Email</span>
                      <a href={`mailto:${selectedLead.email}`} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium transition-colors">
                        {selectedLead.email}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {selectedLead.message && (
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">Inbound Message</span>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-700 leading-relaxed max-h-28 overflow-y-auto italic">
                        &ldquo;{selectedLead.message}&rdquo;
                      </div>
                    </div>
                  )}

                  {selectedLead.summary && (
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 block mb-1.5">AI Smart Summary</span>
                      <p className="text-xs text-gray-700 italic leading-relaxed">{selectedLead.summary}</p>
                    </div>
                  )}
                </div>

                {/* Followup workspace */}
                <div className="p-5 flex-1 flex flex-col">
                  {(!selectedLead.followups || selectedLead.followups.length === 0) ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                      <Mail className="h-6 w-6 text-gray-300" />
                      <p className="text-xs text-gray-400 italic">No follow-ups generated for this lead.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col flex-1">
                      <div className="flex border-b border-gray-200 mb-4">
                        {(["email", "sms"] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 pb-3 text-xs font-semibold flex justify-center items-center gap-1.5 transition-all ${
                              activeTab === tab
                                ? tab === "email"
                                  ? "text-indigo-600 border-b-2 border-b-indigo-500"
                                  : "text-purple-600 border-b-2 border-b-purple-500"
                                : "text-gray-400 hover:text-gray-600"
                            }`}
                          >
                            {tab === "email" ? <Mail className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                            {tab === "email" ? "Email Template" : "SMS Template"}
                          </button>
                        ))}
                      </div>

                      <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-[10px] text-gray-400">
                            <span>{activeTab === "email" ? "SUBJECT & EMAIL COPY" : "SMS CONTENT (MAX 240 CHARS)"}</span>
                            <button
                              onClick={() => copyToClipboard(
                                activeTab === "email"
                                  ? selectedLead.followups[0].email_content
                                  : selectedLead.followups[0].sms_content
                              )}
                              className={`flex items-center gap-1 font-semibold transition-colors ${
                                activeTab === "email"
                                  ? "text-indigo-600 hover:text-indigo-700"
                                  : "text-purple-600 hover:text-purple-700"
                              }`}
                            >
                              {copiedText ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              {copiedText ? "Copied!" : "Copy"}
                            </button>
                          </div>

                          {activeTab === "email" ? (
                            <pre className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-[11px] font-mono text-gray-700 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                              {selectedLead.followups[0].email_content}
                            </pre>
                          ) : (
                            <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-[11px] font-mono text-gray-700 leading-relaxed">
                              {selectedLead.followups[0].sms_content}
                            </div>
                          )}
                        </div>

                        <div className="pt-5 mt-5 border-t border-gray-200 flex justify-end">
                          <button
                            onClick={() => handleDeleteLead(selectedLead.id)}
                            className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 rounded-lg transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete Lead
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

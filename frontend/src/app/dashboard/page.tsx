"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Search, Filter, RotateCw, Mail,
  MessageSquare, Trash2, Check, Copy, Clock, TrendingUp,
  UserCheck, Users, Calendar, ExternalLink, ChevronRight,
  Inbox, Upload, X, CheckCircle, AlertTriangle, FileText
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ── CSV helpers ───────────────────────────────────────────────────────────────

const FIELD_ALIASES: Record<string, string[]> = {
  name:       ["name", "full_name", "fullname", "contact"],
  first_name: ["first_name", "firstname", "first"],
  last_name:  ["last_name", "lastname", "last", "surname"],
  email:      ["email", "email_address", "e_mail", "mail"],
  company:    ["company", "organization", "org", "business", "account"],
  role:       ["role", "title", "job_title", "position", "designation"],
  message:    ["message", "notes", "description", "requirements", "inquiry"],
  source:     ["source", "lead_source", "channel"],
};

function detectColumns(headers: string[]): Record<string, string> {
  const detected: Record<string, string> = {};
  for (const h of headers) {
    const norm = h.trim().toLowerCase().replace(/[\s\-]/g, "_");
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (!detected[field] && aliases.includes(norm)) {
        detected[field] = h;
        break;
      }
    }
  }
  return detected;
}

function parseCSVPreview(content: string): { headers: string[]; rows: string[][]; total: number } {
  const lines = content.replace(/\r/g, "").split("\n").filter(l => l.trim());
  if (!lines.length) return { headers: [], rows: [], total: 0 };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let inQuote = false, current = "";
    for (const ch of line) {
      if (ch === '"') inQuote = !inQuote;
      else if (ch === "," && !inQuote) { result.push(current.trim()); current = ""; }
      else current += ch;
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map(h => h.replace(/^"|"$/g, ""));
  const rows    = lines.slice(1, 4).map(parseRow);
  return { headers, rows, total: lines.length - 1 };
}

// ── Date grouping ─────────────────────────────────────────────────────────────

function groupByDate(leads: any[]) {
  const now       = new Date();
  const todayStr  = now.toISOString().substring(0, 10);
  const yest      = new Date(now); yest.setDate(yest.getDate() - 1);
  const yesterStr = yest.toISOString().substring(0, 10);

  const today: any[] = [], yesterday: any[] = [], older: any[] = [];
  for (const l of leads) {
    const d = (l.created_at || "").substring(0, 10);
    if (d === todayStr)  today.push(l);
    else if (d === yesterStr) yesterday.push(l);
    else older.push(l);
  }
  return [
    { label: "Today",     leads: today },
    { label: "Yesterday", leads: yesterday },
    { label: "Old",       leads: older },
  ];
}

// ── Types ─────────────────────────────────────────────────────────────────────

type CsvStep = "idle" | "selecting" | "preview" | "importing" | "done";

interface CsvPreview {
  headers:  string[];
  rows:     string[][];
  total:    number;
  detected: Record<string, string>;
  file:     File;
}

interface CsvResult {
  imported:          number;
  skipped:           number;
  errors:            Array<{ row: number; error: string }>;
  detected_columns?: Record<string, string>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [leads, setLeads]               = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [searchQuery, setSearchQuery]   = useState("");
  const [scoreFilter, setScoreFilter]   = useState("All");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [activeTab, setActiveTab]       = useState<"email" | "sms">("email");
  const [copiedText, setCopiedText]     = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Date tab
  const [dateTab, setDateTab] = useState<"All" | "Today" | "Yesterday" | "Old">("All");

  // CSV state
  const [csvStep,    setCsvStep]    = useState<CsvStep>("idle");
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [csvResult,  setCsvResult]  = useState<CsvResult | null>(null);
  const [csvDragging, setCsvDragging] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${API_BASE_URL}/api/v1/leads?limit=500`);
      if (!res.ok) throw new Error("Failed to load leads from backend server.");
      const data = await res.json();
      setLeads(data);
      if (data.length > 0 && !selectedLead) setSelectedLead(data[0]);
      else if (selectedLead) {
        const updated = data.find((l: any) => l.id === selectedLead.id);
        if (updated) setSelectedLead(updated);
      }
    } catch (err: any) {
      setError(err.message || "Could not retrieve leads.");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleStatusChange = async (leadId: number, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/leads/${leadId}/status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update lead status.");
      const updated = await res.json();
      setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
      if (selectedLead?.id === leadId) setSelectedLead(updated);
    } catch (err: any) {
      alert(err.message || "Error updating status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteLead = async (leadId: number) => {
    if (!confirm("Delete this lead? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/leads/${leadId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete lead.");
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

  // ── CSV handlers ────────────────────────────────────────────────────────────

  const handleCsvFile = (file: File) => {
    const fname = file.name.toLowerCase();
    if (!fname.endsWith(".csv") && !fname.endsWith(".xlsx")) {
      alert("Please select a .csv or .xlsx file.");
      return;
    }

    if (fname.endsWith(".xlsx")) {
      // xlsx can't be parsed as text in browser — show minimal preview and let backend handle it
      setCsvPreview({ headers: [], rows: [], total: 0, detected: {}, file });
      setCsvStep("preview");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text     = e.target?.result as string;
      const parsed   = parseCSVPreview(text);
      const detected = detectColumns(parsed.headers);
      setCsvPreview({ ...parsed, detected, file });
      setCsvStep("preview");
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!csvPreview) return;
    setCsvStep("importing");
    try {
      const form = new FormData();
      form.append("file", csvPreview.file);
      const res = await fetch(`${API_BASE_URL}/api/v1/leads/import-csv`, {
        method: "POST",
        body:   form,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Import failed");
      }
      const result: CsvResult = await res.json();
      setCsvResult(result);
      setCsvStep("done");
      await fetchLeads();
    } catch (err: any) {
      alert(err.message || "Import failed");
      setCsvStep("preview");
    }
  };

  const closeCsvModal = () => {
    setCsvStep("idle");
    setCsvPreview(null);
    setCsvResult(null);
    setCsvDragging(false);
  };

  // ── Derived state ───────────────────────────────────────────────────────────

  const filteredLeads = useMemo(() => leads.filter(lead => {
    const matchesSearch =
      lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.message?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && (scoreFilter === "All" || lead.lead_score === scoreFilter);
  }), [leads, searchQuery, scoreFilter]);

  const groupedSections = useMemo(() => groupByDate(filteredLeads), [filteredLeads]);

  const tabLeads = useMemo(() => {
    if (dateTab === "All") return filteredLeads;
    return groupedSections.find(g => g.label === dateTab)?.leads ?? [];
  }, [filteredLeads, groupedSections, dateTab]);

  const tabCounts = useMemo(() => {
    const map: Record<string, number> = { All: filteredLeads.length };
    for (const g of groupedSections) map[g.label] = g.leads.length;
    return map;
  }, [filteredLeads, groupedSections]);

  // All stats recalculate whenever the active tab changes
  const totalLeadsCount    = tabLeads.length;
  const conversionRate     = totalLeadsCount > 0
    ? Math.round((tabLeads.filter(l => ["Qualified", "Closed"].includes(l.status)).length / totalLeadsCount) * 100)
    : 0;
  const followupsGenerated = tabLeads.filter(l => l.followups?.length > 0).length;
  const hoursSaved         = Math.round((totalLeadsCount * 15 / 60) * 10) / 10;

  const hotCount      = tabLeads.filter(l => l.lead_score === "Hot").length;
  const warmCount     = tabLeads.filter(l => l.lead_score === "Warm").length;
  const coldCount     = tabLeads.filter(l => l.lead_score === "Cold").length;
  const maxScoreCount = Math.max(hotCount, warmCount, coldCount, 1);

  const scoreColor = (score: string) => {
    if (score === "Hot")  return "bg-rose-50 text-rose-600 border-rose-200";
    if (score === "Warm") return "bg-amber-50 text-amber-600 border-amber-200";
    return "bg-blue-50 text-blue-600 border-blue-200";
  };

  const statusColor = (status: string) => {
    if (status === "New")       return "bg-blue-50 border-blue-200 text-blue-600";
    if (status === "Contacted") return "bg-amber-50 border-amber-200 text-amber-600";
    if (status === "Qualified") return "bg-emerald-50 border-emerald-200 text-emerald-600";
    return "bg-gray-100 border-gray-300 text-gray-500";
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">

      {/* CSV Import Modal */}
      {csvStep !== "idle" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeCsvModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <span className="font-bold text-gray-900 text-sm">Import Leads from CSV</span>
              </div>
              <button onClick={closeCsvModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Step: file select */}
            {csvStep === "selecting" && (
              <div className="p-6">
                <div
                  onDragOver={(e) => { e.preventDefault(); setCsvDragging(true); }}
                  onDragLeave={() => setCsvDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setCsvDragging(false); const f = e.dataTransfer.files[0]; if (f) handleCsvFile(f); }}
                  className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all ${
                    csvDragging ? "border-indigo-400 bg-indigo-50" : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
                  }`}
                  onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; inp.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleCsvFile(f); }; inp.click(); }}
                >
                  <Upload className={`h-8 w-8 ${csvDragging ? "text-indigo-500" : "text-gray-400"}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Drop your CSV file here</p>
                    <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Accepts .csv and .xlsx · Columns auto-detected
                  </p>
                </div>
              </div>
            )}

            {/* Step: preview */}
            {csvStep === "preview" && csvPreview && (
              <div className="p-6 space-y-4">

                {/* xlsx — no client-side preview available */}
                {csvPreview.file.name.toLowerCase().endsWith(".xlsx") ? (
                  <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <FileText className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-indigo-800">{csvPreview.file.name}</p>
                      <p className="text-xs text-indigo-600 mt-0.5">
                        Excel file ready to import. Columns will be auto-detected on the server.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Detected column mapping */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Detected Columns</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {Object.entries(csvPreview.detected).map(([field, col]) => (
                          <div key={field} className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs">
                            <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span className="text-gray-500 capitalize">{field.replace("_", " ")}</span>
                            <span className="text-gray-300 mx-0.5">→</span>
                            <span className="font-semibold text-gray-700 truncate">{col}</span>
                          </div>
                        ))}
                        {!csvPreview.detected.name && !csvPreview.detected.first_name && (
                          <div className="col-span-2 flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 text-xs text-rose-600">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            No Name column detected — import may fail
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Data preview */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Preview · {csvPreview.total.toLocaleString()} rows
                      </p>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              {csvPreview.headers.slice(0, 5).map(h => (
                                <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 text-[10px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                              ))}
                              {csvPreview.headers.length > 5 && (
                                <th className="px-3 py-2 text-gray-400 text-[10px]">+{csvPreview.headers.length - 5} more</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {csvPreview.rows.map((row, i) => (
                              <tr key={i} className="border-b border-gray-100 last:border-0">
                                {row.slice(0, 5).map((cell, j) => (
                                  <td key={j} className="px-3 py-2 text-gray-700 max-w-[120px] truncate">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={closeCsvModal}
                    className="flex-1 py-2.5 text-sm font-semibold bg-white border border-gray-300 hover:border-gray-400 text-gray-600 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCsvImport}
                    className="flex-1 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm"
                  >
                    {csvPreview.total > 0 ? `Import ${csvPreview.total.toLocaleString()} Leads` : "Import Leads"}
                  </button>
                </div>
              </div>
            )}

            {/* Step: importing */}
            {csvStep === "importing" && (
              <div className="p-10 flex flex-col items-center gap-4">
                <div className="h-10 w-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
                <p className="text-sm font-semibold text-gray-700">Importing leads, please wait...</p>
                <p className="text-xs text-gray-400">Scoring and generating follow-ups for each lead</p>
              </div>
            )}

            {/* Step: done */}
            {csvStep === "done" && csvResult && (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">Import Complete</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      {csvResult.imported} imported · {csvResult.skipped} skipped
                      {csvResult.errors.length > 0 && ` · ${csvResult.errors.length} errors`}
                    </p>
                  </div>
                </div>

                {csvResult.errors.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Errors</p>
                    {csvResult.errors.slice(0, 5).map((e, i) => (
                      <div key={i} className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                        Row {e.row}: {e.error}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={closeCsvModal}
                  className="w-full py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                <span className="text-white font-extrabold text-xs tracking-tight">LN</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                LeadNova
              </span>
              <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-600 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setCsvStep("selecting")}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 rounded-lg transition-all shadow-sm"
            >
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </button>
            <button
              onClick={fetchLeads}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-300 hover:border-gray-400 rounded-lg transition-all disabled:opacity-50 shadow-sm"
            >
              <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Sync
            </button>
          </div>
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
            { label: "Total Leads",         value: totalLeadsCount,       sub: "Captured from all sources",       icon: <Users className="h-4 w-4" />,    iconBg: "bg-indigo-50 text-indigo-600", border: "border-indigo-100" },
            { label: "Pipeline Conversion", value: `${conversionRate}%`,  sub: "Qualified / Closed ratio",        icon: <UserCheck className="h-4 w-4" />, iconBg: "bg-emerald-50 text-emerald-600", border: "border-emerald-100" },
            { label: "Follow-ups Drafted",  value: followupsGenerated,    sub: "Personalized message drafts",     icon: <Mail className="h-4 w-4" />,     iconBg: "bg-purple-50 text-purple-600", border: "border-purple-100" },
            { label: "Time Saved",          value: `${hoursSaved}h`,      sub: "Based on 15 min savings / lead",  icon: <Clock className="h-4 w-4" />,    iconBg: "bg-pink-50 text-pink-600", border: "border-pink-100" },
          ].map((card, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 relative overflow-hidden hover:shadow-md hover:border-gray-300 transition-all group shadow-sm">
              <div className={`absolute right-4 top-4 ${card.iconBg} border ${card.border} p-2 rounded-lg transition-transform group-hover:scale-110 duration-300`}>
                {card.icon}
              </div>
              <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-1 pr-10">{card.label}</p>
              <p className="text-3xl font-extrabold text-gray-900">
                {loading ? <span className="inline-block w-16 h-8 bg-gray-100 rounded animate-pulse" /> : card.value}
              </p>
              <p className="text-[10px] text-gray-400 mt-2">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Analytics row */}
        <div className="grid md:grid-cols-3 gap-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 md:col-span-2 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-6 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-indigo-500" /> Lead Score Breakdown
            </h3>
            <div className="space-y-5">
              {[
                { label: "Hot Leads",  sub: "High Interest",     count: hotCount,  bar: "from-rose-500 to-orange-500",  text: "text-rose-600"  },
                { label: "Warm Leads", sub: "Evaluation Stage",  count: warmCount, bar: "from-amber-500 to-yellow-500", text: "text-amber-600" },
                { label: "Cold Leads", sub: "General Inbound",   count: coldCount, bar: "from-blue-500 to-cyan-500",    text: "text-blue-600"  },
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
                  { status: "New",       color: "text-blue-600",    dot: "bg-blue-500"    },
                  { status: "Contacted", color: "text-amber-600",   dot: "bg-amber-500"   },
                  { status: "Qualified", color: "text-emerald-600", dot: "bg-emerald-500" },
                  { status: "Closed",    color: "text-gray-500",    dot: "bg-gray-400"    },
                ].map(({ status, color, dot }) => (
                  <div key={status} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${dot} shrink-0`} />
                    <span className={color}>{status}</span>
                    <span className="text-gray-400 ml-auto font-bold">{tabLeads.filter(l => l.status === status).length}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-gray-200 text-xs text-gray-400 leading-relaxed">
              <span className="font-semibold text-gray-600">Tip:</span> Select a lead to view follow-up drafts and update its pipeline status.
            </div>
          </div>
        </div>

        {/* Pipeline split view */}
        <div className="grid lg:grid-cols-5 gap-5 items-start">

          {/* Lead list (3/5) */}
          <div className="lg:col-span-3 bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">

            {/* Date tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50/50 px-4 pt-3 gap-1">
              {(["All", "Today", "Yesterday", "Old"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDateTab(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
                    dateTab === tab
                      ? "border-b-indigo-500 text-indigo-600 bg-white"
                      : "border-b-transparent text-gray-400 hover:text-gray-600 hover:bg-white/60"
                  }`}
                >
                  {tab}
                  {tabCounts[tab] !== undefined && tabCounts[tab] > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      dateTab === tab ? "bg-indigo-100 text-indigo-600" : "bg-gray-200 text-gray-500"
                    }`}>
                      {tabCounts[tab]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search + filter bar */}
            <div className="p-3 border-b border-gray-200 flex flex-col md:flex-row gap-2 bg-gray-50/30">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
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
                  <option value="Hot">Hot</option>
                  <option value="Warm">Warm</option>
                  <option value="Cold">Cold</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
              {loading ? (
                <div className="p-8 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-4 items-center p-4 rounded-xl border border-gray-100">
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" />
                        <div className="h-2.5 w-20 bg-gray-100 rounded animate-pulse" />
                      </div>
                      <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                      <div className="h-5 w-12 bg-gray-100 rounded-full animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : tabLeads.length === 0 ? (
                <div className="py-16 px-6 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-14 h-14 bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center">
                    <Inbox className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500">No leads found</p>
                  <p className="text-xs text-gray-400">
                    {leads.length === 0
                      ? "Submit your first lead via the landing page demo."
                      : dateTab !== "All"
                      ? `No leads for ${dateTab.toLowerCase()}. Try the All tab.`
                      : "Try adjusting your search or filter."}
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
                      <th className="p-4 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {tabLeads.map((lead) => {
                      const isSelected    = selectedLead?.id === lead.id;
                      const dateFormatted = new Date(lead.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                      return (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className={`group border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
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
                          <td className="pr-3 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="Delete lead"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex justify-between items-center text-[10px] text-gray-400 font-medium">
              <span>Showing {tabLeads.length} of {leads.length} leads</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Live</span>
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
                <p className="text-xs text-gray-400">Select a lead from the list to view details and generated responses.</p>
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
                      <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 block mb-1.5">Lead Summary</span>
                      <p className="text-xs text-gray-700 italic leading-relaxed">{selectedLead.summary}</p>
                    </div>
                  )}
                </div>

                {/* Follow-up workspace */}
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
                            <span>{activeTab === "email" ? "EMAIL COPY" : "SMS (MAX 240 CHARS)"}</span>
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

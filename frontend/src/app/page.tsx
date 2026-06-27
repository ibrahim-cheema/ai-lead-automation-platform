"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Mail, MessageSquare, Clock, TrendingUp,
  CheckCircle, Building2, User, FileText, Copy, Check, Zap,
  Shield, Layers, Database, BarChart2, Target, GitMerge, Menu, X,
  ChevronRight, Send
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Home() {
  const [formData, setFormData] = useState({
    name: "", email: "", company: "", role: "", message: "", source: "website_form"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<any>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedSMS, setCopiedSMS] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!formData.name || !formData.company || !formData.email) {
      setError("Please fill in Name, Email, and Company.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessData(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error("Failed to process lead. Please verify backend is running.");
      const data = await response.json();
      if (data) {
        setSuccessData(data);
        setFormData({ name: "", email: "", company: "", role: "", message: "", source: "website_form" });
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while submitting.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: "email" | "sms") => {
    navigator.clipboard.writeText(text);
    if (type === "email") { setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000); }
    else { setCopiedSMS(true); setTimeout(() => setCopiedSMS(false), 2000); }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden">

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white font-extrabold text-sm tracking-tight">LN</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">
              LeadNova
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a>
            <a href="#interactive-demo" className="hover:text-gray-900 transition-colors">Demo</a>
            <a href="#contact" className="hover:text-gray-900 transition-colors">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/proposal"
              className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 hover:border-indigo-300 transition-all shadow-sm"
            >
              Client Proposal
            </Link>
            <Link
              href="/dashboard"
              className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 hover:border-gray-400 transition-all shadow-sm"
            >
              Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-900 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200 animate-slideDown">
            <nav className="flex flex-col gap-4 pt-4 px-1">
              {[
                { href: "#features", label: "Features" },
                { href: "#how-it-works", label: "How It Works" },
                { href: "#interactive-demo", label: "Live Demo" },
                { href: "#contact", label: "Contact" },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {label}
                </a>
              ))}
              <Link
                href="/proposal"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors font-medium"
              >
                Client Proposal →
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Admin Dashboard
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 px-6 overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_20%,rgba(99,102,241,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_80%,rgba(168,85,247,0.07),transparent_55%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-40 bg-gradient-to-b from-indigo-200/0 via-indigo-300/50 to-indigo-200/0" />

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-4 py-1.5 text-xs text-indigo-600 font-semibold mb-7 shadow-sm">
            <Zap className="h-3 w-3 text-indigo-500" />
            Smart Lead Management Platform · Trusted by 500+ teams
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.06]">
            <span className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-transparent">
              AI-Powered Leads That
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Convert 5x Faster
            </span>
          </h1>

          <p className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop losing leads to slow follow-ups. LeadNova captures inbound inquiries, scores their potential
            instantly, and generates personalized outreach campaigns in under 5 seconds.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
            <a
              href="#interactive-demo"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-300/40 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              Try Live Demo
            </a>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 font-semibold rounded-xl border border-gray-300 hover:border-gray-400 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              Explore Features
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          {/* Floating stats */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            {[
              { value: "20+ hrs", label: "Saved Weekly" },
              { value: "5x", label: "Faster Response" },
              { value: "100%", label: "Lead Capture" }
            ].map((stat, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
                <div className="text-xl font-extrabold text-gray-900">{stat.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="border-y border-gray-200 bg-gray-50 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-5">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">INTEGRATES WITH YOUR PIPELINE</p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 hover:opacity-80 transition-opacity duration-300">
            {[
              { icon: <Database className="h-4 w-4 text-indigo-500" />, name: "Supabase" },
              { icon: <Layers className="h-4 w-4 text-indigo-500" />, name: "n8n" },
              { icon: <Shield className="h-4 w-4 text-indigo-500" />, name: "OpenAI" },
              { icon: <Zap className="h-4 w-4 text-indigo-500" />, name: "Make.com" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                {item.icon} {item.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs text-indigo-600 font-semibold uppercase tracking-widest mb-3">Simple Process</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">How LeadNova Works</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Three steps from inbound lead to personalized follow-up, fully automated in seconds.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+2.5rem)] right-[calc(16.67%+2.5rem)] h-px bg-gradient-to-r from-indigo-300/40 via-purple-400/60 to-pink-300/40 z-0" />

            {[
              {
                step: "01", title: "Lead Capture",
                description: "A prospect fills your web form. LeadNova instantly receives the submission and begins multi-factor analysis.",
                icon: <Target className="h-6 w-6" />, color: "indigo"
              },
              {
                step: "02", title: "Smart Analysis",
                description: "Scores each lead Hot, Warm, or Cold based on intent signals, role, company, and message depth.",
                icon: <BarChart2 className="h-6 w-6" />, color: "purple"
              },
              {
                step: "03", title: "Outreach Ready",
                description: "Personalized email and SMS templates are generated instantly — ready to send or push to your CRM.",
                icon: <GitMerge className="h-6 w-6" />, color: "pink"
              }
            ].map((item, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center group">
                <div className={`w-20 h-20 rounded-2xl mb-6 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1 ${
                  item.color === "indigo" ? "bg-indigo-50 border border-indigo-200 text-indigo-600 shadow-md shadow-indigo-100" :
                  item.color === "purple" ? "bg-purple-50 border border-purple-200 text-purple-600 shadow-md shadow-purple-100" :
                  "bg-pink-50 border border-pink-200 text-pink-600 shadow-md shadow-pink-100"
                }`}>
                  {item.icon}
                </div>
                <div className={`text-xs font-bold tracking-widest mb-2 ${
                  item.color === "indigo" ? "text-indigo-500" : item.color === "purple" ? "text-purple-500" : "text-pink-500"
                }`}>
                  STEP {item.step}
                </div>
                <h3 className="text-lg font-bold mb-3 text-gray-900">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs text-indigo-600 font-semibold uppercase tracking-widest mb-3">Key Features</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Powerful Features To Drive Growth</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Our platform handles the heavy lifting, turning cold form entries into highly-qualified pipeline opportunities.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Clock className="h-6 w-6" />, accent: "indigo",
                title: "Instant AI Response",
                description: "As soon as a lead submits, our engine processes the details, drafts custom emails, and schedules follow-up sequences in under 5 seconds."
              },
              {
                icon: <TrendingUp className="h-6 w-6" />, accent: "purple",
                title: "Intelligent Lead Scoring",
                description: "We score incoming requests as Hot, Warm, or Cold based on indicators like message depth, budget cues, urgency, and job roles."
              },
              {
                icon: <Mail className="h-6 w-6" />, accent: "pink",
                title: "Personalized Copywriting",
                description: "No generic templates. The AI generates emails and SMS drafts addressing the specific pain points mentioned by each lead."
              }
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 hover:border-indigo-200 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group"
              >
                <div className={`p-4 rounded-xl w-fit mb-6 transition-transform duration-300 group-hover:scale-110 ${
                  feature.accent === "indigo" ? "bg-indigo-50 text-indigo-600" :
                  feature.accent === "purple" ? "bg-purple-50 text-purple-600" :
                  "bg-pink-50 text-pink-600"
                }`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits / Statistics */}
      <section id="benefits" className="py-20 px-6 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            {[
              { value: "20+ Hours", label: "Time Saved Weekly", sub: "Eliminate manual follow-up writing and scoring", color: "text-indigo-600" },
              { value: "5x", label: "Response Speed", sub: "Engage customers when their interest is at peak", color: "text-purple-600" },
              { value: "100%", label: "Lead Capturing", sub: "Never miss a contact form entry again", color: "text-pink-600" }
            ].map((stat, i) => (
              <div key={i} className="p-8 bg-white border border-gray-200 rounded-2xl hover:border-gray-300 hover:shadow-md transition-all group">
                <div className={`text-5xl font-extrabold mb-3 transition-transform group-hover:scale-110 duration-300 ${stat.color}`}>{stat.value}</div>
                <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-2">{stat.label}</p>
                <p className="text-xs text-gray-400">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo Form */}
      <section id="interactive-demo" className="py-24 px-6 relative bg-gray-50 border-t border-gray-200">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.06),transparent_55%)]" />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="text-xs text-indigo-600 font-semibold uppercase tracking-widest mb-3">Interactive Demo</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">See It In Action</h2>
            <p className="text-gray-500">Fill in the demo form and watch the AI process it in real time.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl p-8 md:p-10 shadow-xl shadow-gray-200/80 relative">
            <div className="absolute -top-4 right-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold uppercase px-4 py-1.5 rounded-full shadow-lg shadow-indigo-300/40">
              Live Demo
            </div>

            {!successData ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm flex items-start gap-3">
                    <span className="text-rose-500 text-base leading-none mt-0.5">⚠</span>
                    {error}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text" name="name" value={formData.name} onChange={handleChange}
                        placeholder="Ali Ahmed" required
                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 rounded-xl py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <input
                        type="email" name="email" value={formData.email} onChange={handleChange}
                        placeholder="ali@company.com" required
                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 rounded-xl py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Company *</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text" name="company" value={formData.company} onChange={handleChange}
                        placeholder="TechNova Inc." required
                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 rounded-xl py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Your Role</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text" name="role" value={formData.role} onChange={handleChange}
                        placeholder="Founder / CTO"
                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 rounded-xl py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Requirements / Message</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-4 h-4 w-4 text-gray-400 pointer-events-none" />
                    <textarea
                      name="message" value={formData.message} onChange={handleChange} rows={4}
                      placeholder="e.g. We need an AI automation for customer support ticket classification and drafting replies..."
                      className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 rounded-xl py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-300/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing your request...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Get Consultation
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-8 animate-fadeIn">
                <div className="text-center pb-6 border-b border-gray-200">
                  <div className="bg-emerald-50 text-emerald-600 border border-emerald-200 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md shadow-emerald-100">
                    <CheckCircle className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Lead Captured Successfully!</h3>
                  <p className="text-gray-500 text-sm">Response generated instantly for this lead.</p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center gap-3">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Lead Score</span>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      successData.lead_score === "Hot"
                        ? "bg-rose-50 border border-rose-200 text-rose-600"
                        : successData.lead_score === "Warm"
                        ? "bg-amber-50 border border-amber-200 text-amber-600"
                        : "bg-blue-50 border border-blue-200 text-blue-600"
                    }`}>
                      {successData.lead_score}
                    </span>
                  </div>
                  <div className="sm:col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-5">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block mb-2">Smart Summary</span>
                    <p className="text-sm text-gray-700 italic leading-relaxed">{successData.summary}</p>
                  </div>
                </div>

                {successData.followups && successData.followups.length > 0 && (
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-indigo-500" />
                          Generated Follow-up Email
                        </span>
                        <button
                          onClick={() => copyToClipboard(successData.followups[0].email_content, "email")}
                          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-all"
                        >
                          {copiedEmail ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedEmail ? "Copied!" : "Copy Email"}
                        </button>
                      </div>
                      <pre className="w-full bg-gray-50 border border-gray-200 rounded-xl p-5 text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                        {successData.followups[0].email_content}
                      </pre>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
                          Generated SMS Template
                        </span>
                        <button
                          onClick={() => copyToClipboard(successData.followups[0].sms_content, "sms")}
                          className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg transition-all"
                        >
                          {copiedSMS ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedSMS ? "Copied!" : "Copy SMS"}
                        </button>
                      </div>
                      <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-5 text-xs font-mono text-gray-700 leading-relaxed">
                        {successData.followups[0].sms_content}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <button
                    onClick={() => setSuccessData(null)}
                    className="flex-1 py-3 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 font-semibold rounded-xl border border-gray-300 hover:border-gray-400 transition-all text-sm shadow-sm"
                  >
                    Submit Another Lead
                  </button>
                  <Link
                    href="/dashboard"
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all text-center text-sm shadow-md flex items-center justify-center gap-2"
                  >
                    View in Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 px-6 bg-white border-t border-gray-200">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-xs text-indigo-600 font-semibold uppercase tracking-widest mb-3">Get In Touch</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Ready to Transform Your Sales?</h2>
          <p className="text-gray-500 max-w-lg mx-auto mb-10 leading-relaxed">
            Have questions or want a custom implementation for your team? We&apos;re ready to help you automate your entire lead pipeline.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:hello@leadnova.ai"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-300/30 transition-all hover:scale-[1.02]"
            >
              <Mail className="h-5 w-5" />
              hello@leadnova.ai
            </a>
            <a
              href="#interactive-demo"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 font-semibold rounded-xl border border-gray-300 hover:border-gray-400 transition-all shadow-sm"
            >
              <ChevronRight className="h-5 w-5 text-indigo-500" />
              Try Demo First
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-extrabold text-xs">LN</span>
            </div>
            <span className="font-bold text-gray-700 text-sm">LeadNova</span>
          </div>
          <p className="text-xs text-gray-400">© 2026 LeadNova. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-gray-400">
            <a href="#features" className="hover:text-gray-700 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-700 transition-colors">How It Works</a>
            <a href="#contact" className="hover:text-gray-700 transition-colors">Contact</a>
            <Link href="/dashboard" className="hover:text-gray-700 transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

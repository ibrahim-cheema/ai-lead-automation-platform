"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles, CheckCircle, ArrowRight, Clock, TrendingUp, Mail,
  Zap, BarChart3, Code2, Globe, Star, Check, Target, Brain,
  AlertCircle, Users, DollarSign, Shield, GitMerge, X,
  ChevronRight, Calendar, Layers, MessageSquare, Database,
  RefreshCw, Phone, Timer, FileCode, Cpu, Lock, Rocket
} from "lucide-react";

export default function ProposalPage() {
  const [leads, setLeads] = useState(50);
  const [dealValue, setDealValue] = useState(3000);
  const [currentRate, setCurrentRate] = useState(10);

  // ROI calculations
  const timeSavedHrs = Math.round(leads * 0.5 * 0.85);          // 85% of 30min/lead saved
  const laborSaved = timeSavedHrs * 25;                           // $25/hr
  const newRate = Math.min(currentRate * 1.40, 95);               // 40% lift, cap 95%
  const extraDeals = Math.round(leads * (newRate - currentRate) / 100);
  const extraRevenue = extraDeals * dealValue;
  const totalMonthlyValue = laborSaved + extraRevenue;
  const annualValue = totalMonthlyValue * 12;

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How long does the full setup take?",
      a: "From signing off to going live takes 3–5 business days. Backend deployment takes about 4 hours, website integration 1–2 hours, and the rest is testing and onboarding your team."
    },
    {
      q: "Will it work with my existing contact form?",
      a: "Yes. We add a lightweight JavaScript snippet to your site that connects your existing form — or any new form — to the LeadNova AI engine. It works with WordPress, Webflow, Squarespace, Wix, Shopify, and any custom-coded site."
    },
    {
      q: "What happens to our lead data?",
      a: "Your data is stored in your own private database (we set up a dedicated Supabase or PostgreSQL instance for you). Nobody else can access it. You own it completely."
    },
    {
      q: "Do we need technical staff to manage it?",
      a: "No. The admin dashboard is designed for non-technical users — just a browser and a login. We provide a 30-minute training session, and ongoing support is included."
    },
    {
      q: "Can it integrate with our existing CRM (HubSpot, Salesforce, Pipedrive)?",
      a: "Yes. We connect via n8n or Make.com automation, which acts as a bridge between LeadNova AI and your CRM. New leads and their AI-generated follow-ups appear in your CRM automatically."
    },
    {
      q: "What AI does it use? Is it reliable?",
      a: "The system uses xAI (Grok), OpenAI GPT-4, or Groq depending on availability — with automatic fallback between providers. Uptime is effectively 99.9%+. A rule-based backup ensures responses even if all AI providers are temporarily unavailable."
    },
    {
      q: "What if we get a very high volume of leads?",
      a: "The architecture is designed to scale. For volumes over 500 leads/month, we switch to a production-grade server setup with queue management. The database is PostgreSQL (via Supabase) which handles millions of records comfortably."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-2 rounded-lg text-white shadow-md shadow-indigo-200">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-indigo-700 bg-clip-text text-transparent">
              LeadNova AI
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1 rounded-full">
              Client Proposal
            </span>
            <a
              href="#demo-cta"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold rounded-lg shadow-md shadow-indigo-300/30 transition-all"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative py-20 md:py-28 px-6 overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(99,102,241,0.09),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(168,85,247,0.07),transparent_55%)]" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 text-xs text-amber-700 font-semibold mb-6">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            Right now, your website is losing leads every hour it goes without this
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.08]">
            <span className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
              Your Competition Responds to Leads
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              In 5 Minutes. You Take 24 Hours.
            </span>
          </h1>

          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            LeadNova AI is a fully automated lead capture and follow-up system that qualifies,
            scores, and drafts personalized outreach for every inbound lead — in under 5 seconds,
            24 hours a day, without hiring more staff.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-14">
            <a
              href="#roi"
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-300/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <DollarSign className="h-5 w-5" />
              Calculate My ROI
            </a>
            <Link
              href="/"
              className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border border-gray-300 hover:border-gray-400 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Sparkles className="h-5 w-5 text-indigo-500" />
              See Live Demo
            </Link>
          </div>

          {/* Key Numbers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { value: "5 sec", label: "Response time", icon: <Timer className="h-4 w-4 text-indigo-500" /> },
              { value: "40%", label: "More conversions", icon: <TrendingUp className="h-4 w-4 text-emerald-500" /> },
              { value: "20+ hrs", label: "Saved per week", icon: <Clock className="h-4 w-4 text-purple-500" /> },
              { value: "4–5 days", label: "To go live", icon: <Rocket className="h-4 w-4 text-pink-500" /> },
            ].map((s, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
                <div className="flex items-center justify-center gap-1.5 mb-2">{s.icon}</div>
                <div className="text-2xl font-extrabold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-400 mt-0.5 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── THE PROBLEM ─── */}
      <section className="py-20 px-6 bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs text-rose-600 font-semibold uppercase tracking-widest mb-3">The Harsh Reality</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Your Leads Are Slipping Away Right Now</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Most businesses lose more than half their inbound leads — not from bad products, but from slow, inconsistent follow-up.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                stat: "10×", label: "Lower conversion if you don't respond within 5 minutes",
                detail: "MIT study: A 5-minute response vs 1-hour response has a 10× higher chance of qualifying the lead.",
                color: "rose"
              },
              {
                stat: "48%", label: "Of salespeople never follow up after the first contact",
                detail: "Half your team gives up after one attempt. AI doesn't — it generates the perfect follow-up automatically.",
                color: "amber"
              },
              {
                stat: "24+ hrs", label: "Average time businesses take to respond to a new lead",
                detail: "By the time you reply, your prospect has contacted three competitors and one of them already got back to them.",
                color: "purple"
              },
            ].map((p, i) => (
              <div key={i} className={`bg-white border rounded-2xl p-7 shadow-sm ${
                p.color === "rose" ? "border-rose-200" : p.color === "amber" ? "border-amber-200" : "border-purple-200"
              }`}>
                <div className={`text-5xl font-extrabold mb-3 ${
                  p.color === "rose" ? "text-rose-500" : p.color === "amber" ? "text-amber-500" : "text-purple-500"
                }`}>{p.stat}</div>
                <p className="font-bold text-gray-800 text-sm mb-3 leading-snug">{p.label}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{p.detail}</p>
              </div>
            ))}
          </div>

          {/* Before / After */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-7">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center">
                  <X className="h-4 w-4 text-rose-500" />
                </div>
                <span className="font-bold text-rose-700 text-sm uppercase tracking-wider">Without LeadNova AI</span>
              </div>
              <ul className="space-y-3 text-sm">
                {[
                  "Lead submits form → sits in email inbox for hours",
                  "Sales rep manually reads, scores, and decides priority",
                  "Writes a follow-up email from scratch (or uses a generic template)",
                  "Copies lead info into CRM manually",
                  "Follows up the next business day — maybe",
                  "No data on which leads are hottest",
                  "High-priority leads get the same treatment as tire-kickers",
                  "Team burns 20+ hours/week on admin, not selling",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-rose-700">
                    <X className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-7">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                  <Check className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="font-bold text-emerald-700 text-sm uppercase tracking-wider">With LeadNova AI</span>
              </div>
              <ul className="space-y-3 text-sm">
                {[
                  "Lead submits form → AI processes it in under 5 seconds",
                  "Automatically scored Hot, Warm, or Cold with reasoning",
                  "AI writes a personalized follow-up email addressing their exact needs",
                  "Lead auto-logged to dashboard with full context",
                  "Team gets notified instantly with the draft ready to send",
                  "Real-time dashboard shows pipeline by priority",
                  "High-value prospects get personalized treatment automatically",
                  "Team focuses exclusively on closing — AI handles everything else",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-emerald-700">
                    <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ROI CALCULATOR ─── */}
      <section id="roi" className="py-20 px-6 bg-white border-t border-gray-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs text-indigo-600 font-semibold uppercase tracking-widest mb-3">Your Business Numbers</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Calculate Your ROI</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Adjust the sliders to match your business. See exactly what LeadNova AI is worth to you every month.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Sliders */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 space-y-8">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-semibold text-gray-700">Monthly Inbound Leads</label>
                  <span className="text-lg font-extrabold text-indigo-600">{leads}</span>
                </div>
                <input
                  type="range" min="10" max="500" step="5" value={leads}
                  onChange={(e) => setLeads(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>10</span><span>500</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-semibold text-gray-700">Average Deal Value</label>
                  <span className="text-lg font-extrabold text-indigo-600">${dealValue.toLocaleString()}</span>
                </div>
                <input
                  type="range" min="500" max="50000" step="500" value={dealValue}
                  onChange={(e) => setDealValue(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>$500</span><span>$50,000</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-semibold text-gray-700">Current Lead-to-Close Rate</label>
                  <span className="text-lg font-extrabold text-indigo-600">{currentRate}%</span>
                </div>
                <input
                  type="range" min="1" max="40" step="1" value={currentRate}
                  onChange={(e) => setCurrentRate(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1%</span><span>40%</span>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed border-t border-gray-200 pt-4">
                * Based on MIT research: immediate AI response improves close rate by ~40%. Labor savings calculated at $25/hr for email writing, CRM logging, and lead scoring.
              </p>
            </div>

            {/* Results */}
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-1">Hours Saved Monthly</div>
                <div className="text-4xl font-extrabold text-indigo-700">{timeSavedHrs} hrs</div>
                <p className="text-xs text-indigo-600 mt-1">Your team stops writing emails & manually scoring leads</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Additional Deals Closed / Month</div>
                <div className="text-4xl font-extrabold text-emerald-700">+{extraDeals} deals</div>
                <p className="text-xs text-emerald-600 mt-1">
                  Conversion rate improves from {currentRate}% → {newRate.toFixed(1)}% with instant AI follow-up
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">Extra Revenue Per Month</div>
                <div className="text-4xl font-extrabold text-purple-700">${extraRevenue.toLocaleString()}</div>
                <p className="text-xs text-purple-600 mt-1">{extraDeals} extra deals × ${dealValue.toLocaleString()} avg value</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-200 mb-1">Total Annual Value</div>
                <div className="text-5xl font-extrabold">${annualValue.toLocaleString()}</div>
                <p className="text-indigo-200 text-xs mt-2">
                  ${totalMonthlyValue.toLocaleString()}/mo · ${laborSaved.toLocaleString()} saved in labor + ${extraRevenue.toLocaleString()} in new revenue
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES & BUSINESS BENEFITS ─── */}
      <section className="py-20 px-6 bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs text-indigo-600 font-semibold uppercase tracking-widest mb-3">What You Get</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Every Feature, and What It Means for Your Business</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: <Zap className="h-6 w-6" />, color: "indigo",
                feature: "5-Second AI Response",
                business: "Never lose a lead to a faster competitor again. Every person who fills your form gets acknowledged and analyzed while the interest is still hot.",
                metric: "10× higher conversion vs 1-hr response"
              },
              {
                icon: <Target className="h-6 w-6" />, color: "rose",
                feature: "Hot / Warm / Cold Lead Scoring",
                business: "Your team knows exactly who to call first. Hot leads get immediate personal attention; cold leads go into a nurture sequence — automatically.",
                metric: "Zero time wasted on unqualified leads"
              },
              {
                icon: <Mail className="h-6 w-6" />, color: "purple",
                feature: "AI-Personalized Email Drafts",
                business: "Every lead gets a tailored response that references their specific needs — not a generic template. Higher open rates, higher reply rates.",
                metric: "Avg 3× better reply rate vs generic email"
              },
              {
                icon: <MessageSquare className="h-6 w-6" />, color: "pink",
                feature: "SMS Follow-up Templates",
                business: "SMS has a 98% open rate vs 20% for email. Your team gets an AI-drafted SMS ready to send with one click.",
                metric: "98% SMS open rate vs 20% email"
              },
              {
                icon: <BarChart3 className="h-6 w-6" />, color: "emerald",
                feature: "Real-Time Pipeline Dashboard",
                business: "See every lead, their score, stage, and AI-generated summary in one place. Know the health of your pipeline at a glance without digging through your inbox.",
                metric: "Full visibility, zero data entry"
              },
              {
                icon: <Layers className="h-6 w-6" />, color: "amber",
                feature: "CRM & Automation Integration",
                business: "LeadNova AI connects to HubSpot, Salesforce, Pipedrive, or any tool via n8n or Make.com. Leads and follow-ups appear in your existing workflow automatically.",
                metric: "Works with tools you already use"
              },
              {
                icon: <RefreshCw className="h-6 w-6" />, color: "cyan",
                feature: "Status & Pipeline Management",
                business: "Update a lead from New → Contacted → Qualified → Closed in one click. Track your sales cycle without switching between apps.",
                metric: "Full lifecycle in one dashboard"
              },
              {
                icon: <Shield className="h-6 w-6" />, color: "slate",
                feature: "Your Data, Your Database",
                business: "All lead data lives in a database we set up exclusively for your business. No data sharing, no third-party access. You own it completely.",
                metric: "GDPR-ready, full data ownership"
              },
            ].map((item, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-7 hover:shadow-md hover:border-gray-300 transition-all group">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shrink-0 group-hover:scale-110 transition-transform ${
                    item.color === "indigo" ? "bg-indigo-50 text-indigo-600" :
                    item.color === "rose" ? "bg-rose-50 text-rose-600" :
                    item.color === "purple" ? "bg-purple-50 text-purple-600" :
                    item.color === "pink" ? "bg-pink-50 text-pink-600" :
                    item.color === "emerald" ? "bg-emerald-50 text-emerald-600" :
                    item.color === "amber" ? "bg-amber-50 text-amber-600" :
                    item.color === "cyan" ? "bg-cyan-50 text-cyan-600" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1.5">{item.feature}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-3">{item.business}</p>
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                      <Star className="h-3 w-3" />
                      {item.metric}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── IMPLEMENTATION PLAN ─── */}
      <section className="py-20 px-6 bg-white border-t border-gray-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs text-indigo-600 font-semibold uppercase tracking-widest mb-3">Implementation Plan</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">From Sign-Off to Live in 4–5 Business Days</h2>
            <p className="text-gray-500 max-w-xl mx-auto">A structured, zero-disruption rollout. Your website stays online, your team gets trained, and your first real leads flow through AI from day one.</p>
          </div>

          <div className="space-y-4">
            {[
              {
                day: "Day 1", phase: "Backend Deployment",
                color: "indigo", icon: <Cpu className="h-5 w-5" />,
                tasks: [
                  "Deploy FastAPI AI engine to cloud server (Railway / Render / DigitalOcean)",
                  "Provision your dedicated PostgreSQL database (via Supabase)",
                  "Configure AI provider credentials (xAI Grok + OpenAI fallback)",
                  "Set environment variables and security keys",
                  "Run health checks — all endpoints verified live",
                ],
                deliverable: "Live API endpoint: https://api.[yourdomain].com"
              },
              {
                day: "Day 2", phase: "Website Integration",
                color: "purple", icon: <Globe className="h-5 w-5" />,
                tasks: [
                  "Receive access to your website (WordPress, Webflow, Squarespace, or custom code)",
                  "Add LeadNova tracking script to site's <head> — 3 lines of code",
                  "Connect your existing contact form OR embed our form (your choice)",
                  "Map form fields to LeadNova AI inputs (name, email, company, message)",
                  "Test end-to-end: submit form → verify AI scores lead → verify response in dashboard",
                ],
                deliverable: "Your website form now feeds LeadNova AI in real time"
              },
              {
                day: "Day 3", phase: "Dashboard & CRM Setup",
                color: "emerald", icon: <BarChart3 className="h-5 w-5" />,
                tasks: [
                  "Configure secure admin dashboard at https://crm.[yourdomain].com",
                  "Set up user accounts for your team members",
                  "Optional: Connect to HubSpot / Salesforce / Pipedrive via n8n automation",
                  "Optional: Configure email/SMS notifications when hot leads come in",
                  "Optional: Connect Make.com for multi-step lead routing workflows",
                ],
                deliverable: "Dashboard live with real-time data, team access configured"
              },
              {
                day: "Day 4", phase: "QA Testing & Refinement",
                color: "amber", icon: <RefreshCw className="h-5 w-5" />,
                tasks: [
                  "Submit 10+ test leads with different profiles (enterprise buyer, casual inquiry, etc.)",
                  "Review AI scores, summaries, and email drafts for accuracy and tone",
                  "Fine-tune AI prompts to match your industry and sales style",
                  "Test edge cases: incomplete forms, foreign language submissions",
                  "Verify CRM syncing, notifications, and dashboard data",
                ],
                deliverable: "AI output reviewed, adjusted, and approved by you"
              },
              {
                day: "Day 5", phase: "Go Live & Onboarding",
                color: "pink", icon: <Rocket className="h-5 w-5" />,
                tasks: [
                  "Final go-live confirmation and DNS/domain configuration",
                  "30-minute team training session (live video call)",
                  "Walk-through: how to read scores, use dashboard, update pipeline status",
                  "Copy-to-clipboard email/SMS workflow demonstration",
                  "Handover documentation + 30-day support included",
                ],
                deliverable: "Your team is live, trained, and processing real leads through AI"
              },
            ].map((phase, i) => (
              <div key={i} className={`bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ${
                phase.color === "indigo" ? "border-indigo-200" :
                phase.color === "purple" ? "border-purple-200" :
                phase.color === "emerald" ? "border-emerald-200" :
                phase.color === "amber" ? "border-amber-200" :
                "border-pink-200"
              }`}>
                <div className={`px-7 py-5 flex flex-col md:flex-row md:items-center gap-4 ${
                  phase.color === "indigo" ? "bg-indigo-50" :
                  phase.color === "purple" ? "bg-purple-50" :
                  phase.color === "emerald" ? "bg-emerald-50" :
                  phase.color === "amber" ? "bg-amber-50" :
                  "bg-pink-50"
                }`}>
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2.5 rounded-xl ${
                      phase.color === "indigo" ? "bg-indigo-100 text-indigo-600" :
                      phase.color === "purple" ? "bg-purple-100 text-purple-600" :
                      phase.color === "emerald" ? "bg-emerald-100 text-emerald-600" :
                      phase.color === "amber" ? "bg-amber-100 text-amber-600" :
                      "bg-pink-100 text-pink-600"
                    }`}>
                      {phase.icon}
                    </div>
                    <div>
                      <div className={`text-xs font-bold uppercase tracking-wider ${
                        phase.color === "indigo" ? "text-indigo-500" :
                        phase.color === "purple" ? "text-purple-500" :
                        phase.color === "emerald" ? "text-emerald-600" :
                        phase.color === "amber" ? "text-amber-600" :
                        "text-pink-600"
                      }`}>{phase.day}</div>
                      <div className="font-bold text-gray-900 text-lg">{phase.phase}</div>
                    </div>
                  </div>
                  <div className="hidden md:block h-10 w-px bg-gray-200" />
                  <div className="md:w-72">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Deliverable</div>
                    <div className="text-xs text-gray-600 font-medium">{phase.deliverable}</div>
                  </div>
                </div>
                <div className="px-7 py-5">
                  <ul className="space-y-2">
                    {phase.tasks.map((task, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TECHNICAL INTEGRATION GUIDE ─── */}
      <section className="py-20 px-6 bg-gray-50 border-t border-gray-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs text-indigo-600 font-semibold uppercase tracking-widest mb-3">Technical Integration</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">How We Connect to Your Website</h2>
            <p className="text-gray-500 max-w-xl mx-auto">We handle everything. Here&apos;s exactly what gets added to your site — so you know it&apos;s minimal and non-intrusive.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-12">
            {[
              { icon: <Globe className="h-5 w-5" />, title: "Any Website Platform", desc: "Works on WordPress, Webflow, Squarespace, Wix, Shopify, Framer, or any custom HTML/JS site.", color: "indigo" },
              { icon: <FileCode className="h-5 w-5" />, title: "Lightweight Script", desc: "We add 3 lines of JavaScript to your site's header. Zero impact on page load speed.", color: "purple" },
              { icon: <Lock className="h-5 w-5" />, title: "HTTPS + Secure", desc: "All data transmitted over encrypted HTTPS. No cookies, no tracking pixels, no third-party sharing.", color: "emerald" },
            ].map((item, i) => (
              <div key={i} className={`bg-white border rounded-2xl p-6 shadow-sm ${
                item.color === "indigo" ? "border-indigo-200" :
                item.color === "purple" ? "border-purple-200" : "border-emerald-200"
              }`}>
                <div className={`p-2.5 rounded-xl w-fit mb-4 ${
                  item.color === "indigo" ? "bg-indigo-50 text-indigo-600" :
                  item.color === "purple" ? "bg-purple-50 text-purple-600" : "bg-emerald-50 text-emerald-600"
                }`}>
                  {item.icon}
                </div>
                <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Code blocks */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">1</div>
                <h4 className="font-bold text-gray-900">Script added to your website header (3 lines)</h4>
              </div>
              <div className="bg-gray-900 rounded-2xl p-6 overflow-x-auto">
                <pre className="text-sm font-mono text-gray-100 leading-relaxed whitespace-pre">{`<!-- LeadNova AI Integration — added by your developer -->
<script src="https://cdn.leadnova.ai/v1/capture.min.js"></script>
<script>LeadNova.init({ apiUrl: 'https://api.yourdomain.com' });</script>`}</pre>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">2</div>
                <h4 className="font-bold text-gray-900">Your existing contact form — one attribute added</h4>
              </div>
              <div className="bg-gray-900 rounded-2xl p-6 overflow-x-auto">
                <pre className="text-sm font-mono leading-relaxed whitespace-pre">{`<!-- Add  data-leadnova-form  to your existing <form> tag -->
<form `}<span className="text-indigo-400">data-leadnova-form</span>{`  action="..." method="POST">
  <input name="name"    placeholder="Your Name"    required />
  <input name="email"   placeholder="Email"        required />
  <input name="company" placeholder="Company"               />
  <textarea name="message" placeholder="How can we help?"></textarea>
  <button type="submit">Send Message</button>
</form>

<!-- That's it. LeadNova AI intercepts the submission automatically. -->`}</pre>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">3</div>
                <h4 className="font-bold text-gray-900">What happens the moment someone submits</h4>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row gap-0">
                  {[
                    { step: "Form Submit", desc: "Visitor hits Submit on your website", time: "0 ms", color: "gray" },
                    { step: "AI Receives", desc: "LeadNova API gets the lead data", time: "< 50 ms", color: "indigo" },
                    { step: "AI Scores", desc: "Grok/GPT analyzes & scores Hot/Warm/Cold", time: "~2–4 sec", color: "purple" },
                    { step: "Draft Generated", desc: "Personalized email + SMS written by AI", time: "~4–5 sec", color: "pink" },
                    { step: "Dashboard Updated", desc: "Your team sees the scored lead with drafts", time: "~5 sec", color: "emerald" },
                  ].map((s, i) => (
                    <div key={i} className="flex-1 flex flex-col md:flex-row items-center">
                      <div className="flex-1 flex flex-col items-center text-center p-4">
                        <div className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                          s.color === "indigo" ? "text-indigo-500" :
                          s.color === "purple" ? "text-purple-500" :
                          s.color === "pink" ? "text-pink-500" :
                          s.color === "emerald" ? "text-emerald-600" :
                          "text-gray-400"
                        }`}>{s.time}</div>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${
                          s.color === "indigo" ? "bg-indigo-100 text-indigo-700" :
                          s.color === "purple" ? "bg-purple-100 text-purple-700" :
                          s.color === "pink" ? "bg-pink-100 text-pink-700" :
                          s.color === "emerald" ? "bg-emerald-100 text-emerald-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{i + 1}</div>
                        <div className="font-bold text-xs text-gray-800 mb-1">{s.step}</div>
                        <div className="text-[11px] text-gray-400 leading-snug">{s.desc}</div>
                      </div>
                      {i < 4 && <ChevronRight className="h-4 w-4 text-gray-300 hidden md:block shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">4</div>
                <h4 className="font-bold text-gray-900">Optional: CRM auto-sync via n8n or Make.com</h4>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-600">
                  <div>
                    <h5 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-indigo-500" /> n8n Workflow
                    </h5>
                    <ul className="space-y-1.5">
                      <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />LeadNova webhook triggers n8n</li>
                      <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />Lead created in HubSpot/Salesforce</li>
                      <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />Email draft added to CRM notes</li>
                      <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />Slack/Teams notification sent</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-amber-500" /> Make.com Scenario
                    </h5>
                    <ul className="space-y-1.5">
                      <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />Hot lead → immediate SMS to sales rep</li>
                      <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />Warm lead → add to email sequence</li>
                      <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />Cold lead → nurture campaign added</li>
                      <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />Google Sheets log updated</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                      <Database className="h-4 w-4 text-purple-500" /> Direct API
                    </h5>
                    <ul className="space-y-1.5">
                      <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />REST API with full docs</li>
                      <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />Webhook outbound on new lead</li>
                      <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />Query all leads via GET /leads</li>
                      <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />Update status via PATCH /lead/:id</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHAT YOU NEED TO PROVIDE ─── */}
      <section className="py-16 px-6 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-gray-900">What We Need From You</h2>
            <p className="text-gray-500 text-sm">That&apos;s it. We handle everything else.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-7">
              <h3 className="font-bold text-indigo-800 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-indigo-500" />
                Required (from you)
              </h3>
              <ul className="space-y-3 text-sm text-indigo-700">
                {[
                  "Access to your website (admin login or FTP/cPanel) to add the script",
                  "A contact form on your website — OR willingness to add our embed form",
                  "An email address to receive hot lead notifications",
                  "30 minutes for team training (online video call)",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-7">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                We handle (everything else)
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  "Cloud server deployment and configuration",
                  "Database setup and data security",
                  "AI provider configuration and prompt tuning",
                  "Website script installation (or instructions for your dev)",
                  "Dashboard setup and user access",
                  "CRM integration (if required)",
                  "Documentation and ongoing support",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-20 px-6 bg-gray-50 border-t border-gray-200">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs text-indigo-600 font-semibold uppercase tracking-widest mb-3">Common Questions</div>
            <h2 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex justify-between items-center text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 text-sm pr-4">{faq.q}</span>
                  <ChevronRight className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${openFaq === i ? "rotate-90" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section id="demo-cta" className="py-24 px-6 bg-white border-t border-gray-200 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(99,102,241,0.08),transparent_65%)]" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="text-xs text-indigo-600 font-semibold uppercase tracking-widest mb-4">Ready to Start?</div>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Every day without this is</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">revenue you&apos;re leaving behind.</span>
          </h2>
          <p className="text-gray-500 text-lg mb-10 leading-relaxed max-w-xl mx-auto">
            Let&apos;s set up a 20-minute call to walk through your specific situation. We&apos;ll show the live demo, answer every question, and give you a firm quote.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <a
              href="mailto:hello@leadnova.ai"
              className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-300/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2.5 text-lg"
            >
              <Mail className="h-5 w-5" />
              Book a 20-Min Call
            </a>
            <Link
              href="/"
              className="px-10 py-5 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-2xl border border-gray-300 hover:border-gray-400 transition-all flex items-center justify-center gap-2.5 text-lg shadow-sm"
            >
              <Sparkles className="h-5 w-5 text-indigo-500" />
              Try the Live Demo
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            {[
              "✓ 4–5 day setup",
              "✓ No technical knowledge needed",
              "✓ Works on any website",
              "✓ 30-day support included"
            ].map((item, i) => (
              <span key={i} className="text-gray-500">{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-1.5 rounded-lg text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-bold text-gray-700 text-sm">LeadNova AI</span>
          </Link>
          <p className="text-xs text-gray-400">© 2026 LeadNova AI · Confidential Client Proposal</p>
          <div className="flex gap-5 text-xs text-gray-400">
            <Link href="/" className="hover:text-gray-700 transition-colors">Live Demo</Link>
            <Link href="/dashboard" className="hover:text-gray-700 transition-colors">Dashboard</Link>
            <a href="mailto:hello@leadnova.ai" className="hover:text-gray-700 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

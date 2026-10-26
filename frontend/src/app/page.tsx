'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, Users, Phone, MessageSquare, Zap, Shield } from 'lucide-react';

const features = [
  { icon: Users, title: 'Lead Management', desc: 'Capture, score, and assign leads automatically from 10+ sources.' },
  { icon: Phone, title: 'Built-in Dialer', desc: 'Click-to-call with auto-logging, recording, and SIM-based calling for India.' },
  { icon: MessageSquare, title: 'WhatsApp Integration', desc: '2-way WhatsApp messaging with templates, broadcasts, and chatbot.' },
  { icon: BarChart3, title: 'Analytics & Reports', desc: 'Real-time dashboards, leaderboards, and CSV exports for your team.' },
  { icon: Zap, title: 'Automation Engine', desc: 'Round-robin assignment, follow-up reminders, and campaign triggers.' },
  { icon: Shield, title: 'Multi-Tenant Security', desc: 'Complete data isolation per company with role-based access control.' },
];

const plans = [
  {
    name: 'Starter',
    price: '₹999',
    period: '/mo',
    desc: 'Perfect for small teams getting started.',
    features: ['Up to 5 users', '1,000 leads', 'Basic dialer', 'WhatsApp messaging', 'Email support'],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '₹2,499',
    period: '/mo',
    desc: 'For growing sales teams that need more power.',
    features: ['Up to 25 users', '10,000 leads', 'Power dialer', 'WhatsApp + SMS campaigns', 'API access', 'Priority support'],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '₹4,999',
    period: '/mo',
    desc: 'For large organizations with custom needs.',
    features: ['Unlimited users', 'Unlimited leads', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee', 'On-premise option'],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            GlovaCRM
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-teal-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-teal-600 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-teal-600 transition-colors px-4 py-2">
              Login
            </Link>
            <Link href="/register" className="text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 px-5 py-2 rounded-lg transition-colors">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-br from-gray-50 to-teal-50">
        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <div className="inline-block mb-6 px-4 py-1.5 bg-white border border-gray-200 text-teal-700 rounded-full text-sm font-medium shadow-sm">
            🚀 Built for Indian Sales Teams
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight tracking-tight">
            The CRM your
            <span className="text-teal-600"> sales team </span>
            actually wants to use
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Manage leads, make calls, send WhatsApp messages, and close deals — all from one powerful platform. Start your 7-day free trial today.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto text-center text-lg font-medium text-white bg-teal-600 hover:bg-teal-700 px-8 py-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#features" className="w-full sm:w-auto text-center text-lg font-medium text-gray-700 border border-gray-300 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors">
              See Features
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-500">No credit card required • 7-day free trial • Cancel anytime</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Everything you need to close more deals</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">A complete sales workspace with built-in communication tools designed specifically for Indian businesses.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mb-5 border border-teal-100">
                  <f.icon className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-gray-600">Start free. Upgrade when you're ready.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((p) => (
              <div key={p.name} className={`rounded-xl p-8 bg-white flex flex-col ${p.highlighted ? 'border-teal-500 ring-2 ring-teal-100 shadow-md' : 'border border-gray-200 shadow-sm'}`}>
                {p.highlighted && (
                  <div className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-3 py-1 self-start mb-4">MOST POPULAR</div>
                )}
                <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">{p.price}</span>
                  <span className="text-gray-500">{p.period}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{p.desc}</p>
                <ul className="mt-8 space-y-3 flex-1">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm text-gray-700">
                      <div className="w-5 h-5 rounded-full bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-green-600 text-xs font-bold">✓</span>
                      </div>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className={`mt-8 text-center py-3 px-6 rounded-lg font-medium text-sm transition-colors ${p.highlighted ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
              <span className="text-2xl font-bold text-white">GlovaCRM</span>
              <p className="mt-2 text-sm">The modern CRM for Indian sales teams.</p>
            </div>
            <div className="flex gap-8 text-sm">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <Link href="/login" className="hover:text-white transition-colors">Login</Link>
              <Link href="/register" className="hover:text-white transition-colors">Register</Link>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800 text-center text-xs">
            © {new Date().getFullYear()} GlovaCRM. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

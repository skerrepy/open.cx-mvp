"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { CheckCircle2, MessageSquare, BarChart3, Shield, Zap, LineChart, TrendingUp, Clock, Users, ArrowRight, ArrowDown } from "lucide-react";

const gradientText = "bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent";

const insightsData = [
  { name: "Billing", value: 38 },
  { name: "Onboarding", value: 24 },
  { name: "Integrations", value: 18 },
  { name: "Performance", value: 12 },
  { name: "Other", value: 8 },
];

const COLORS = ["#6366F1", "#A78BFA", "#22D3EE", "#34D399", "#F59E0B"];

const metricsData = [
  { month: "Jan", tickets: 1200, resolved: 980 },
  { month: "Feb", tickets: 1350, resolved: 1120 },
  { month: "Mar", tickets: 1480, resolved: 1280 },
  { month: "Apr", tickets: 1620, resolved: 1450 },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-gray-900">
      {/* HERO */}
      <section className="relative min-h-[95vh] flex items-end justify-start py-8 px-4 md:px-6 lg:px-8">
        {/* Background Image with padding */}
        <div 
          className="absolute inset-0 m-2 md:m-3 lg:m-4 rounded-2xl bg-cover bg-center bg-no-repeat overflow-hidden"
          style={{
            backgroundImage: "url('/images/hero-background.jpg')",
            boxShadow: 'none',
          }}
        >
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/10" />
          
          {/* Gradient overlay for better text contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/60" />
        </div>
        
        {/* Content - positioned in bottom left with 20% bottom margin */}
        <div className="relative z-10 w-full ml-[2%] mb-[5%]">
          <div className="max-w-3xl">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
              className="text-2xl md:text-3xl lg:text-6xl font-light tracking-tight text-white mb-4 leading-[1.1]"
            >
              The complete customer communication engine
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg md:text-xl lg:text-2xl text-white/90 mb-6 leading-relaxed max-w-2xl"
            >
              Automate customer communication workflows at scale, fast, accurate, and empathetic
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-wrap gap-3"
            >
              <Link href="/register">
                <Button className="h-10 px-5 text-sm font-semibold bg-white/90 text-gray-900 hover:bg-white border-2 border-white shadow-xl rounded-lg">
                  Get started
                </Button>
              </Link>
              <Link href="/widget" target="_blank">
                <Button variant="link" className="h-10 px-5 text-sm font-semibold text-white hover:bg-white/10 rounded-lg">
                  View Widget
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* METRICS / KPIs - Story Format */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Real Results</h2>
            <p className="text-lg text-gray-600">See what our customers achieve</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-8 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Resolve Issues in Minutes, Not Hours</h3>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4">
                Customers used to wait hours for support responses. Now, <span className="font-bold text-emerald-700">80% of tickets are resolved 5x faster</span> thanks to instant AI responses that understand context and provide accurate answers immediately.
              </p>
              <div className="text-sm text-gray-600 italic">"Our support team can focus on complex issues while AI handles the routine questions."</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-8 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Instant Answers, Always Available</h3>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your customers get help <span className="font-bold text-blue-700">in under 2 minutes, 24/7</span>. No more waiting for business hours or queue times. The AI understands your product, knows your policies, and responds with the right answer every time.
              </p>
              <div className="text-sm text-gray-600 italic">"Customer satisfaction skyrocketed when we could respond instantly, day or night."</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-8 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-purple-100 text-purple-600">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Cut Support Costs Without Cutting Quality</h3>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4">
                Reduce your support overhead by <span className="font-bold text-purple-700">65% while improving response quality</span>. AI handles the repetitive questions, freeing your team to tackle complex issues and build better relationships with customers who truly need human attention.
              </p>
              <div className="text-sm text-gray-600 italic">"We saved thousands monthly while our NPS score actually went up."</div>
        </motion.div>

        <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-8 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-orange-100 text-orange-600">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Customers Love the Experience</h3>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4">
                With an average satisfaction rating of <span className="font-bold text-orange-700">4.8 out of 5 stars</span>, customers consistently praise the speed, accuracy, and helpfulness of our AI-powered support. The seamless handoff to human agents when needed ensures no one feels ignored.
              </p>
              <div className="text-sm text-gray-600 italic">"Best support experience we've had. Fast, accurate, and always helpful."</div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* INTERACTIVE DEMO FLOW - With Lines */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">How it works</h2>
          <p className="text-gray-600 mb-4">Two paths, one seamless experience</p>
          <p className="text-sm text-gray-500 mb-12">Before human handoff, tickets are automatically summarized and customer information is gathered to reduce repetitive questions and help agents understand the issue faster.</p>
          
          <div className="relative">
            {/* Step 1: Customer asks */}
            <div className="flex justify-center mb-6">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-6 max-w-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">1</div>
                  <h3 className="font-semibold text-gray-900 text-lg">Customer asks</h3>
                </div>
                <p className="text-sm text-gray-600">Customer submits a question via chat widget</p>
              </motion.div>
            </div>

            {/* Line down from Step 1 */}
            <div className="flex justify-center mb-6">
              <div className="w-0.5 h-12 bg-indigo-300" />
            </div>

            {/* Step 2: AI responds */}
            <div className="flex justify-center mb-8">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-6 max-w-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">2</div>
                  <h3 className="font-semibold text-gray-900 text-lg">AI responds</h3>
                </div>
                <p className="text-sm text-gray-600">AI analyzes and provides instant answer</p>
              </motion.div>
            </div>

            {/* Line down from Step 2 */}
            <div className="flex justify-center mb-6">
              <div className="w-0.5 h-12 bg-indigo-300" />
            </div>

            {/* Branch Point */}
            <div className="flex justify-center mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg relative"
              >
                ?
                {/* Branch lines */}
                <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                  <line x1="50%" y1="100%" x2="25%" y2="200%" stroke="#10b981" strokeWidth="2" strokeDasharray="4,4" />
                  <line x1="50%" y1="100%" x2="75%" y2="200%" stroke="#a855f7" strokeWidth="2" strokeDasharray="4,4" />
                </svg>
              </motion.div>
            </div>

            {/* Two Paths Side by Side */}
            <div className="grid md:grid-cols-2 gap-8 relative">
              {/* Path 1: AI Handles */}
              <div className="relative">
                {/* Path label */}
                <div className="text-center mb-6">
                  <h3 className="font-semibold text-emerald-700 text-lg mb-2">AI Handles It</h3>
                  <div className="w-full h-0.5 bg-emerald-300" />
                </div>

                {/* Step 3: AI resolves */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className="rounded-xl border-2 border-emerald-300 bg-emerald-50/50 p-6 mb-4 relative"
                >
                  {/* Connecting line from branch */}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 w-0.5 h-12 bg-emerald-300" />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">3</div>
                    <h3 className="font-semibold text-gray-900 text-lg">AI resolves</h3>
                  </div>
                  <p className="text-sm text-gray-600">Customer's question is fully answered by AI</p>
                </motion.div>

                {/* Line down */}
                <div className="flex justify-center mb-4">
                  <div className="w-0.5 h-8 bg-emerald-300" />
                </div>

                {/* Step 4: Ticket resolved */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="rounded-xl border-2 border-emerald-300 bg-emerald-50/50 p-6"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">4</div>
                    <h3 className="font-semibold text-gray-900 text-lg">Ticket resolved</h3>
                  </div>
                  <p className="text-sm text-gray-600">Ticket automatically closed and summarized</p>
                </motion.div>
              </div>

              {/* Path 2: Human Needed */}
              <div className="relative">
                {/* Path label */}
                <div className="text-center mb-6">
                  <h3 className="font-semibold text-purple-700 text-lg mb-2">Human Needed</h3>
                  <div className="w-full h-0.5 bg-purple-300" />
                </div>

                {/* Step 3: Customer requests human */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className="rounded-xl border-2 border-purple-300 bg-purple-50/50 p-6 mb-4 relative"
                >
                  {/* Connecting line from branch */}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 w-0.5 h-12 bg-purple-300" />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-lg">3</div>
                    <h3 className="font-semibold text-gray-900 text-lg">Customer requests human</h3>
                  </div>
                  <p className="text-sm text-gray-600">Customer explicitly asks for human assistance</p>
                </motion.div>

                {/* Line down */}
                <div className="flex justify-center mb-4">
                  <div className="w-0.5 h-8 bg-purple-300" />
                </div>

                {/* Step 3.5: Ticket summarized & info gathered */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className="rounded-xl border-2 border-purple-300 bg-purple-50/50 p-6 mb-4 relative"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-lg">3.5</div>
                    <h3 className="font-semibold text-gray-900 text-lg">Ticket summarized & info gathered</h3>
                  </div>
                  <p className="text-sm text-gray-600">AI automatically summarizes the conversation and extracts customer information to speed up agent onboarding</p>
                </motion.div>

                {/* Line down */}
                <div className="flex justify-center mb-4">
                  <div className="w-0.5 h-8 bg-purple-300" />
                </div>

                {/* Step 4: Agent joins */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="rounded-xl border-2 border-purple-300 bg-purple-50/50 p-6 mb-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-lg">4</div>
                    <h3 className="font-semibold text-gray-900 text-lg">Agent joins</h3>
                  </div>
                  <p className="text-sm text-gray-600">Human agent seamlessly takes over the conversation</p>
                </motion.div>

                {/* Line down */}
                <div className="flex justify-center mb-4">
                  <div className="w-0.5 h-8 bg-purple-300" />
                </div>

                {/* Step 5: Ticket resolved */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="rounded-xl border-2 border-purple-300 bg-purple-50/50 p-6"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-lg">5</div>
                    <h3 className="font-semibold text-gray-900 text-lg">Ticket resolved</h3>
                  </div>
                  <p className="text-sm text-gray-600">Agent resolves issue, ticket closed and tagged</p>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES BENTO GRID */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Everything you need</h2>
          <p className="text-gray-600 mb-8">Comprehensive features in one platform</p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Large Feature 1 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="md:col-span-2 md:row-span-2 rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-8 hover:shadow-xl transition-shadow"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white mb-4">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">1-line embed chat widget</h3>
              <p className="text-gray-600 mb-4">Add our widget to your site in seconds. Zero configuration needed.</p>
              <div className="mt-6 p-4 bg-white/60 rounded-lg">
                <code className="text-xs text-gray-700">&lt;script src="widget.js"&gt;&lt;/script&gt;</code>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-lg transition-shadow"
            >
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 mb-3">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Support agent dashboard</h3>
              <p className="text-sm text-gray-600">Full ticketing for your human team</p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-lg transition-shadow"
            >
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 mb-3">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Automatic summarization</h3>
              <p className="text-sm text-gray-600">Every conversation stays organized</p>
            </motion.div>

            {/* Feature 4 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="md:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <ArrowRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Intelligent routing</h3>
                  <p className="text-sm text-gray-600">AI → Human fallback without friction</p>
                </div>
              </div>
            </motion.div>

            {/* Feature 5 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-lg transition-shadow"
            >
              <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 mb-3">
                <LineChart className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Admin quality review</h3>
              <p className="text-sm text-gray-600">Track performance and improve</p>
            </motion.div>

            {/* Feature 6 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-lg transition-shadow"
            >
              <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Product insights</h3>
              <p className="text-sm text-gray-600">Recurring issues & feature requests</p>
            </motion.div>

            {/* Feature 7 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="md:col-span-2 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-indigo-50 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Business Settings</h3>
                  <p className="text-sm text-gray-600">Tone, language, and knowledge snippets</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* LIVE INSIGHTS PREVIEW */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Live insights preview</h2>
              <p className="text-gray-600 mb-4">Instant visibility into what customers ask for most. Identify recurring issues and inform your roadmap.</p>
              <div className="mt-6 flex items-center gap-4 text-sm text-gray-600">
                <Shield className="w-4 h-4 text-indigo-600" /> No data training on your content
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg"
            >
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={insightsData} dataKey="value" nameKey="name" outerRadius={90} label>
                      {insightsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
        </motion.div>
      </div>
        </div>
      </section>

      {/* TRUST / SECURITY */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              "No data training on your content",
              "Enterprise privacy",
              "SOC 2 Ready",
            ].map((badge) => (
              <div key={badge} className="rounded-xl border border-gray-200 bg-white p-4 text-center text-sm text-gray-600 hover:shadow-md transition-shadow">
                {badge}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">Start Delivering Support Your Customers Love.</h2>
          <Link href="/register">
            <Button className="h-14 px-8 text-lg font-semibold bg-white text-indigo-600 hover:bg-gray-100 shadow-xl">
              Start for Free
            </Button>
          </Link>
          <p className="mt-4 text-sm text-indigo-100">No credit card required · Get set up in minutes</p>
        </div>
      </section>
    </div>
  );
}

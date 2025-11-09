import React, { useState, useEffect } from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export default function Home({ onShowLogin, onShowEmailRegister, onShowWalletRegister }) {
  // Local UI handlers passed as props: onShowLogin, onShowEmailRegister, onShowWalletRegister
  const [testiIndex, setTestiIndex] = useState(0)
  const testimonials = [
    { author: 'General Counsel, Acme Corp', quote: 'Agreed reduced our contract turnaround time by 60% — audits are a breeze.' },
    { author: 'Head of Procurement, Beta Ltd', quote: 'Versioned contracts with on-chain proofs gave us confidence to automate payments.' },
    { author: 'COO, Delta Inc', quote: 'We stopped losing revenue from missed milestones. Wallet-based approvals are transformative.' }
  ]

  useEffect(() => {
    const t = setInterval(() => setTestiIndex(i => (i + 1) % testimonials.length), 6000)
    return () => clearInterval(t)
  }, [])

  const [openFeature, setOpenFeature] = useState(null)
  const features = [
    { id: 'versioning', title: 'Versioning & Diffs', body: 'Fine-grained commits, diffs and history for every clause — bring software workflows to legal.' },
    { id: 'approval', title: 'Approval Workflows', body: 'Multi-party approvals, threaded comments and thresholds to automate sign-off.' },
    { id: 'escrow', title: 'Escrow & Payments', body: 'Optional escrow via Solana PDAs with milestone-based releases.' }
  ]

  // Gemini mock
  const [clauseText, setClauseText] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)

  function runGeminiMock() {
    setLoading(true)
    setAnalysis(null)
    setTimeout(() => {
      setLoading(false)
      setAnalysis({
        summary: 'Key obligations: delivery within 30 days; penalty for late delivery; auto-renew unless cancelled.',
        risks: ['Automatic renewal may create unwanted obligations', 'Penalty calculation unclear']
      })
    }, 900)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100">
      <header className="bg-linear-to-r from-indigo-600 to-teal-500 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <a href="/" aria-label="Home" className="flex items-center">
              <img src="/logo.png" alt="Agreed logo" className="h-10 mr-3" />
              <span className="text-2xl font-bold tracking-tight">Agreed</span>
            </a>
            <span className="text-sm text-white/80 hidden md:inline">Contracts • Versioning • On-chain Proofs</span>
          </div>
            <nav className="flex items-center space-x-4">
            <button onClick={() => onShowLogin()} className="text-white/90 hover:underline">Login</button>
            <button onClick={() => onShowEmailRegister()} className="bg-white text-indigo-600 px-4 py-2 rounded-md font-semibold shadow-sm">Get Started</button>
          </nav>
        </div>
      </header>

      <main className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl font-extrabold text-slate-900 leading-tight">Collaborative contracts with verifiable on-chain proof</h1>
              <p className="text-xl text-slate-600">Agreed brings Git-style workflow to legal teams: version, review, approve and anchor proofs on Solana — all in one secure workspace.</p>

              <div className="flex flex-wrap gap-4">
                <WalletMultiButton className="px-6 py-3 rounded-md bg-slate-900 text-white shadow-lg" />
                <button onClick={() => onShowEmailRegister()} className="px-6 py-3 rounded-md border border-indigo-600 text-indigo-600 font-medium">Sign up / Login</button>
                <button onClick={onShowWalletRegister} className="px-6 py-3 rounded-md bg-indigo-600 text-white font-medium">Register wallet</button>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-6 bg-white rounded-xl shadow-sm border-l-4 border-indigo-500">
                  <h4 className="font-semibold text-slate-800">Version Control</h4>
                  <p className="text-sm text-slate-600 mt-2">Track changes per clause with diffs, commits and audit trails.</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-sm border-l-4 border-teal-500">
                  <h4 className="font-semibold text-slate-800">Approval Workflows</h4>
                  <p className="text-sm text-slate-600 mt-2">Multi-party approvals, thresholds, and threaded review comments.</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-sm border-l-4 border-rose-500">
                  <h4 className="font-semibold text-slate-800">On-chain Proofs</h4>
                  <p className="text-sm text-slate-600 mt-2">Anchor tamper-evident proofs on Solana; store content on IPFS.</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-y-6 -right-6 bg-gradient-to-br from-indigo-50 to-white rounded-2xl shadow-2xl transform rotate-3" />
              <div className="relative bg-white rounded-2xl p-8 shadow-xl">
                <h3 className="text-lg font-semibold">What legal teams say</h3>
                <div className="mt-4 text-slate-700 italic text-sm">“{testimonials[testiIndex].quote}”</div>
                <div className="mt-3 text-xs text-slate-500">— {testimonials[testiIndex].author}</div>

                <div className="mt-6 flex items-center gap-3">
                  <button onClick={() => setTestiIndex(i => (i - 1 + testimonials.length) % testimonials.length)} className="px-3 py-1 bg-slate-100 rounded">Prev</button>
                  <button onClick={() => setTestiIndex(i => (i + 1) % testimonials.length)} className="px-3 py-1 bg-slate-100 rounded">Next</button>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h3 className="text-2xl font-semibold">Blockchain features</h3>
              <p className="mt-2 text-slate-600">Everything you need to integrate contracts with on-chain verification and optional escrow.</p>

              <div className="mt-6 space-y-4">
                {features.map(f => (
                  <div key={f.id} className="bg-white rounded-xl shadow-sm p-4 flex">
                    <div className="w-2 rounded mr-4" style={{background: f.id === 'versioning' ? '#6366f1' : f.id === 'approval' ? '#14b8a6' : '#fb7185'}} />
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{f.title}</h4>
                        <button onClick={() => setOpenFeature(openFeature === f.id ? null : f.id)} className="text-sm text-slate-500">{openFeature === f.id ? 'Hide' : 'Details'}</button>
                      </div>
                      {openFeature === f.id && <p className="mt-2 text-sm text-slate-600">{f.body}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside>
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h4 className="font-semibold">Backed by Gemini (demo)</h4>
                <p className="mt-2 text-sm text-slate-600">AI-assisted clause analysis — try the demo below.</p>

                <textarea value={clauseText} onChange={e => setClauseText(e.target.value)} placeholder="Paste a clause to analyze" className="w-full p-3 border rounded-md h-36 mt-4" />
                <div className="mt-4 flex items-center gap-3">
                  <button onClick={runGeminiMock} className="px-4 py-2 bg-indigo-600 text-white rounded-md">Analyze clause</button>
                  {loading && <div className="text-sm text-slate-500">Analyzing…</div>}
                </div>

                {analysis && (
                  <div className="mt-4 bg-slate-50 p-4 rounded">
                    <h5 className="font-semibold">Summary</h5>
                    <p className="text-sm mt-2 text-slate-700">{analysis.summary}</p>
                    <h6 className="mt-3 font-medium text-rose-600">Risk flags</h6>
                    <ul className="list-disc list-inside text-sm text-rose-600 mt-2">
                      {analysis.risks.map((r, idx) => <li key={idx}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </aside>
          </section>

          <section className="mt-16 bg-gradient-to-r from-indigo-600 to-teal-500 text-white rounded-xl p-8 shadow-xl">
            <div className="max-w-4xl mx-auto text-center">
              <h3 className="text-2xl font-bold">Ready to make contracts less painful?</h3>
              <p className="mt-2 text-slate-100">Start a free trial — onboard your legal, finance and product teams in minutes.</p>
                <div className="mt-6 flex justify-center gap-4">
                <button onClick={() => onShowEmailRegister()} className="px-6 py-3 bg-white text-indigo-600 rounded-md font-semibold">Get started</button>
                <button onClick={onShowWalletRegister} className="px-6 py-3 border border-white text-white rounded-md">Register wallet</button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-slate-50 border-t mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="text-sm text-slate-600">© {new Date().getFullYear()} Agreed. All rights reserved.</div>
          <div className="text-sm text-slate-600">Contact: <a href="mailto:hello@agreed.app" className="text-indigo-600">hello@agreed.app</a></div>
        </div>
      </footer>
    </div>
  )
}

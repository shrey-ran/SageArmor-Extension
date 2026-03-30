import { useState } from 'react';
import './App.css';

function App() {
  const [codeSnippet, setCodeSnippet] = useState(`import os
import sqlite3

def get_user(user_id):
    # Vulnerable to SQL injection
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    query = "SELECT * FROM users WHERE id = " + user_id
    cursor.execute(query)
    return cursor.fetchall()
`);

  const [language, setLanguage] = useState('python');

  const [scanResults, setScanResults] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    setScanResults(null);
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeSnippet, language })
      });
      const data = await response.json();
      setScanResults(data);
    } catch (error) {
      console.error(error);
      alert("Failed to reach API.");
    } finally {
      setIsScanning(false);
    }
  };

  const highCount = scanResults?.vulnerabilities?.filter((v: any) => v.severity === 'High').length || 0;
  const mediumCount = scanResults?.vulnerabilities?.filter((v: any) => v.severity === 'Medium').length || 0;
  const lowCount = scanResults?.vulnerabilities?.filter((v: any) => v.severity === 'Low').length || 0;
  const score = scanResults ? Math.max(0, 100 - (highCount * 30 + mediumCount * 10 + lowCount * 2)) : 100;

  return (
    <div className="bg-background text-on-background selection:bg-primary/30 min-h-screen">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-[#111318]/80 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-6 h-16 shadow-[0_8px_30px_rgb(110,155,255,0.05)]">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold text-[#9cff93] tracking-tighter font-headline">SageArmor AI</span>
          <div className="hidden md:flex gap-6 items-center">
            <a className="text-[#9cff93] font-bold border-b-2 border-[#9cff93] font-headline tracking-tight h-16 flex items-center" href="#">Dashboard</a>
            <a className="text-[#f6f6fc]/60 hover:bg-[#23262c] hover:text-[#9cff93] transition-colors font-headline tracking-tight h-16 flex items-center px-2" href="#">Scans</a>
            <a className="text-[#f6f6fc]/60 hover:bg-[#23262c] hover:text-[#9cff93] transition-colors font-headline tracking-tight h-16 flex items-center px-2" href="#">Security Review</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-surface-container-highest rounded-lg px-3 py-1.5 gap-2 border border-outline-variant/15">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">search</span>
            <input className="bg-transparent border-none focus:ring-0 text-sm text-on-surface p-0 w-48 font-label outline-none" placeholder="Jump to..." type="text" />
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-on-surface-variant hover:text-primary transition-colors active:scale-95 duration-200 flex items-center justify-center">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-2 text-on-surface-variant hover:text-primary transition-colors active:scale-95 duration-200 flex items-center justify-center">
              <span className="material-symbols-outlined">terminal</span>
            </button>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/20 bg-surface-container-high">
              <img alt="User profile" className="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff" />
            </div>
          </div>
        </div>
      </nav>

      {/* SideNavBar */}
      <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-[#111318] flex flex-col py-8 px-4 gap-2 border-r border-white/5">
        <div className="px-2 mb-6">
          <h3 className="text-[#9cff93] font-black font-headline text-sm uppercase tracking-widest">Command Center</h3>
          <p className="text-[#f6f6fc]/40 text-[10px] font-mono">v2.4.0-stable</p>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <a className="bg-[#171a1f] text-[#9cff93] border-r-4 border-[#9cff93] flex items-center gap-3 px-3 py-2.5 transition-all duration-300 ease-in-out" href="#">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-headline text-sm uppercase tracking-widest">Dashboard</span>
          </a>
          <a className="text-[#f6f6fc]/40 hover:bg-[#171a1f] hover:text-[#f6f6fc] flex items-center gap-3 px-3 py-2.5 transition-all duration-300 ease-in-out" href="#">
            <span className="material-symbols-outlined">security</span>
            <span className="font-headline text-sm uppercase tracking-widest">Scans</span>
          </a>
          <a className="text-[#f6f6fc]/40 hover:bg-[#171a1f] hover:text-[#f6f6fc] flex items-center gap-3 px-3 py-2.5 transition-all duration-300 ease-in-out" href="#">
            <span className="material-symbols-outlined">analytics</span>
            <span className="font-headline text-sm uppercase tracking-widest">Reports</span>
          </a>
          <a className="text-[#f6f6fc]/40 hover:bg-[#171a1f] hover:text-[#f6f6fc] flex items-center gap-3 px-3 py-2.5 transition-all duration-300 ease-in-out" href="#">
            <span className="material-symbols-outlined">settings</span>
            <span className="font-headline text-sm uppercase tracking-widest">Settings</span>
          </a>
          <div className="mt-8">
            <button onClick={handleScan} disabled={isScanning} className="w-full bg-primary text-on-primary py-3 rounded-lg font-bold font-label flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(156,255,147,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait">
              {isScanning ? (
                <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined text-sm">shield</span>
              )}
              {isScanning ? "Scanning..." : "New Scan"}
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1 border-t border-white/5 pt-6">
          <a className="text-[#f6f6fc]/40 hover:bg-[#171a1f] hover:text-[#f6f6fc] flex items-center gap-3 px-3 py-2 transition-all duration-300 ease-in-out" href="#">
            <span className="material-symbols-outlined text-sm">help</span>
            <span className="font-headline text-xs uppercase tracking-widest">Support</span>
          </a>
          <a className="text-[#f6f6fc]/40 hover:bg-[#171a1f] hover:text-[#f6f6fc] flex items-center gap-3 px-3 py-2 transition-all duration-300 ease-in-out" href="#">
            <span className="material-symbols-outlined text-sm">receipt_long</span>
            <span className="font-headline text-xs uppercase tracking-widest">Logs</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64 pt-16 min-h-screen">
        <div className="p-8 max-w-[1600px] mx-auto">
          {/* Header Area */}
          <header className="mb-10 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 text-primary mb-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em]">System Status: Nominal</span>
              </div>
              <h1 className="text-4xl font-headline font-bold tracking-tight text-on-surface">AI Security Review Agent</h1>
            </div>
            <div className="flex gap-3">
              <div className="text-right">
                <p className="text-xs text-on-surface-variant font-label uppercase">Last Scan</p>
                <p className="text-sm font-mono text-on-surface">14 mins ago</p>
              </div>
            </div>
          </header>

          {/* Layout Grid */}
          <div className="grid grid-cols-12 gap-6">

            {/* Left Column: Security Overview */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

              {/* Security Score Card */}
              <div className="bg-surface-container rounded-xl p-8 border border-outline-variant/15 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-8xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                </div>
                <div className="relative z-10">
                  <h3 className="text-on-surface-variant font-label text-xs uppercase tracking-widest mb-6">Overall Security Score</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-8xl font-headline font-bold text-primary">{score}</span>
                    <span className="text-on-surface-variant font-headline text-2xl">/100</span>
                  </div>
                  <div className="mt-8 space-y-2">
                    <div className="flex justify-between text-xs font-label text-on-surface-variant uppercase mb-1">
                      <span>Confidence Level</span>
                      <span>{score >= 80 ? 'High' : score >= 50 ? 'Medium' : 'Low'}</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${score}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vulnerabilities List */}
              <div className="bg-surface-container rounded-xl p-6 border border-outline-variant/15">
                <h3 className="text-on-surface font-headline font-bold text-lg mb-6">Vulnerabilities</h3>
                <div className="space-y-4">

                  {/* High */}
                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border-l-4 border-error">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-error/10 flex items-center justify-center text-error">
                        <span className="material-symbols-outlined">warning</span>
                      </div>
                      <div>
                        <p className="font-headline font-bold text-sm text-on-surface">Critical Threats</p>
                        <p className="text-xs text-on-surface-variant">Immediate action required</p>
                      </div>
                    </div>
                    <span className="text-2xl font-headline font-bold text-error">{highCount}</span>
                  </div>

                  {/* Medium */}
                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border-l-4 border-tertiary">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-tertiary/10 flex items-center justify-center text-tertiary">
                        <span className="material-symbols-outlined">report_problem</span>
                      </div>
                      <div>
                        <p className="font-headline font-bold text-sm text-on-surface">Moderate Risks</p>
                        <p className="text-xs text-on-surface-variant">Review within 48 hours</p>
                      </div>
                    </div>
                    <span className="text-2xl font-headline font-bold text-tertiary">{mediumCount}</span>
                  </div>

                  {/* Low */}
                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border-l-4 border-secondary">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-secondary/10 flex items-center justify-center text-secondary">
                        <span className="material-symbols-outlined">info</span>
                      </div>
                      <div>
                        <p className="font-headline font-bold text-sm text-on-surface">Minor Issues</p>
                        <p className="text-xs text-on-surface-variant">Best practice improvements</p>
                      </div>
                    </div>
                    <span className="text-2xl font-headline font-bold text-secondary">{lowCount}</span>
                  </div>

                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-surface-container-low rounded-xl p-4 flex gap-4">
                <div className="flex-1 text-center border-r border-outline-variant/15">
                  <p className="text-[10px] uppercase font-label text-on-surface-variant">Packages</p>
                  <p className="text-lg font-headline font-bold">142</p>
                </div>
                <div className="flex-1 text-center border-r border-outline-variant/15">
                  <p className="text-[10px] uppercase font-label text-on-surface-variant">Outdated</p>
                  <p className="text-lg font-headline font-bold text-tertiary">12</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-[10px] uppercase font-label text-on-surface-variant">Protected</p>
                  <p className="text-lg font-headline font-bold text-primary">98%</p>
                </div>
              </div>

            </div>

            {/* Right Column: Active Pull Request Review */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
              
              {/* Code Input Area */}
              <div className="bg-surface-container rounded-xl border border-outline-variant/15 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-headline font-bold text-on-surface">Snippet Scanner</h2>
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-surface-container-high text-on-surface text-sm font-label uppercase tracking-wider rounded-lg px-3 py-1.5 border border-outline-variant/15 outline-none focus:border-primary/50 transition-colors"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript / Node</option>
                    <option value="go">Go</option>
                    <option value="terraform">Terraform (.tf)</option>
                    <option value="yaml">YAML (K8s / CI)</option>
                  </select>
                </div>
                <textarea 
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  className="w-full h-48 bg-surface-container-lowest text-on-surface p-4 rounded-lg font-mono text-sm border border-outline-variant/20 focus:outline-none focus:border-primary/50 transition-colors"
                  spellCheck="false"
                />
              </div>

              <div className="bg-surface-container rounded-xl border border-outline-variant/15 flex flex-col overflow-hidden">
                {/* Review Header */}
                <div className="p-6 bg-surface-container-high border-b border-outline-variant/15 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-surface-container-highest rounded-lg flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-3xl">terminal</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-headline font-bold text-on-surface">Analysis Results</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-on-surface-variant text-[10px] uppercase font-label tracking-tighter">Live Scan Mode</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Code Review Workspace */}
                <div className="flex-1 p-6 overflow-y-auto space-y-8 min-h-[400px]">
                  {isScanning ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-on-surface-variant">
                      <span className="material-symbols-outlined text-5xl animate-spin text-primary">autorenew</span>
                      <p className="font-headline">Claude 3.5 Sonnet is analyzing code...</p>
                    </div>
                  ) : !scanResults ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-on-surface-variant">
                      <span className="material-symbols-outlined text-5xl opacity-50">data_object</span>
                      <p className="font-headline text-center">Paste a snippet above and click New Scan<br/>to automatically detect vulnerabilities.</p>
                    </div>
                  ) : scanResults.vulnerabilities && scanResults.vulnerabilities.length > 0 ? (
                    scanResults.vulnerabilities.map((v: any, idx: number) => (
                      <div key={idx} className="space-y-6 pb-8 border-b border-outline-variant/10 last:border-0 last:pb-0">
                        {/* Issue Description */}
                        <div className={`rounded-lg border p-4 flex gap-4 ${v.severity === 'High' ? 'bg-error/10 border-error/20 text-error' : v.severity === 'Medium' ? 'bg-tertiary/10 border-tertiary/20 text-tertiary' : 'bg-secondary/10 border-secondary/20 text-secondary'}`}>
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {v.severity === 'High' ? 'dangerous' : v.severity === 'Medium' ? 'report_problem' : 'info'}
                          </span>
                          <div>
                            <p className="font-bold font-headline mb-1">{v.issue}</p>
                            <p className="text-sm text-on-surface-variant leading-relaxed">{v.explanation}</p>
                          </div>
                        </div>

                        {/* Simulated Attack Scenario */}
                        {v.poc_exploit_scenario && (
                          <div className="space-y-3">
                            <h3 className="text-on-surface font-headline font-bold flex items-center gap-2">
                              <span className="material-symbols-outlined text-error">bug_report</span>
                              Simulated Attack Scenario
                            </h3>
                            <div className="rounded-xl overflow-x-auto border border-error/30 bg-error/5 font-mono text-sm leading-relaxed p-4">
                              <pre className="text-error/90 whitespace-pre-wrap">{v.poc_exploit_scenario}</pre>
                            </div>
                          </div>
                        )}

                        {/* Suggested Fix */}
                        <div className="space-y-4">
                          <h3 className="text-on-surface font-headline font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">auto_fix_high</span>
                            Suggested Fix
                          </h3>
                          <div className="rounded-xl overflow-x-auto border border-primary/20 bg-surface-container-lowest font-mono text-sm leading-relaxed p-4">
                            <pre className="text-primary whitespace-pre-wrap">{v.suggested_fix}</pre>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-primary">
                      <span className="material-symbols-outlined text-5xl">verified</span>
                      <p className="font-headline font-bold text-center">No vulnerabilities detected!<br/><span className="text-on-surface-variant font-normal text-sm">Code passed AI security review.</span></p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Footer Meta */}
          <footer className="mt-12 py-8 border-t border-outline-variant/15 flex justify-between items-center opacity-60">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">verified</span>
                <span className="text-xs font-label uppercase">SOC2 COMPLIANT</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">lock_open</span>
                <span className="text-xs font-label uppercase">ENCRYPTED AT REST</span>
              </div>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest">
              Sentinel Network v2.4.0-STABLE | Node: US-EAST-1
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App

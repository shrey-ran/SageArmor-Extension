import { useMemo, useState } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './App.css';

type Vulnerability = {
  severity: string;
  issue: string;
  attack_vector?: string;
  explanation?: string;
  poc_exploit_scenario?: string;
  remediation?: {
    patch?: string;
    explanation?: string;
  };
  suggested_fix?: string;
};

type AttackNode = {
  id: string;
  label: string;
  kind: string;
  criticality: string;
};

type AttackEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

type RiskItem = {
  id: string;
  issue: string;
  severity: string;
  priority_score: number;
  occurrence_count?: number;
  asset_value: string;
  exploitability: {
    level: string;
    score: number;
    exploitable: boolean;
  };
};

type SimulationData = {
  chain_summary?: string;
  accessible_data?: string[];
  likely_impact?: string[];
  compromise_probability?: string;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
};

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
  const [repoUrl, setRepoUrl] = useState('');
  const [repoBranch, setRepoBranch] = useState('main');
  const [repoQuery, setRepoQuery] = useState('auth token sql injection secrets in API handlers');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'attack' | 'simulation' | 'copilot'>('results');

  const [scanResults, setScanResults] = useState<{ vulnerabilities?: Vulnerability[] } | null>(null);
  const [attackGraph, setAttackGraph] = useState<{ nodes: AttackNode[]; edges: AttackEdge[]; attack_paths?: any[] } | null>(null);
  const [riskRanking, setRiskRanking] = useState<RiskItem[]>([]);
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Ask me anything about exploitability, attack chains, or what to fix first.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isRepoScanning, setIsRepoScanning] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  const postJson = async (path: string, payload: Record<string, unknown>) => {
    const response = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.json();
  };

  const handleCopyFix = (v: Vulnerability, idx: number) => {
    const text = v.remediation?.patch ?? v.suggested_fix ?? '';
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  const hydrateAdvancedModules = async (vulnerabilities: Vulnerability[]) => {
    const payload = { code: codeSnippet, language, vulnerabilities };
    const [attack, risk, simulation] = await Promise.all([
      postJson('/attack-path', payload),
      postJson('/risk-score', payload),
      postJson('/simulate', payload),
    ]);

    if (!attack.error) {
      setAttackGraph({
        nodes: attack.attack_graph?.nodes || [],
        edges: attack.attack_graph?.edges || [],
        attack_paths: attack.attack_paths || [],
      });
    }

    if (!risk.error) {
      setRiskRanking(risk.risk_ranking || []);
    }

    if (!simulation.error) {
      setSimulationData(simulation.breach_simulation || null);
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    setScanResults(null);
    setAttackGraph(null);
    setRiskRanking([]);
    setSimulationData(null);
    setApiError(null);

    try {
      const data = await postJson('/review', { code: codeSnippet, language });
      if (data.error) {
        setApiError(data.error);
      } else {
        setScanResults(data);
        await hydrateAdvancedModules(data.vulnerabilities || []);
      }
    } catch (error) {
      console.error(error);
      setApiError('Failed to reach API. Make sure the backend is running.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRepoScan = async () => {
    if (!repoUrl.trim()) {
      setApiError('GitHub repository URL is required for repo scan.');
      return;
    }

    setIsRepoScanning(true);
    setScanResults(null);
    setAttackGraph(null);
    setRiskRanking([]);
    setSimulationData(null);
    setApiError(null);

    try {
      const payload = {
        repo_url: repoUrl.trim(),
        branch: repoBranch.trim() || 'main',
        query: repoQuery.trim(),
        top_k: 5,
      };

      const data = await postJson('/repo-scan', payload);
      if (data.error) {
        setApiError(data.error);
      } else {
        const vulnerabilities = data.vulnerabilities || [];
        setScanResults({ vulnerabilities });
        setAttackGraph({
          nodes: data.attack_graph?.nodes || [],
          edges: data.attack_graph?.edges || [],
          attack_paths: data.attack_graph?.attack_paths || [],
        });
        setRiskRanking(data.risk_ranking || []);
        setSimulationData(data.breach_simulation || null);
      }
    } catch (error) {
      console.error(error);
      setApiError('Repo scan request failed. Verify backend /repo-scan route is running.');
    } finally {
      setIsRepoScanning(false);
    }
  };

  const highCount = scanResults?.vulnerabilities?.filter((v: Vulnerability) => v.severity === 'High').length || 0;
  const mediumCount = scanResults?.vulnerabilities?.filter((v: Vulnerability) => v.severity === 'Medium').length || 0;
  const lowCount = scanResults?.vulnerabilities?.filter((v: Vulnerability) => v.severity === 'Low').length || 0;
  // Count-sensitive score: multiple high issues should materially reduce score.
  const severityPenalty = highCount * 12 + mediumCount * 7 + lowCount * 3;
  const score = Math.max(0, 100 - severityPenalty);
  const scoreTone = score >= 85 ? 'text-primary' : score >= 60 ? 'text-tertiary' : 'text-error';

  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const flowNodes: Node[] = useMemo(() => {
    if (!attackGraph?.nodes?.length) {
      return [];
    }

    return attackGraph.nodes.map((n, idx) => {
      const hue = n.criticality === 'high' ? '#ff6a6a' : n.criticality === 'entry' ? '#9cff93' : '#79a8ff';
      return {
        id: n.id,
        position: { x: idx * 260, y: idx % 2 === 0 ? 50 : 200 },
        data: { label: n.label },
        style: {
          background: '#171a1f',
          color: '#f6f6fc',
          border: `1px solid ${hue}`,
          borderRadius: 12,
          padding: 10,
          minWidth: 160,
          boxShadow: `0 0 24px ${hue}33`,
          fontWeight: 700,
        },
      };
    });
  }, [attackGraph]);

  const flowEdges: Edge[] = useMemo(() => {
    if (!attackGraph?.edges?.length) {
      return [];
    }

    return attackGraph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#79a8ff' },
      style: { stroke: '#79a8ff', strokeWidth: 2 },
      labelStyle: { fill: '#dbe8ff', fontSize: 12, fontWeight: 700 },
      labelBgStyle: {
        fill: '#171a1f',
        stroke: '#6e9bff',
        strokeWidth: 1,
        fillOpacity: 0.98,
      },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 6,
    }));
  }, [attackGraph]);

  const askCopilot = async () => {
    const question = chatInput.trim();
    if (!question) {
      return;
    }

    setChatMessages((prev) => [...prev, { role: 'user', text: question }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const payload = {
        code: codeSnippet,
        language,
        vulnerabilities: scanResults?.vulnerabilities || [],
        question,
      };
      const result = await postJson('/copilot', payload);
      const answer = result.error || result.answer || 'No response from security copilot.';
      setChatMessages((prev) => [...prev, { role: 'assistant', text: answer }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Copilot endpoint is unreachable. Please verify backend routes.' },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background selection:bg-primary/30 min-h-screen">
      <nav className="fixed top-0 w-full z-50 bg-[#111318]/80 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-6 h-16 shadow-[0_8px_30px_rgb(110,155,255,0.05)]">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold text-[#9cff93] tracking-tighter font-headline">SageArmor AI</span>
          <div className="hidden md:flex gap-2 items-center">
            <button
              onClick={() => {
                setActiveTab('results');
                jumpTo('dashboard-top');
              }}
              className="font-bold font-headline tracking-tight h-16 flex items-center px-3 border-b-2 transition-colors text-[#9cff93] border-[#9cff93]"
            >
              Dashboard
            </button>
          </div>
        </div>
      </nav>

      <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-[#111318] flex flex-col py-8 px-4 gap-2 border-r border-white/5">
        <div className="px-2 mb-6">
          <h3 className="text-[#9cff93] font-black font-headline text-sm uppercase tracking-widest">Command Center</h3>
          <p className="text-[#f6f6fc]/40 text-[10px] font-mono">attack-intel-enabled</p>
        </div>

        <button onClick={handleScan} disabled={isScanning} className="mt-2 w-full bg-primary text-on-primary py-3 rounded-lg font-bold font-label flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(156,255,147,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait">
          {isScanning ? (
            <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
          ) : (
            <span className="material-symbols-outlined text-sm">shield</span>
          )}
          {isScanning ? 'Scanning...' : 'New Scan'}
        </button>
      </aside>

      <main id="dashboard-top" className="pl-64 pt-16 min-h-screen">
        <div className="p-8 max-w-[1600px] mx-auto">
          <header className="mb-10 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-headline font-bold tracking-tight text-on-surface">AI Security Review Agent</h1>
              <p className="text-on-surface-variant mt-2">Attack Intelligence Engine with exploitability, risk, graph, simulation, and copilot.</p>
            </div>
          </header>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
              <div className="bg-surface-container rounded-xl p-8 border border-outline-variant/15">
                <h3 className="text-on-surface-variant font-label text-xs uppercase tracking-widest mb-6">Overall Security Score</h3>
                <div className="flex items-baseline gap-2">
                  <span className={`text-8xl font-headline font-bold ${scoreTone}`}>{score}</span>
                  <span className="text-on-surface-variant font-headline text-2xl">/100</span>
                </div>
              </div>

              <div className="bg-surface-container rounded-xl p-6 border border-outline-variant/15">
                <h3 className="text-on-surface font-headline font-bold text-lg mb-6">Risk Panel</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border-l-4 border-error">
                    <p className="font-headline font-bold text-sm text-on-surface">Critical Threats</p>
                    <span className="text-2xl font-headline font-bold text-error">{highCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border-l-4 border-tertiary">
                    <p className="font-headline font-bold text-sm text-on-surface">Moderate Risks</p>
                    <span className="text-2xl font-headline font-bold text-tertiary">{mediumCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border-l-4 border-secondary">
                    <p className="font-headline font-bold text-sm text-on-surface">Minor Issues</p>
                    <span className="text-2xl font-headline font-bold text-secondary">{lowCount}</span>
                  </div>

                  {riskRanking.slice(0, 3).map((item) => (
                    <div key={item.id} className="p-4 rounded-lg border border-outline-variant/20 bg-surface-container-high">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-sm font-bold font-headline text-on-surface truncate">{item.issue}</p>
                          {(item.occurrence_count || 0) > 1 ? (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-on-surface/10 text-on-surface-variant border border-outline-variant/30">
                              x{item.occurrence_count}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-xs font-mono px-2 py-1 rounded bg-primary/15 text-primary border border-primary/25">{item.priority_score.toFixed(1)}/10</span>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-on-surface-variant">
                        <span>Exploitability: <strong className="text-on-surface">{item.exploitability.level}</strong></span>
                        <span>Asset: <strong className="text-on-surface">{item.asset_value}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
              <div id="scanner-panel" className="bg-surface-container rounded-xl border border-outline-variant/15 p-6">
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

                <div className="mt-5 border-t border-outline-variant/15 pt-5 space-y-3">
                  <p className="text-xs uppercase tracking-wider text-on-surface-variant">GitHub Repo Selective Scan (Phase 1)</p>
                  <input
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant/20 outline-none focus:border-primary/45"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={repoBranch}
                      onChange={(e) => setRepoBranch(e.target.value)}
                      placeholder="main"
                      className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant/20 outline-none focus:border-primary/45"
                    />
                    <input
                      value={repoQuery}
                      onChange={(e) => setRepoQuery(e.target.value)}
                      placeholder="Describe what to hunt for"
                      className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant/20 outline-none focus:border-primary/45"
                    />
                  </div>
                  <button
                    onClick={handleRepoScan}
                    disabled={isRepoScanning || isScanning}
                    className="px-4 py-2 rounded-lg bg-secondary text-[#001d4e] font-bold disabled:opacity-60"
                  >
                    {isRepoScanning ? 'Scanning Repo...' : 'Scan GitHub Repo'}
                  </button>
                </div>
              </div>

              <div id="analysis-results" className="bg-surface-container rounded-xl border border-outline-variant/15 flex flex-col overflow-hidden">
                <div className="p-6 bg-surface-container-high border-b border-outline-variant/15 flex justify-between items-center">
                  <h2 className="text-xl font-headline font-bold text-on-surface">Analysis Results</h2>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'results', label: 'Findings' },
                      { id: 'attack', label: 'Attack View' },
                      { id: 'simulation', label: 'Breach Simulation' },
                      { id: 'copilot', label: 'AI Copilot' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded-md border transition-colors ${
                          activeTab === tab.id
                            ? 'bg-primary/15 border-primary/30 text-primary'
                            : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto space-y-8 min-h-[400px]">
                  {isScanning ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-on-surface-variant">
                      <span className="material-symbols-outlined text-5xl animate-spin text-primary">autorenew</span>
                      <p className="font-headline">Analyzing code and attack intelligence...</p>
                    </div>
                  ) : apiError ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <span className="material-symbols-outlined text-5xl text-error">error</span>
                      <p className="font-headline font-bold text-error text-center">Backend Error</p>
                      <p className="text-sm text-on-surface-variant text-center max-w-md bg-error/10 border border-error/20 rounded-lg p-4 font-mono break-words">{apiError}</p>
                    </div>
                  ) : !scanResults ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-on-surface-variant">
                      <span className="material-symbols-outlined text-5xl opacity-50">data_object</span>
                      <p className="font-headline text-center">Paste a snippet and click New Scan.</p>
                    </div>
                  ) : activeTab === 'attack' ? (
                    <div className="space-y-4">
                      <div className="h-[360px] rounded-xl border border-outline-variant/20 overflow-hidden bg-surface-container-lowest">
                        {flowNodes.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-on-surface-variant">No attack graph generated yet.</div>
                        ) : (
                          <ReactFlow nodes={flowNodes} edges={flowEdges} fitView proOptions={{ hideAttribution: true }}>
                            <MiniMap
                              nodeStrokeWidth={2}
                              zoomable
                              pannable
                              bgColor="#111318"
                              maskColor="rgba(12, 14, 18, 0.12)"
                              nodeColor={(node) => {
                                if (node.id.toLowerCase().includes('db')) {
                                  return '#d95b6a';
                                }
                                if (node.id.toLowerCase().includes('api')) {
                                  return '#9cff93';
                                }
                                return '#79a8ff';
                              }}
                              style={{ backgroundColor: '#111318', border: '1px solid #46484d' }}
                            />
                            <Controls />
                            <Background gap={18} size={1} color="#253041" />
                          </ReactFlow>
                        )}
                      </div>

                      <div className="p-4 rounded-lg border border-outline-variant/20 bg-surface-container-low">
                        <p className="text-sm uppercase tracking-wider text-on-surface-variant">Attack Vector Chain</p>
                        {(attackGraph?.attack_paths || []).length > 0 ? (
                          <div className="mt-2 space-y-3">
                            {(attackGraph?.attack_paths || []).map((path, pIdx) => (
                              <div key={`path-${pIdx}`} className="rounded-md border border-outline-variant/20 bg-surface-container-high p-3">
                                <p className="text-sm text-on-surface font-bold">{path.name || `Attack Path ${pIdx + 1}`}</p>
                                <p className="text-xs text-on-surface-variant mt-1">Risk: {path.risk_level || 'Unknown'}</p>
                                <div className="mt-2 text-sm text-on-surface space-y-1">
                                  {(path.steps || []).map((step: any) => (
                                    <p key={`${pIdx}-${step.step}`}>{step.step}. {step.from} {'->'} {step.to} ({step.technique})</p>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm mt-2 text-on-surface-variant">No attack vector path generated yet.</p>
                        )}
                      </div>
                    </div>
                  ) : activeTab === 'simulation' ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border border-outline-variant/20 bg-surface-container-low">
                        <p className="text-sm uppercase tracking-wider text-on-surface-variant">Attack Chain</p>
                        <p className="text-on-surface mt-2 font-headline">{simulationData?.chain_summary || 'No chain summary available yet.'}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border border-outline-variant/20 bg-surface-container-low">
                          <p className="text-sm uppercase tracking-wider text-on-surface-variant mb-2">Accessible Data</p>
                          {(simulationData?.accessible_data || []).length > 0 ? (
                            <ul className="space-y-2 text-sm text-on-surface">
                              {(simulationData?.accessible_data || []).map((item) => <li key={item}>- {item}</li>)}
                            </ul>
                          ) : (
                            <p className="text-sm text-on-surface-variant">No exposed data detected.</p>
                          )}
                        </div>

                        <div className="p-4 rounded-lg border border-outline-variant/20 bg-surface-container-low">
                          <p className="text-sm uppercase tracking-wider text-on-surface-variant mb-2">Likely Impact</p>
                          {(simulationData?.likely_impact || []).length > 0 ? (
                            <ul className="space-y-2 text-sm text-on-surface">
                              {(simulationData?.likely_impact || []).map((item) => <li key={item}>- {item}</li>)}
                            </ul>
                          ) : (
                            <p className="text-sm text-on-surface-variant">No direct impact produced yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : activeTab === 'copilot' ? (
                    <div className="h-[460px] flex flex-col gap-4">
                      <div className="flex-1 overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-low p-4 space-y-3">
                        {chatMessages.map((m, idx) => (
                          <div
                            key={`${m.role}-${idx}`}
                            className={`max-w-[85%] p-3 rounded-lg text-sm leading-relaxed ${
                              m.role === 'user'
                                ? 'ml-auto bg-primary/20 border border-primary/35 text-on-surface'
                                : 'mr-auto bg-surface-container-high border border-outline-variant/20 text-on-surface'
                            }`}
                          >
                            {m.text}
                          </div>
                        ))}
                        {isChatLoading && (
                          <div className="mr-auto bg-surface-container-high border border-outline-variant/20 text-on-surface p-3 rounded-lg text-sm">
                            Thinking...
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <input
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              askCopilot();
                            }
                          }}
                          placeholder="Ask: what should I fix first and why?"
                          className="flex-1 bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant/20 outline-none focus:border-primary/45"
                        />
                        <button
                          onClick={askCopilot}
                          disabled={isChatLoading}
                          className="px-4 rounded-lg bg-primary text-on-primary font-bold disabled:opacity-60"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  ) : scanResults.vulnerabilities && scanResults.vulnerabilities.length > 0 ? (
                    scanResults.vulnerabilities.map((v, idx) => (
                      <div key={idx} className="space-y-6 pb-8 border-b border-outline-variant/10 last:border-0 last:pb-0">
                        <div className={`rounded-lg border p-4 flex gap-4 ${v.severity === 'High' ? 'bg-error/10 border-error/20 text-error' : v.severity === 'Medium' ? 'bg-tertiary/10 border-tertiary/20 text-tertiary' : 'bg-secondary/10 border-secondary/20 text-secondary'}`}>
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {v.severity === 'High' ? 'dangerous' : v.severity === 'Medium' ? 'report_problem' : 'info'}
                          </span>
                          <div className="flex-1">
                            <p className="font-bold font-headline mb-1">{v.issue}</p>
                            <p className="text-sm text-on-surface-variant leading-relaxed">{v.explanation}</p>
                            {(v as any).file_count && (v as any).file_count > 1 && (
                              <p className="text-xs mt-2 font-semibold text-on-surface-variant/80">Found in {(v as any).file_count} files</p>
                            )}
                          </div>
                        </div>

                        {v.attack_vector && (
                          <div className="space-y-3">
                            <h3 className="text-on-surface font-headline font-bold flex items-center gap-2">
                              <span className="material-symbols-outlined text-tertiary">route</span>
                              Attack Vector
                            </h3>
                            <div className="rounded-xl overflow-x-auto border border-tertiary/30 bg-tertiary/5 text-sm leading-relaxed p-4">
                              <p className="text-on-surface whitespace-pre-wrap">{v.attack_vector}</p>
                            </div>
                          </div>
                        )}

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

                        <div className="space-y-3">
                          <h3 className="text-on-surface font-headline font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">auto_fix_high</span>
                            Suggested Fix
                          </h3>
                          <div className="relative rounded-xl border border-primary/20 bg-surface-container-lowest font-mono text-sm leading-relaxed">
                            <button
                              onClick={() => handleCopyFix(v, idx)}
                              title="Copy fix"
                              className="absolute top-3 right-3 flex items-center gap-1 text-xs font-label px-2 py-1 rounded-md bg-surface-container-high border border-outline-variant/20 hover:border-primary/40 transition-all"
                            >
                              {copiedIdx === idx ? 'Copied!' : 'Copy'}
                            </button>
                            <div className="overflow-x-auto p-4 pr-20">
                              <pre className="text-primary whitespace-pre-wrap">{v.remediation?.patch ?? v.suggested_fix}</pre>
                            </div>
                          </div>
                          {v.remediation?.explanation && (
                            <p className="text-xs text-on-surface-variant italic pl-1">{v.remediation.explanation}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-primary">
                      <span className="material-symbols-outlined text-5xl">verified</span>
                      <p className="font-headline font-bold text-center">No vulnerabilities detected.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

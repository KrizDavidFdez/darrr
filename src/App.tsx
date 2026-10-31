import React, { useState, useEffect } from 'react';
import {
  Globe,
  Terminal,
  Play,
  Code,
  FileText,
  Camera,
  Download,
  Copy,
  Check,
  Server,
  Layers,
  Sparkles,
  ExternalLink,
  Zap,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Cpu,
  Sliders,
  Shield,
  FileCode
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scraper' | 'workflow' | 'api' | 'deploy'>('scraper');
  
  // Scraper State
  const [targetUrl, setTargetUrl] = useState('https://news.ycombinator.com');
  const [selector, setSelector] = useState('.titleline > a');
  const [waitMs, setWaitMs] = useState(0);
  const [userAgent, setUserAgent] = useState('');
  const [viewportWidth, setViewportWidth] = useState(1280);
  const [viewportHeight, setViewportHeight] = useState(800);
  const [customJs, setCustomJs] = useState('() => { return { scrapedAt: new Date().toISOString(), linksCount: document.links.length }; }');
  
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<any>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Workflow State
  const [steps, setSteps] = useState([
    { action: 'goto', url: 'https://news.ycombinator.com', selector: '', text: '', key: '', waitMs: 0, evaluateCode: '' },
    { action: 'waitForSelector', url: '', selector: '.titleline', text: '', key: '', waitMs: 0, evaluateCode: '' },
    { action: 'evaluate', url: '', selector: '', text: '', key: '', waitMs: 0, evaluateCode: '() => { return document.title; }' },
    { action: 'screenshot', url: '', selector: '', text: '', key: '', waitMs: 0, evaluateCode: '' }
  ]);
  const [runningWorkflow, setRunningWorkflow] = useState(false);
  const [workflowResult, setWorkflowResult] = useState<any>(null);

  // Templates & Deploy configs
  const [templates, setTemplates] = useState<any[]>([]);
  const [deployConfigs, setDeployConfigs] = useState<any>(null);

  useEffect(() => {
    fetch('/api/templates')
      .then(res => res.json())
      .then(data => setTemplates(data))
      .catch(() => {});

    fetch('/api/deploy-configs')
      .then(res => res.json())
      .then(data => setDeployConfigs(data))
      .catch(() => {});
  }, []);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setScraping(true);
    setScrapeError(null);
    try {
      // Calls our universal /api/execute endpoint
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          selector,
          userAgent: userAgent || undefined,
          viewport: { width: viewportWidth, height: viewportHeight },
          actions: [
            ...(waitMs > 0 ? [{ type: 'wait', waitMs }] : []),
            ...(customJs ? [{ type: 'evaluate', code: customJs }] : [])
          ],
          takeScreenshot: true,
          returnHtml: true
        })
      });
      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Server returned invalid JSON response: ${responseText.slice(0, 150)}`);
      }
      if (!res.ok || !data.success) throw new Error(data.error || 'Execution failed');
      setScrapeResult(data);
    } catch (err: any) {
      setScrapeError(err.message || 'Execution failed unexpectedly');
    } finally {
      setScraping(false);
    }
  };

  const handleRunWorkflow = async () => {
    setRunningWorkflow(true);
    setWorkflowResult(null);
    try {
      const mappedActions = steps.map(s => ({
        type: s.action,
        url: s.url,
        selector: s.selector,
        text: s.text,
        key: s.key,
        waitMs: s.waitMs,
        code: s.evaluateCode
      }));

      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: steps[0]?.url || 'https://example.com',
          actions: mappedActions,
          takeScreenshot: true
        })
      });
      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Server returned invalid JSON response: ${responseText.slice(0, 150)}`);
      }
      if (!res.ok || !data.success) throw new Error(data.error || 'Workflow failed');
      setWorkflowResult({
        success: true,
        logs: [
          'Remote Puppeteer execution started',
          ...(data.evaluationResults ? data.evaluationResults.map((e: any) => `Eval Result: ${JSON.stringify(e.result || e.error)}`) : []),
          'Workflow successfully completed on remote cluster.'
        ],
        pageTitle: data.meta?.title,
        finalResult: { screenshot: data.screenshot }
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRunningWorkflow(false);
    }
  };

  const addWorkflowStep = () => {
    setSteps([...steps, { action: 'goto', url: '', selector: '', text: '', key: '', waitMs: 500, evaluateCode: '' }]);
  };

  const removeWorkflowStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const apiCurlSnippet = `curl -X POST https://your-app.koyeb.app/api/execute \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "${targetUrl}",
    "selector": "${selector}",
    "viewport": { "width": ${viewportWidth}, "height": ${viewportHeight} },
    "actions": [
      { "type": "evaluate", "code": ${JSON.stringify(customJs)} }
    ],
    "takeScreenshot": true
  }'`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Bar */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Globe className="w-5 h-5 text-white animate-spin-slow" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">BrowserFlow Pro</span>
            <span className="hidden sm:inline-block ml-2 text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30">
              Remote Puppeteer API Service
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-2 md:gap-4 text-sm font-medium">
          <button
            onClick={() => setActiveTab('scraper')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'scraper'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>API Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('workflow')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'workflow'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>Visual Actions</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'api'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>API Docs (`/api/execute`)</span>
          </button>

          <button
            onClick={() => setActiveTab('deploy')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'deploy'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Koyeb & Vercel Hub</span>
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden lg:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            API Ready (/api/execute)
          </span>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-8">
        {activeTab === 'scraper' && (
          <div className="space-y-8 animate-fade-in">
            {/* Hero Banner */}
            <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 hidden md:block">
                <Cpu className="w-48 h-48 text-indigo-400" />
              </div>
              <div className="max-w-2xl relative z-10">
                <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">Remote Puppeteer API Service</span>
                <h1 className="text-3xl lg:text-4xl font-extrabold text-white mt-2 tracking-tight">
                  Use Our API Like Puppeteer (Without Installing Puppeteer)
                </h1>
                <p className="text-slate-300 mt-3 text-sm lg:text-base leading-relaxed">
                  Send requests to <code className="text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded font-mono">POST /api/execute</code> with navigation, click, type, and JavaScript evaluation actions. Our backend cluster executes Puppeteer fully and returns structured data & screenshots.
                </p>
              </div>
            </div>

            {/* Scraper Control Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Form Controls */}
              <div className="lg:col-span-1 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-400" />
                  <span>API Request Payload Builder</span>
                </h2>

                <form onSubmit={handleScrape} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Target URL</label>
                    <input
                      type="url"
                      value={targetUrl}
                      onChange={e => setTargetUrl(e.target.value)}
                      required
                      placeholder="https://example.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">CSS Selector</label>
                    <input
                      type="text"
                      value={selector}
                      onChange={e => setSelector(e.target.value)}
                      placeholder="e.g. h1, .product-price"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Viewport W</label>
                      <input
                        type="number"
                        value={viewportWidth}
                        onChange={e => setViewportWidth(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Viewport H</label>
                      <input
                        type="number"
                        value={viewportHeight}
                        onChange={e => setViewportHeight(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Custom JS `evaluate` Code</label>
                    <textarea
                      value={customJs}
                      onChange={e => setCustomJs(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-indigo-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={scraping}
                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {scraping ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Calling /api/execute...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Send API Request</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Presets */}
                <div className="pt-4 border-t border-slate-800">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">Quick Presets</span>
                  <div className="space-y-2">
                    {templates.map(tpl => (
                      <button
                        key={tpl.id}
                        onClick={() => {
                          setTargetUrl(tpl.targetUrl);
                          setSelector(tpl.selector);
                        }}
                        className="w-full text-left p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 transition-all group"
                      >
                        <div className="text-xs font-semibold text-indigo-300 group-hover:text-indigo-200">{tpl.name}</div>
                        <div className="text-xs text-slate-400 truncate mt-0.5">{tpl.targetUrl}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: API Response Output */}
              <div className="lg:col-span-2 space-y-6">
                {scrapeError && (
                  <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3 text-rose-300 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                    <div>
                      <span className="font-semibold block">API Execution Error</span>
                      {scrapeError}
                    </div>
                  </div>
                )}

                {scrapeResult ? (
                  <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-white">API Response (`/api/execute`)</h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Status: <span className="text-emerald-400 font-mono">200 OK</span> · Mode: <span className="text-indigo-400 font-mono">{scrapeResult.mode}</span> · Time: <span className="text-emerald-400 font-mono">{scrapeResult.durationMs}ms</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(scrapeResult, null, 2))}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCode ? 'Copied' : 'Copy JSON'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Page Title</span>
                        <div className="text-sm font-medium text-white truncate">{scrapeResult.meta?.title || 'No Title'}</div>
                      </div>
                      <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Target URL</span>
                        <div className="text-sm text-slate-300 truncate">{scrapeResult.meta?.url || targetUrl}</div>
                      </div>
                    </div>

                    {scrapeResult.screenshot && (
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Captured Screenshot from API</span>
                        <img
                          src={scrapeResult.screenshot}
                          alt="Screenshot"
                          className="rounded-xl border border-slate-800 w-full object-cover max-h-64"
                        />
                      </div>
                    )}

                    {scrapeResult.extractedData && scrapeResult.extractedData.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Extracted Elements ({selector})</span>
                        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 max-h-48 overflow-y-auto space-y-2 font-mono text-xs">
                          {scrapeResult.extractedData.map((el: any, idx: number) => (
                            <div key={idx} className="p-2 rounded bg-slate-900 border border-slate-800 text-indigo-300 truncate">
                              {idx + 1}. {el.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Full API JSON Response</span>
                      <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-indigo-200 overflow-x-auto max-h-64">
                        {JSON.stringify(scrapeResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[400px]">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Globe className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">Ready for API Calls</h3>
                      <p className="text-sm text-slate-400 mt-1 max-w-sm">
                        Submit a request to `/api/execute` on the left to see the complete JSON response and screenshot.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'workflow' && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-gradient-to-r from-violet-950/60 via-slate-900 to-slate-900 border border-violet-500/20 rounded-2xl p-8 shadow-2xl">
              <span className="text-xs uppercase tracking-widest text-violet-400 font-semibold">Remote Action Queue</span>
              <h1 className="text-3xl font-extrabold text-white mt-2 tracking-tight">Visual API Action Queue</h1>
              <p className="text-slate-300 mt-2 text-sm lg:text-base">
                Build an action array and send it to <code className="text-violet-300 font-mono">POST /api/execute</code>.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Actions Array</h2>
                  <button
                    onClick={addWorkflowStep}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Action</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {steps.map((step, idx) => (
                    <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-indigo-400 font-mono text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        <select
                          value={step.action}
                          onChange={e => {
                            const updated = [...steps];
                            updated[idx].action = e.target.value;
                            setSteps(updated);
                          }}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="goto">goto</option>
                          <option value="waitForSelector">waitForSelector</option>
                          <option value="click">click</option>
                          <option value="type">type</option>
                          <option value="press">press key</option>
                          <option value="evaluate">evaluate JS</option>
                          <option value="wait">wait (ms)</option>
                        </select>

                        <button
                          onClick={() => removeWorkflowStep(idx)}
                          disabled={steps.length <= 1}
                          className="ml-auto p-2 text-slate-500 hover:text-rose-400 disabled:opacity-30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {step.action === 'goto' && (
                        <input
                          type="text"
                          placeholder="https://url.com"
                          value={step.url}
                          onChange={e => {
                            const updated = [...steps];
                            updated[idx].url = e.target.value;
                            setSteps(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                        />
                      )}

                      {(step.action === 'click' || step.action === 'waitForSelector' || step.action === 'type') && (
                        <input
                          type="text"
                          placeholder="CSS Selector"
                          value={step.selector}
                          onChange={e => {
                            const updated = [...steps];
                            updated[idx].selector = e.target.value;
                            setSteps(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                        />
                      )}

                      {step.action === 'type' && (
                        <input
                          type="text"
                          placeholder="Text to type"
                          value={step.text}
                          onChange={e => {
                            const updated = [...steps];
                            updated[idx].text = e.target.value;
                            setSteps(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                        />
                      )}

                      {step.action === 'evaluate' && (
                        <textarea
                          placeholder="() => document.title"
                          value={step.evaluateCode}
                          onChange={e => {
                            const updated = [...steps];
                            updated[idx].evaluateCode = e.target.value;
                            setSteps(updated);
                          }}
                          rows={2}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-indigo-200 font-mono"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleRunWorkflow}
                  disabled={runningWorkflow}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                >
                  {runningWorkflow ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Sending Action Queue to API...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Execute Action Queue</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <h2 className="text-lg font-semibold text-white">Execution Logs</h2>
                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 h-64 overflow-y-auto font-mono text-xs space-y-1.5 text-indigo-300">
                    {workflowResult ? (
                      workflowResult.logs.map((log: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-slate-500">[{idx + 1}]</span>
                          <span>{log}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-500">Run action queue to view logs...</span>
                    )}
                  </div>

                  {workflowResult?.finalResult?.screenshot && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Result Screenshot</span>
                      <img
                        src={workflowResult.finalResult.screenshot}
                        alt="Screenshot"
                        className="rounded-xl border border-slate-800 w-full object-cover max-h-48"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 rounded-2xl p-8 shadow-2xl">
              <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">Universal API Endpoint</span>
              <h1 className="text-3xl font-extrabold text-white mt-2 tracking-tight">`POST /api/execute`</h1>
              <p className="text-slate-300 mt-2 text-sm lg:text-base">
                Your API acts as a remote Puppeteer cluster. Your client apps make simple HTTP requests, and our API executes Puppeteer on the server.
              </p>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-semibold text-white">cURL Example (Use Our API Like Puppeteer)</h2>
              <div className="relative">
                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-indigo-200 overflow-x-auto">
                  {apiCurlSnippet}
                </pre>
                <button
                  onClick={() => copyToClipboard(apiCurlSnippet)}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deploy' && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-8 shadow-2xl">
              <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">Deployment Hub</span>
              <h1 className="text-3xl font-extrabold text-white mt-2 tracking-tight">Deploy to Koyeb & Vercel</h1>
              <p className="text-slate-300 mt-2 text-sm lg:text-base">
                Deploy this API service to Koyeb or Vercel with zero modifications.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <h2 className="text-lg font-semibold text-white">Koyeb Dockerfile</h2>
                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-orange-200 overflow-x-auto max-h-48">
                  {deployConfigs?.koyeb?.dockerfile || 'Loading...'}
                </pre>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <h2 className="text-lg font-semibold text-white">Vercel vercel.json</h2>
                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-indigo-200 overflow-x-auto max-h-48">
                  {deployConfigs?.vercel?.vercelJson || 'Loading...'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 px-8 text-center text-xs text-slate-500">
        BrowserFlow & ScrapeAPI Pro · Universal Remote Puppeteer API. Ready for Koyeb & Vercel.
      </footer>
    </div>
  );
}

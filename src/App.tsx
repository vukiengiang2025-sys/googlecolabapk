/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ReactNode } from 'react';
import { 
  Play, 
  RotateCw, 
  Square, 
  Wifi, 
  Code2,
  Copy, 
  Terminal as TerminalIcon,
  Settings,
  Cpu,
  Monitor,
  Zap,
  Shield,
  Layers,
  Sparkles,
  Command,
  Activity,
  Plus,
  X,
  ChevronUp,
  Bell,
  Trash2,
  Hand,
  CheckCircle,
  XCircle,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const ELITE_SNIPPETS = [
  {
    id: 'idempotent-guard',
    title: 'Idempotent Logic',
    description: 'Đảm bảo script có thể chạy lại vô hạn lần mà không gây lỗi hoặc trùng lặp dữ liệu.',
    type: 'Resilience',
    code: `import os
def setup_workspace(paths=["data", "models", "logs"]):
    for p in paths:
        if not os.path.exists(p):
            os.makedirs(p)
            print(f"[OS] Path created: {p}")
        else:
            print(f"[OS] Path exists, skipping: {p}")`
  },
  {
    id: 'isolation-kernel',
    title: 'Isolation Lifecycle',
    description: 'Tự động khởi động lại Kernel và dọn sạch State giữa các Job Critical.',
    type: 'Core',
    code: `import os
def isolate_execution():
    print("[OS] Purging local namespace...")
    %reset -f
    import gc
    gc.collect()
    print("[OS] Execution isolated. Ready for fresh task.")`
  },
  {
    id: 'predictive-oom',
    title: 'Predictive Watchdog',
    description: 'Dự báo OOM dựa trên xu hướng sử dụng RAM và tự động tối ưu hóa Batch Size.',
    type: 'Guardian',
    code: `class PredictiveGuard:
    def __init__(self, limit=0.85):
        self.history = []
        self.limit = limit
    def check(self, current_load):
        self.history.append(current_load)
        if len(self.history) > 5:
            trend = self.history[-1] - self.history[-3]
            if current_load + trend > self.limit:
                print("[OS] WARNING: Predictive OOM Detected. Reducing Batch...")`
  }
];

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL' | 'DEBUG' | 'BRAIN';
  msg: string;
  executor?: string;
}

interface JobRequirements {
  vram: number;
  priority: 'CRITICAL' | 'HIGH' | 'LOW';
  latency: 'REALTIME' | 'BATCH';
}

interface Job {
  id: string;
  name: string;
  requirements: JobRequirements;
  status: 'QUEUED' | 'ROUTING' | 'ISOLATING' | 'RUNNING' | 'SUCCESS' | 'FAILURE';
  executor: 'PENDING' | 'COLAB' | 'REMOTE' | 'EDGE';
  estCost: string;
  retries: number;
}

interface OSCheckpoint {
  id: string;
  timestamp: string;
  type: 'MODEL' | 'STATE' | 'SNAPSHOT' | 'WEIGHT_STREAM';
  persistence: 'DRIVE' | 'S3';
}

interface OSNotification {
  id: string;
  msg: string;
  type: 'SUCCESS' | 'ERROR' | 'WARN' | 'INFO';
  action?: {
    label: string;
    onUndo: () => void;
  };
}

interface SessionState {
  status: 'connected' | 'isolated' | 'warning' | 'panic' | 'idle';
  vramLoad: number;
  activeExecutor: 'COLAB' | 'REMOTE' | 'AUTONOMOUS';
  predictiveAlert: boolean;
  learningProgress: number;
}

const HAPTIC = {
  SUCCESS: [50, 30, 50],
  ERROR: [150],
  WARN: [100, 30],
  RUN: [30],
  NEURAL: [10],
  CRITICAL: [200, 50, 200]
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'hub' | 'forge' | 'library' | 'system'>('hub');
  const [showOrbital, setShowOrbital] = useState(false);
  const [notifications, setNotifications] = useState<OSNotification[]>([]);
  const [pendingActions, setPendingActions] = useState<Record<string, any>>({});
  
  const [session, setSession] = useState<SessionState>(() => {
    try {
      const saved = localStorage.getItem('elite_session');
      return saved ? JSON.parse(saved) : {
        status: 'connected',
        vramLoad: 12,
        activeExecutor: 'AUTONOMOUS',
        predictiveAlert: false,
        learningProgress: 76
      };
    } catch {
      return { status: 'connected', vramLoad: 12, activeExecutor: 'AUTONOMOUS', predictiveAlert: false, learningProgress: 76 };
    }
  });
  
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('elite_logs');
      return saved ? JSON.parse(saved) : [
        { timestamp: new Date().toLocaleTimeString(), level: 'BRAIN', msg: 'Neural Router analyzing network latency...' },
        { timestamp: new Date().toLocaleTimeString(), level: 'INFO', msg: 'Elite OS v6.0 Autonomous Brain initialized.' }
      ];
    } catch {
      return [];
    }
  });

  const [queue, setQueue] = useState<Job[]>(() => {
    try {
      const saved = localStorage.getItem('elite_queue');
      return saved ? JSON.parse(saved) : [
        { id: 'J-601', name: 'Global Model Distill', requirements: { vram: 40, priority: 'CRITICAL', latency: 'BATCH' }, status: 'QUEUED', executor: 'PENDING', estCost: '0.00$', retries: 0 },
        { id: 'J-602', name: 'Real-time Inference', requirements: { vram: 4, priority: 'HIGH', latency: 'REALTIME' }, status: 'QUEUED', executor: 'PENDING', estCost: '0.00$', retries: 0 },
        { id: 'J-603', name: 'Dataset Sharding', requirements: { vram: 8, priority: 'LOW', latency: 'BATCH' }, status: 'SUCCESS', executor: 'COLAB', estCost: '0.01$', retries: 0 }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('elite_session', JSON.stringify(session));
    localStorage.setItem('elite_queue', JSON.stringify(queue));
    localStorage.setItem('elite_logs', JSON.stringify(logs.slice(0, 50)));
  }, [session, queue, logs]);

  const [checkpoints, setCheckpoints] = useState<OSCheckpoint[]>([
    { id: 'STREAM-01', timestamp: '03:45:00', type: 'WEIGHT_STREAM', persistence: 'DRIVE' },
    { id: 'CKP-SIGMA', timestamp: '01:10:20', type: 'MODEL', persistence: 'S3' }
  ]);

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSession(prev => ({ ...prev, status: 'connected' }));
      addLog('Uplink synchronized with Federated Runtime Cluster.', 'INFO', 'CORE-FED');
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const addLog = (msg: string, level: LogEntry['level'] = 'INFO', executor: string = 'BRAIN') => {
    const entry: LogEntry = { timestamp: new Date().toLocaleTimeString(), level, msg, executor };
    setLogs(prev => [entry, ...prev].slice(0, 25));
    
    if (level === 'ERROR' || level === 'CRITICAL') {
      triggerNotification(msg, 'ERROR');
      vibrate(HAPTIC.ERROR);
    } else if (level === 'BRAIN') {
      vibrate(HAPTIC.NEURAL);
    }
    
    if (session.vramLoad > 80) {
      setSession(prev => ({ ...prev, predictiveAlert: true }));
      addLog('BRAIN: Predictive OOM detected in sequence. Adjusting strategy.', 'WARN', 'BRAIN');
    }
  };

  const triggerNotification = (msg: string, type: OSNotification['type'] = 'INFO', action?: OSNotification['action']) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, msg, type, action }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, action ? 6000 : 4000);
  };

  const vibrate = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const handleGuardedSwipe = (job: Job, direction: 'LEFT' | 'RIGHT') => {
    if (job.requirements.priority === 'CRITICAL' && direction === 'LEFT') {
      vibrate(HAPTIC.CRITICAL);
      triggerNotification(`System Lock: CRITICAL job ${job.id} cannot be manually terminated.`, 'ERROR');
      return;
    }

    if (direction === 'RIGHT') {
      vibrate(HAPTIC.RUN);
      routeJob(job.id);
    } else {
      // Guarded Kill with Undo
      const timeoutId = setTimeout(() => {
        cancelJob(job.id);
        setPendingActions(prev => {
          const next = { ...prev };
          delete next[job.id];
          return next;
        });
      }, 5000);

      setPendingActions(prev => ({ ...prev, [job.id]: timeoutId }));
      vibrate(HAPTIC.WARN);
      triggerNotification(`Pending Termination: ${job.name}...`, 'WARN', {
        label: 'UNDO',
        onUndo: () => {
          clearTimeout(timeoutId);
          setPendingActions(prev => {
            const next = { ...prev };
            delete next[job.id];
            return next;
          });
          vibrate(HAPTIC.SUCCESS);
          addLog(`OS_WATCH: Termination aborted for ${job.id}.`, 'INFO');
        }
      });
    }
  };

  const routeJob = (id: string) => {
    const job = queue.find(j => j.id === id);
    if (!job) return;

    setQueue(prev => prev.map(j => j.id === id ? { ...j, status: 'ROUTING' } : j));
    addLog(`ROUTING: Analyzing optimal node for ${id}...`, 'BRAIN');

    setTimeout(() => {
      let selectedNode: Job['executor'] = 'COLAB';
      let cost = '0.02$';

      if (job.requirements.vram > 16 || job.requirements.priority === 'CRITICAL') {
        selectedNode = 'REMOTE';
        cost = '1.45$';
      } else if (job.requirements.latency === 'REALTIME') {
        selectedNode = 'EDGE';
        cost = '0.12$';
      }

      addLog(`DECISION: Routing ${id} to ${selectedNode} node. (Reason: Requirements match)`, 'BRAIN');
      setQueue(prev => prev.map(j => j.id === id ? { ...j, executor: selectedNode, status: 'ISOLATING', estCost: cost } : j));
      vibrate(HAPTIC.RUN);
      executeJob(id, selectedNode);
    }, 2000);
  };

  const executeJob = (id: string, executor: Job['executor']) => {
    addLog(`INIT: Isolation stage active on ${executor}. Clearing context...`, 'DEBUG', executor);
    vibrate(HAPTIC.RUN);

    setTimeout(() => {
      setQueue(prev => prev.map(j => j.id === id ? { ...j, status: 'RUNNING' } : j));
      addLog(`RUNNING: Autonomous execution active. Streaming live state...`, 'INFO', executor);
      
      const streamInterval = setInterval(() => {
        addLog(`STREAM: Weights converged at cycle ${Math.floor(Math.random() * 1000)}.`, 'DEBUG', executor);
      }, 5000);

      setTimeout(() => {
        clearInterval(streamInterval);
        setQueue(prev => prev.map(j => j.id === id ? { ...j, status: 'SUCCESS' } : j));
        addLog(`SUCCESS: ${id} lifecycle complete. Node de-registration initiated.`, 'INFO', executor);
        triggerNotification(`Job ${id} completed successfully.`, 'SUCCESS');
        vibrate(HAPTIC.SUCCESS);
        setSession(prev => ({ ...prev, learningProgress: Math.min(100, prev.learningProgress + 2) }));
      }, 8000);
    }, 2000);
  };

  const cancelJob = (id: string) => {
    setQueue(prev => prev.map(j => j.id === id ? { ...j, status: 'FAILURE' } : j));
    addLog(`USER_SIGINT: Manual termination of ${id} confirmed.`, 'WARN', 'USER');
    vibrate(HAPTIC.ERROR);
  };

  const compilePipeline = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    addLog('COMPILER: Weaving adaptive multi-node training modules...', 'BRAIN');
    try {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Architect an Autonomous & Federated AI Python script for: ${prompt}.
        AUTONOMOUS OS REQUIREMENTS:
        1. FEDERATED: Auto-detect executor environment (Colab/VPS/Edge).
        2. ADAPTIVE: Auto-adjust batch_size based on real-time pynvml telemetry.
        3. STREAMING: Real-time JSON weight/gradient streaming (KERNEL_STREAM).
        4. RESILIENCE: Checkpoint restoration with exponential backoff on retry.
        OUTPUT RAW CODE ONLY.`,
      });
      setAiResult(result.text?.replace(/```[a-z]*\n|```/g, '') || "");
      addLog('COMPILER: Autonomous architecture successfully compiled.', 'INFO', 'AI-FORGE');
    } catch (err) {
      addLog('COMPILER: Neural link failure.', 'ERROR', 'SYSTEM');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    addLog(`BUFFER: Segment [${id}] transferred to neural clipboard.`, 'INFO');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#010203] text-slate-400 font-sans selection:bg-brand-primary/30">
      {/* Autonomous OS Status Strip */}
      <div className="bg-brand-primary/5 h-8 border-b border-white/5 flex items-center justify-between px-4 md:px-8 shrink-0 overflow-hidden backdrop-blur-2xl">
        <div className="flex gap-4 md:gap-8 overflow-x-auto no-scrollbar whitespace-nowrap">
          <KernelStatus label="BRAIN" val="AUTONOMOUS-V6" color="text-brand-primary" />
          <KernelStatus label="NEURAL-LINK" val="FEDERATED" color="text-cyan-400" />
          <KernelStatus label="EVOLUTION" val={`${session.learningProgress}%`} color="text-indigo-400" className="hidden sm:flex" />
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {session.predictiveAlert && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-2 py-0.5 bg-red-500/10 rounded border border-red-500/20">
               <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
               <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">PREDICT_COLLAPSE</span>
            </motion.div>
          )}
          <div className="text-[9px] font-mono font-black text-slate-800 tracking-[0.5em] uppercase hidden sm:block">Brain v6</div>
        </div>
      </div>

      {/* Primary Control Deck Header */}
      <header className="h-20 md:h-24 glass-panel border-b border-white/5 px-6 md:px-12 flex items-center justify-between shadow-3xl relative z-50 shrink-0 bg-black/40">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-tr from-brand-primary via-indigo-600 to-black rounded-2xl md:rounded-[1.6rem] flex items-center justify-center border border-white/10 shadow-5xl shadow-brand-primary/30 hover:scale-105 transition-transform group">
            <Command className="w-5 h-5 md:w-8 md:h-8 text-black group-hover:rotate-12 transition-transform" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black tracking-tighter text-white italic leading-none">AUTO<span className="text-brand-primary">OS</span></h1>
            <div className="flex gap-2 md:gap-4 mt-1 md:mt-2">
              <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest px-1.5 md:px-2.5 py-0.5 md:py-1 rounded border transition-colors ${session.status === 'connected' ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/30' : 'bg-slate-500/10 text-slate-500 border-white/5'}`}>
                {session.status}
              </span>
              <span className="text-[8px] md:text-[9px] font-mono text-slate-600 tracking-widest hidden sm:inline">REL_6-AUTO</span>
            </div>
          </div>
        </div>

        <div className="hidden xl:flex gap-12 items-center">
           <MetricPill label="Logic Convergence" val={`${session.learningProgress}%`} sub="Brain Maturity" />
           <div className="w-[1px] h-10 bg-white/5" />
           <MetricPill label="Node Mesh" val={queue.filter(j => j.status === 'RUNNING').length.toString()} sub="Active Streams" />
           <div className="w-[1px] h-10 bg-white/5" />
           <MetricPill label="Next Decision" val="T-MINS" sub="Neural Context" />
        </div>
      </header>

      {/* Main Command Stage */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full pb-48 md:pb-64 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'hub' && (
            <motion.div key="hub" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="grid lg:grid-cols-12 gap-6 md:gap-10">
              {/* Autonomous Job Matrix */}
              <section className="lg:col-span-8 space-y-6 md:space-y-8">
                 <div className="flex items-center justify-between px-2 md:px-0">
                    <h3 className="text-[9px] md:text-[11px] font-black uppercase text-slate-600 tracking-[0.2em] md:tracking-[0.4em] flex items-center gap-2 md:gap-3">
                      <Activity className="w-4 h-4 md:w-6 md:h-6 text-brand-primary" /> WORKLOAD MATRIX
                    </h3>
                    <div className="flex gap-4">
                       <span className="text-[8px] md:text-[9px] font-black text-slate-800 uppercase italic">Learning: Active</span>
                    </div>
                 </div>

                 <div className="grid gap-4 md:gap-5">
                    {queue.map(job => (
                      <motion.div 
                        key={job.id} 
                        drag="x"
                        dragConstraints={{ left: -150, right: 150 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                          if (info.offset.x > 80 && (job.status === 'QUEUED' || job.status === 'FAILURE')) {
                            handleGuardedSwipe(job, 'RIGHT');
                          } else if (info.offset.x < -80 && job.status === 'RUNNING') {
                            handleGuardedSwipe(job, 'LEFT');
                          }
                        }}
                        className={`glass-panel p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between group hover:border-brand-primary/50 transition-all bg-white/[0.01] relative overflow-hidden touch-none active:scale-[0.98] ${pendingActions[job.id] ? 'opacity-50 grayscale' : ''}`}
                      >
                         {pendingActions[job.id] && (
                           <div className="absolute inset-0 bg-orange-500/10 flex items-center justify-center backdrop-blur-sm z-10">
                              <span className="text-[10px] font-black text-white italic animate-pulse">PENDING_TERMINATION...</span>
                           </div>
                         )}
                         <div className="absolute top-0 right-0 h-full w-1 flex items-center justify-center bg-red-500/10 opacity-0 group-drag:opacity-100 transition-opacity">
                            <Trash2 className="w-6 h-6 text-red-500" />
                         </div>
                         <div className="absolute top-0 left-0 h-full w-1 flex items-center justify-center bg-brand-primary/10 opacity-0 group-drag:opacity-100 transition-opacity">
                            <Play className="w-6 h-6 text-brand-primary" />
                         </div>
                         
                         <div className="flex items-center gap-6 md:gap-8 mb-6 md:mb-0 w-full md:w-auto">
                            <div className={`w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] flex items-center justify-center transition-all ${job.status === 'RUNNING' || job.status === 'ROUTING' ? 'bg-brand-primary shadow-4xl shadow-brand-primary/40' : 'bg-white/5'}`}>
                               {job.status === 'RUNNING' ? <Activity className="w-7 h-7 md:w-10 md:h-10 text-black animate-pulse" /> : 
                                job.status === 'ROUTING' || job.status === 'ISOLATING' ? <RotateCw className="w-7 h-7 md:w-10 md:h-10 text-black animate-spin" /> :
                                <Play className="w-7 h-7 md:w-10 md:h-10 text-slate-800 group-hover:text-brand-primary" />}
                            </div>
                            <div className="flex-1">
                               <div className="text-lg md:text-2xl font-black text-white italic tracking-tighter mb-1 md:mb-2 group-hover:text-brand-primary transition-colors">{job.name}</div>
                               <div className="flex flex-wrap items-center gap-2 md:gap-5 text-[8px] md:text-[10px] font-mono text-slate-700 uppercase tracking-widest font-black">
                                  <span>{job.id}</span>
                                  <span className="hidden sm:block w-1 md:w-1.5 h-1 md:h-1.5 bg-white/10 rounded-full" />
                                  <span className={job.executor !== 'PENDING' ? 'text-indigo-400' : ''}>{job.executor === 'PENDING' ? 'MAPPING...' : `${job.executor}`}</span>
                                  <span className="hidden sm:block w-1 md:w-1.5 h-1 md:h-1.5 bg-white/10 rounded-full" />
                                  <span className="text-brand-primary">{job.estCost}</span>
                               </div>
                            </div>
                         </div>
                         <div className="flex items-center justify-between md:justify-end gap-6 md:gap-12 w-full md:w-auto pt-6 md:pt-0 border-t md:border-t-0 border-white/5">
                            <div className="text-left md:text-right">
                               <div className={`text-[10px] md:text-[11px] font-black uppercase tracking-widest ${job.status === 'SUCCESS' ? 'text-emerald-500' : job.status === 'RUNNING' || job.status === 'ROUTING' ? 'text-brand-primary' : 'text-slate-700'}`}>{job.status}</div>
                               <div className="text-[8px] md:text-[9px] font-black text-slate-800 uppercase italic mt-1 md:mt-1.5">{job.requirements.vram} GB VRAM</div>
                            </div>
                            <button 
                              onClick={() => routeJob(job.id)}
                              disabled={job.status !== 'QUEUED' && job.status !== 'FAILURE'}
                              className="flex-1 md:flex-none w-auto md:w-40 py-4 md:py-5 bg-white/5 hover:bg-white text-slate-500 hover:text-black rounded-xl md:rounded-2xl font-black text-[10px] md:text-[11px] uppercase tracking-[0.2em] md:tracking-[0.3em] transition-all disabled:opacity-20 shadow-2xl border border-white/5"
                            >
                              START
                            </button>
                         </div>
                      </motion.div>
                    ))}
                 </div>

                 {/* Autonomous Brain Stream */}
                 <div className="space-y-4 md:space-y-6">
                    <div className="flex justify-between items-center px-2 md:px-4">
                       <h3 className="text-[9px] md:text-[11px] font-black uppercase text-slate-600 tracking-[0.2em] md:tracking-[0.4em] flex items-center gap-2 md:gap-3">
                        <TerminalIcon className="w-4 h-4 md:w-6 md:h-6 text-brand-primary" /> STREAM LOG
                      </h3>
                      <button onClick={() => setLogs([])} className="text-[8px] md:text-[9px] font-black uppercase text-slate-800 hover:text-white transition-colors tracking-widest">WIPE</button>
                    </div>
                    <div className="bg-black border-2 border-white/5 rounded-3xl md:rounded-[4.5rem] p-6 md:p-12 font-mono text-[10px] md:text-[12px] h-[350px] md:h-[480px] overflow-y-auto shadow-4xl relative group ring-1 ring-white/5">
                      <div className="sticky top-0 right-0 float-right text-[8px] md:text-[10px] bg-black/80 px-2 py-1 border border-white/10 rounded-lg md:rounded-xl text-brand-primary font-black z-10">FLOW-PRO</div>
                      {logs.map((log, i) => (
                        <div key={i} className={`mb-4 md:mb-5 flex gap-4 md:gap-10 pb-3 md:pb-4 border-b border-white/[0.04] last:border-0 ${i === 0 ? 'text-white' : 'text-slate-600'}`}>
                           <span className="opacity-10 shrink-0 font-black tracking-tight italic text-[9px] md:text-[11px] w-14 md:w-20">{log.timestamp}</span>
                           <div className="flex flex-col gap-1 md:gap-2 flex-1">
                              <div className="flex items-center gap-2 md:gap-4">
                                 <span className={`text-[8px] md:text-[9px] px-1.5 md:px-3 py-0.5 md:py-1 rounded-full font-black italic border ${
                                   log.level === 'CRITICAL' ? 'bg-red-500 text-white border-red-500/50' : 
                                   log.level === 'BRAIN' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-400/30' :
                                   log.level === 'WARN' ? 'bg-orange-600/20 text-orange-600 border-orange-600/30' : 
                                   log.level === 'DEBUG' ? 'bg-slate-800 text-slate-400 border-white/5' :
                                   'bg-brand-primary/10 text-brand-primary border-brand-primary/30'
                                 }`}>
                                   {log.level}
                                 </span>
                                 <span className="text-[8px] md:text-[9px] font-black uppercase text-slate-800 tracking-widest truncate max-w-[100px] md:max-w-none">{log.executor}</span>
                              </div>
                              <span className="leading-relaxed mt-0.5 md:mt-1 text-[11px] md:text-[13px]">{log.msg}</span>
                              {i === 0 && <span className="terminal-cursor w-2 md:w-3 h-3.5 md:h-5 inline-block bg-brand-primary ml-2 shadow-3xl shadow-brand-primary/80" />}
                           </div>
                        </div>
                      ))}
                    </div>
                 </div>
              </section>

              {/* Neural Integrity Dashboard */}
              <aside className="lg:col-span-4 space-y-6 md:space-y-10">
                 <h3 className="text-[9px] md:text-[11px] font-black uppercase text-slate-600 tracking-[0.2em] md:tracking-[0.4em] flex items-center gap-2 md:gap-3 px-2 md:px-0">
                  <Shield className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" /> INTEGRITY PANEL
                </h3>
                <div className="glass-panel p-6 md:p-12 rounded-[2.5rem] md:rounded-[4.5rem] border-white/5 space-y-8 md:space-y-12 bg-gradient-to-b from-white/[0.05] to-transparent shadow-4xl relative overflow-hidden">
                   <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-brand-primary/10 rounded-full blur-3xl" />
                   
                   <div className="grid grid-cols-1 gap-4 md:gap-8">
                      <StateRow label="Executor" val="AUTO" color="text-brand-primary" />
                      <StateRow label="Decision" val="REINFORCED" color="text-indigo-400" />
                      <StateRow label="Mesh" val="99.9%" color="text-emerald-500" />
                   </div>

                   <div className="pt-6 md:pt-12 border-t border-white/10 space-y-6 md:space-y-10">
                      <label className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-slate-700 block">CHECKPOINTS</label>
                      <div className="space-y-5 md:space-y-7">
                        {checkpoints.map(cp => (
                          <div key={cp.id} className="flex items-center gap-4 md:gap-7 group cursor-pointer hover:translate-x-2 transition-transform">
                             <div className="w-10 h-10 md:w-16 md:h-16 bg-white/5 rounded-2xl md:rounded-3xl flex items-center justify-center border border-white/5 group-hover:bg-brand-primary group-hover:text-black transition-all shadow-xl">
                                <Layers className="w-5 h-5 md:w-7 md:h-7" />
                             </div>
                             <div className="flex-1 overflow-hidden">
                                <div className="text-[11px] md:text-[13px] font-black text-white italic group-hover:text-brand-primary transition-colors truncate">{cp.id}</div>
                                <div className="text-[8px] md:text-[10px] font-mono text-slate-700 uppercase font-black tracking-widest truncate">{cp.type}</div>
                             </div>
                             <div className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.7)]" />
                          </div>
                        ))}
                      </div>
                   </div>

                   <div className="pt-6 md:pt-12 border-t border-white/10 space-y-6 md:space-y-10">
                      <MetricBar label="Convergence" percentage={session.learningProgress} color="bg-indigo-500 shadow-indigo-500/20" />
                      <MetricBar label="Throughput" percentage={88} color="bg-brand-primary" />
                   </div>

                   <button onClick={() => addLog('PERSISTENCE: Snapshotting global brain state...', 'BRAIN')} className="w-full py-5 md:py-7 bg-brand-primary text-black font-black uppercase text-[11px] md:text-[13px] tracking-[0.2em] md:tracking-[0.4em] rounded-2xl md:rounded-[2rem] shadow-5xl shadow-brand-primary/40 hover:scale-[1.02] active:scale-95 transition-all">
                     SYNC PERSISTENCE
                   </button>
                </div>
              </aside>
            </motion.div>
          )}

          {activeTab === 'forge' && (
            <motion.div key="forge" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 md:space-y-12 max-w-5xl mx-auto">
               <div className="glass-panel p-8 md:p-20 rounded-[3rem] md:rounded-[5rem] border-brand-primary/10 relative overflow-hidden bg-white/[0.01]">
                  <div className="absolute -top-40 -left-40 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-brand-primary/5 rounded-full blur-[80px] md:blur-[100px]" />
                  <div className="relative z-10 text-center">
                     <Sparkles className="w-12 h-12 md:w-20 md:h-20 text-brand-primary mx-auto mb-8 md:mb-12 animate-pulse" />
                     <h2 className="text-3xl md:text-6xl font-black text-white italic tracking-tighter mb-4 md:mb-6 leading-none uppercase">PIPELINE FORGE</h2>
                     <p className="text-slate-600 text-[9px] md:text-[11px] mb-8 md:mb-16 leading-relaxed font-black uppercase tracking-[0.3em] md:tracking-[0.5em] max-w-2xl mx-auto italic">Hardened & Isolated Orchestration Logic</p>
                     
                     <div className="relative group mb-8 md:mb-12">
                        <textarea 
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="Mission intent..."
                          className="w-full bg-black/80 border-2 border-white/5 rounded-3xl md:rounded-[4rem] p-8 md:p-16 text-white focus:border-brand-primary/30 outline-none transition-all placeholder:text-slate-900 text-sm md:text-base min-h-[250px] md:min-h-[350px] shadow-4xl ring-1 ring-white/10"
                        />
                        <button 
                          onClick={compilePipeline}
                          disabled={isGenerating}
                          className="w-full md:w-auto mt-4 md:absolute md:bottom-12 md:right-12 bg-brand-primary px-8 md:px-16 py-4 md:py-6 rounded-2xl md:rounded-full font-black text-[12px] md:text-[14px] uppercase tracking-widest text-black flex items-center justify-center gap-4 md:gap-5 shadow-4xl shadow-brand-primary/40 hover:bg-white transition-all disabled:opacity-50 active:scale-90"
                        >
                          {isGenerating ? <RotateCw className="w-5 h-5 md:w-7 md:h-7 animate-spin" /> : <Zap className="w-5 h-5 md:w-7 md:h-7" />}
                          {isGenerating ? 'Compiling...' : 'Build Pipeline'}
                        </button>
                     </div>

                     {aiResult && (
                       <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="mt-12 md:mt-20 text-left">
                          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 px-4 md:px-12 gap-4">
                             <span className="text-[10px] md:text-[12px] font-black uppercase text-brand-primary tracking-[0.4em] md:tracking-[0.6em]">Hardened Output // Node-6</span>
                             <button onClick={() => handleCopy('pipeline-v5', aiResult)} className="text-[10px] md:text-[12px] font-black uppercase text-slate-500 hover:text-white flex items-center gap-3 transition-all">
                                <Copy className="w-5 h-5 md:w-6 md:h-6" /> Export Sequence
                             </button>
                          </div>
                          <div className="bg-black border border-white/5 p-8 md:p-16 rounded-[2.5rem] md:rounded-[4rem] font-mono text-[11px] md:text-[13px] text-brand-primary/70 overflow-x-auto shadow-4xl max-h-[400px] md:max-h-[600px] ring-1 ring-white/5 leading-relaxed">
                             {aiResult}
                          </div>
                       </motion.div>
                     )}
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'library' && (
            <motion.div key="library" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 md:space-y-12">
               <div className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-8 gap-4">
                  <h2 className="text-3xl md:text-5xl font-black italic text-white tracking-[0.2em] md:tracking-[0.3em] uppercase">Modules</h2>
                  <div className="bg-white/5 px-6 md:px-8 py-2 md:py-3 rounded-full text-[10px] md:text-[12px] font-black text-slate-700 uppercase tracking-widest border border-white/5 shadow-inner self-start md:self-auto">V6-BRAIN</div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
                  {ELITE_SNIPPETS.map((snippet) => (
                    <div key={snippet.id} className="glass-panel p-8 md:p-12 rounded-[3.5rem] md:rounded-[4.5rem] border-white/5 hover:border-brand-primary/30 transition-all group relative overflow-hidden bg-white/[0.01]">
                       <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-20 transition-opacity">
                         <Layers className="w-24 md:w-40 h-24 md:h-40" />
                       </div>
                       <div className="mb-10 md:mb-14">
                          <div className="flex items-center justify-between mb-8 md:mb-10">
                             <div className="px-4 md:px-6 py-1.5 md:py-2 bg-brand-primary text-black text-[9px] md:text-[11px] font-black uppercase rounded-xl md:rounded-2xl shadow-2xl shadow-brand-primary/30">{snippet.type}</div>
                             <button onClick={() => handleCopy(snippet.id, snippet.code)} className="text-slate-800 hover:text-white transition-all transform hover:scale-125">
                                <Copy className="w-6 h-6 md:w-7 md:h-7" />
                             </button>
                          </div>
                          <h4 className="text-2xl md:text-3xl font-black text-white italic mb-4 md:mb-6 tracking-tighter group-hover:text-brand-primary transition-colors leading-none">{snippet.title}</h4>
                          <p className="text-[10px] md:text-xs text-slate-500 font-black uppercase tracking-widest leading-relaxed mb-8 md:mb-10">{snippet.description}</p>
                       </div>
                       <pre className="bg-black/80 p-8 md:p-10 rounded-3xl md:rounded-[2.5rem] font-mono text-[9px] md:text-[11px] text-slate-700 overflow-hidden h-28 md:h-32 pointer-events-none border border-white/5">
                          {snippet.code.slice(0, 150)}...
                       </pre>
                    </div>
                  ))}
               </div>
            </motion.div>
          )}

          {activeTab === 'system' && (
            <motion.div key="system" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 md:space-y-16 max-w-4xl mx-auto">
               <div className="glass-panel p-10 md:p-24 rounded-[4rem] md:rounded-[6rem] text-center border-white/5 shadow-4xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-20" />
                  <div className="w-20 h-20 md:w-32 md:h-32 bg-white/5 rounded-[2.5rem] md:rounded-[3.5rem] flex items-center justify-center mx-auto mb-12 md:mb-16 shadow-2xl border border-white/[0.02]">
                     <Settings className="w-10 h-10 md:w-16 md:h-16 text-slate-800" />
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-white italic mb-4 md:mb-6 tracking-tighter leading-none">PARAMETERS</h2>
                  <p className="text-[10px] text-brand-primary/60 uppercase tracking-[0.4em] md:tracking-[0.6em] font-black mb-16 md:mb-24 italic">Control Protocol v6</p>
                  
                  <div className="grid gap-6 md:gap-10 text-left">
                     <KernelToggle label="Adaptive Isolation" defaultEnabled />
                     <KernelToggle label="Predictive Resource" defaultEnabled />
                     <KernelToggle label="State Checkpointing" defaultEnabled />
                     <KernelToggle label="Neural Migration" />
                  </div>
               </div>

               <div className="p-8 md:p-14 border-2 border-red-500/20 rounded-[3rem] md:rounded-[5rem] bg-red-500/5 flex flex-col md:flex-row items-center justify-between group overflow-hidden relative backdrop-blur-3xl shadow-4xl gap-8">
                  <div className="relative z-10 text-center md:text-left">
                     <h4 className="text-red-500 font-black text-2xl md:text-3xl italic tracking-tighter leading-none mb-3 md:mb-4 uppercase tracking-widest">Nuke Override</h4>
                     <p className="text-[10px] md:text-[12px] text-red-500/50 font-black uppercase tracking-[0.3em] font-mono">Session & Node Purge</p>
                  </div>
                  <button className="w-full md:w-auto px-12 md:px-16 py-4 md:py-6 bg-red-500 text-white font-black text-[12px] md:text-[14px] uppercase tracking-widest rounded-2xl md:rounded-[2rem] shadow-4xl shadow-red-500/40 hover:bg-white hover:text-black transition-all relative z-10 active:scale-90">TERMINATE</button>
                  <div className="absolute top-0 right-0 p-16 opacity-10 blur-xl">
                     <Shield className="w-48 h-48 text-red-500" />
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Autonomous Navigation Deck */}
      <footer className="fixed bottom-6 md:bottom-14 left-1/2 -translate-x-1/2 w-[92%] md:w-[95%] max-w-3xl h-20 md:h-28 glass-panel border border-white/10 rounded-3xl md:rounded-[5rem] flex items-center justify-around px-4 md:px-12 z-50 shadow-5xl backdrop-blur-3xl ring-2 ring-white/5">
         <NavDeckIcon active={activeTab === 'hub'} onClick={() => setActiveTab('hub')} icon={<Monitor className="w-6 h-6 md:w-10 md:h-10" />} label="Hub" />
         <NavDeckIcon active={activeTab === 'forge'} onClick={() => setActiveTab('forge')} icon={<Sparkles className="w-6 h-6 md:w-10 md:h-10" />} label="Forge" />
         <NavDeckIcon active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={<Code2 className="w-6 h-6 md:w-10 md:h-10" />} label="Modules" />
         <NavDeckIcon active={activeTab === 'system'} onClick={() => setActiveTab('system')} icon={<Settings className="w-6 h-6 md:w-10 md:h-10" />} label="Sys" />
      </footer>

      {/* Floating Orbital Command FAB (Mobile Exclusive Context) */}
      <div className="fixed right-6 bottom-32 md:hidden z-[60]">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setShowOrbital(!showOrbital);
            vibrate(10);
          }}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-5xl border border-white/10 backdrop-blur-2xl transition-all ${showOrbital ? 'bg-white text-black' : 'bg-brand-primary text-black'}`}
        >
          {showOrbital ? <X className="w-8 h-8 font-black" /> : <Plus className="w-8 h-8 font-black" />}
        </motion.button>

        <AnimatePresence>
          {showOrbital && (
            <div className="absolute bottom-20 right-0 flex flex-col gap-4">
              <OrbitalAction icon={<Zap />} label="Run Critical" color="bg-red-500" onClick={() => addLog('AUTONOMOUS: High priority routine initiated via FAB.', 'BRAIN')} />
              <OrbitalAction icon={<RefreshCwIcon className="w-5 h-5" />} label="Resync All" color="bg-indigo-500" onClick={() => addLog('SYNC: Federated nodes resyncing...', 'INFO')} />
              <OrbitalAction icon={<Shield />} label="Hard Isolate" color="bg-emerald-500" onClick={() => addLog('SYSTEM: Forcing hardware isolation...', 'WARN')} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Smart Alert Layer */}
      <div className="fixed top-12 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-[100] pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div 
              key={n.id}
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`mb-4 p-4 rounded-2xl border flex items-center gap-4 shadow-5xl backdrop-blur-3xl pointer-events-auto ${
                n.type === 'ERROR' ? 'bg-red-500/20 border-red-500/30 text-white' :
                n.type === 'SUCCESS' ? 'bg-emerald-500/20 border-emerald-500/30 text-white' :
                n.type === 'WARN' ? 'bg-orange-500/20 border-orange-500/30 text-white' :
                'bg-white/10 border-white/10 text-white'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                 n.type === 'ERROR' ? 'bg-red-500' :
                 n.type === 'SUCCESS' ? 'bg-emerald-500' :
                 n.type === 'WARN' ? 'bg-orange-500' :
                 'bg-white/20'
              }`}>
                {n.type === 'SUCCESS' ? <CheckCircle className="w-5 h-5 text-black" /> : 
                 n.type === 'ERROR' ? <XCircle className="w-5 h-5 text-black" /> :
                 <Bell className="w-5 h-5 text-black" />}
              </div>
              <div className="flex-1 overflow-hidden">
                <span className="text-[12px] font-black uppercase tracking-widest block truncate">{n.msg}</span>
              </div>
              {n.action && (
                <button 
                  onClick={() => {
                    n.action?.onUndo();
                    setNotifications(prev => prev.filter(nn => nn.id !== n.id));
                  }}
                  className="px-4 py-2 bg-white text-black font-black text-[10px] rounded-lg tracking-widest active:scale-90 transition-transform"
                >
                  {n.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function OrbitalAction({ icon, label, color, onClick }: { icon: ReactNode, label: string, color: string, onClick: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center gap-4 justify-end group"
    >
      <span className="text-[10px] font-black text-white bg-black/80 px-3 py-1 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">{label}</span>
      <button 
        onClick={onClick}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white border border-white/10 shadow-4xl active:scale-90 transition-transform ${color}`}
      >
        {icon}
      </button>
    </motion.div>
  );
}

function RefreshCwIcon({ className }: { className?: string }) {
  return <RotateCw className={className} />;
}

function KernelStatus({ label, val, color, className }: { label: string, val: string, color?: string, className?: string }) {
  return (
    <div className={`flex items-center gap-2 md:gap-3 cursor-default group select-none ${className}`}>
      <span className="text-[9px] md:text-[11px] font-mono font-black text-slate-700 uppercase italic tracking-tighter group-hover:text-slate-500 transition-colors">{label}:</span>
      <span className={`text-[9px] md:text-[11px] font-mono font-black uppercase transition-all tracking-widest ${color || 'text-slate-500'}`}>{val}</span>
    </div>
  );
}

function MetricPill({ label, val, sub }: { label: string, val: string, sub: string }) {
  return (
    <div className="flex flex-col items-end group cursor-default select-none">
       <span className="text-[11px] font-black uppercase text-slate-700 leading-none mb-2 tracking-widest group-hover:text-slate-500 transition-colors">{label}</span>
       <span className="text-3xl font-mono font-black leading-none text-white italic tracking-tighter shadow-brand-primary/10">{val}</span>
       <span className="text-[10px] font-black text-brand-primary uppercase tracking-tighter mt-1.5 opacity-60 italic">{sub}</span>
    </div>
  );
}

function StateRow({ label, val, color }: { label: string, val: string, color?: string }) {
  return (
    <div className="flex items-center justify-between group cursor-default">
      <span className="text-[12px] font-black text-slate-600 uppercase tracking-[0.4em] group-hover:text-slate-400 transition-colors">{label}</span>
      <span className={`text-[12px] font-mono font-black tracking-widest ${color || 'text-white'}`}>{val}</span>
    </div>
  );
}

function MetricBar({ label, percentage, color }: { label: string, percentage: number, color: string }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.3em] font-mono">
        <span className="text-slate-600 italic">{label}</span>
        <span className="text-white">{percentage}%</span>
      </div>
      <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/[0.05] shadow-inner">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color} shadow-[0_0_20px_rgba(255,255,255,0.1)]`} 
        />
      </div>
    </div>
  );
}

function KernelToggle({ label, defaultEnabled }: { label: string, defaultEnabled?: boolean }) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  return (
    <button onClick={() => setEnabled(!enabled)} className="w-full flex items-center justify-between p-6 md:p-10 bg-white/[0.02] rounded-[2.5rem] md:rounded-[3.5rem] border border-white/5 group hover:bg-white/[0.04] transition-all shadow-xl">
      <span className="text-[14px] md:text-[18px] font-black text-slate-500 group-hover:text-brand-primary transition-colors italic tracking-tight">{label}</span>
      <div className={`w-14 md:w-20 h-7 md:h-10 rounded-full relative transition-all duration-700 ${enabled ? 'bg-brand-primary/20 shadow-inner border border-brand-primary/20' : 'bg-slate-900 border border-white/10'}`}>
        <motion.div 
          animate={{ x: enabled ? (typeof window !== 'undefined' && window.innerWidth < 768 ? 28 : 44) : 4 }}
          className={`absolute top-1 md:top-1.5 w-5 md:w-7 h-5 md:h-7 rounded-full shadow-4xl ${enabled ? 'bg-brand-primary shadow-brand-primary' : 'bg-slate-700'}`} 
        />
      </div>
    </button>
  );
}

function NavDeckIcon({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: ReactNode, label: string }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 md:gap-4 transition-all w-16 md:w-28 group ${active ? 'text-brand-primary' : 'text-slate-700'}`}>
      <div className={`p-3 md:p-6 rounded-2xl md:rounded-[2.8rem] transition-all duration-700 relative ${active ? 'bg-brand-primary text-black shadow-5xl shadow-brand-primary/60 -translate-y-6 md:-translate-y-12 rotate-[12deg] md:rotate-[15deg] scale-110 md:scale-125' : 'hover:bg-white/5 active:scale-95 opacity-40 group-hover:opacity-100 hover:-translate-y-1 md:hover:-translate-y-3'}`}>
        {icon}
        {active && <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-10 md:w-16 h-4 md:h-6 bg-black/40 rounded-full blur-2xl md:blur-3xl" />}
      </div>
      <span className={`text-[8px] md:text-[12px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] transition-all duration-700 ${active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 md:translate-y-8'}`}>{label}</span>
    </button>
  );
}

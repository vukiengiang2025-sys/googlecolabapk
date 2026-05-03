/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ReactNode, useMemo } from 'react';
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
  level: 'THÔNG_TIN' | 'THÀNH_CÔNG' | 'CẢNH_BÁO' | 'LỖI' | 'NGHIÊM_TRỌNG' | 'GỠ_LỖI' | 'BỘ_NÃO' | 'NHÂN';
  msg: string;
  executor?: string;
}

interface JobRequirements {
  vram: number;
  priority: 'KHẨN_CẤP' | 'CAO' | 'TRUNG_BÌNH' | 'THẤP';
  latency: 'THỜI_GIAN_THỰC' | 'LÔ';
}

interface Job {
  id: string;
  name: string;
  requirements: JobRequirements;
  status: 'CHỜ_DUYỆT' | 'XẾP_HÀNG' | 'ĐANG_ĐIỀU_PHỐI' | 'ĐANG_CÔ_LẬP' | 'ĐANG_CHẠY' | 'THÀNH_CÔNG' | 'LỖI';
  executor: 'ĐANG_CHỜ' | 'COLAB' | 'REMOTE' | 'EDGE';
  estCost: string;
  retries: number;
  waitTicks?: number;
  reservedAt?: number;
  cost?: number;
  metrics?: {
    throughput: string;
    nodeId: string;
    startTime: number;
    tokens?: number;
  };
}

interface CacheEntry {
  data: string;
  timestamp: number;
  latency: number;
  lastAccessed: number;
  tokens: number;
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
  cpuLoad: number;
  temp: number;
  latency: number;
}

const HAPTIC = {
  SUCCESS: [50, 30, 50],
  ERROR: [150],
  WARN: [100, 30],
  RUN: [30],
  NEURAL: [10],
  CRITICAL: [200, 50, 200]
};

const SCHEDULER_CONFIG = {
  TOTAL_CAPACITY: 100,
  PRIORITY_WEIGHTS: {
    KHẨN_CẤP: 250, 
    CAO: 100,
    TRUNG_BÌNH: 40,
    THẤP: 15
  },
  QUOTAS: {
    MAX_CRITICAL: 0.85,
    RESERVED_LOW: 10,
    BACKPRESSURE_THRESHOLD: 18 // Giới hạn mềm cho hàng đợi
  },
  HYSTERESIS: {
    HOT: 88,
    WARM: 68,
    FACTOR: 0.4,
    RAMP_RATE: 0.1 // Tốc độ hồi phục mỗi chu kỳ
  },
  RESERVATION: {
    WINDOW_RU: 55,
    TIMEOUT_TICKS: 15
  },
  AGING: {
    FACTOR: 10,
    CAP: 140
  },
  NETWORK: {
    WINDOW_SIZE: 20,
    DEFAULT_OVERHEAD: 180,
    MAD_THRESHOLD: 2.5 // Loại bỏ nhiễu > 2.5 * MAD
  }
};

// EMA Alpha for smoothing metrics
const SMOOTHING_ALPHA = 0.3;

export default function App() {
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('gemini_api_key') || "");

  const ai = useMemo(() => {
    const key = (userApiKey || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '') || "").trim();
    if (!key || key === "MY_GEMINI_API_KEY") return null;
    try {
      return new GoogleGenAI({ apiKey: key });
    } catch (e) {
      console.error("Neural initialization failed:", e);
      return null;
    }
  }, [userApiKey]);

  useEffect(() => {
    const envKey = typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '';
    if (!userApiKey && (!envKey || envKey === "MY_GEMINI_API_KEY")) {
      console.warn("CẢNH BÁO: Thiếu GEMINI_API_KEY. Vui lòng thiết lập biến môi trường hoặc nhập key trong tab Hệ thống.");
    }
  }, [userApiKey]);

  const [activeTab, setActiveTab] = useState<'hub' | 'forge' | 'library' | 'system'>('hub');
  const [showOrbital, setShowOrbital] = useState(false);
  const [notifications, setNotifications] = useState<OSNotification[]>([]);
  const [pendingActions, setPendingActions] = useState<Record<string, any>>({});
  
  const [neuralCache, setNeuralCache] = useState<Record<string, CacheEntry>>(() => {
    try {
      const saved = localStorage.getItem('elite_neural_cache');
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      
      const now = Date.now();
      const filtered: Record<string, CacheEntry> = {};
      
      // Sort by lastAccessed for LRU logic on boot if we exceed capacity
      const entries = Object.entries(parsed).sort((a: any, b: any) => b[1].lastAccessed - a[1].lastAccessed);
      const MAX_ENTRIES = 50;

      entries.forEach(([key, val], idx) => {
        const entry = val as CacheEntry;
        if (now - entry.timestamp < 86400000 && idx < MAX_ENTRIES) {
          filtered[key] = entry;
        }
      });
      return filtered;
    } catch {
      return {};
    }
  });

  const [session, setSession] = useState<SessionState>(() => {
    const defaults = {
      status: 'đã kết nối',
      vramLoad: 12,
      activeExecutor: 'TỰ_HÀNH',
      predictiveAlert: false,
      learningProgress: 76,
      cpuLoad: 24,
      temp: 42,
      latency: 18
    };
    try {
      const saved = localStorage.getItem('elite_session');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    localStorage.setItem('elite_neural_cache', JSON.stringify(neuralCache));
  }, [neuralCache]);
  
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('elite_logs');
      return saved ? JSON.parse(saved) : [
        { timestamp: new Date().toLocaleTimeString(), level: 'NHÂN', msg: 'Nhân hệ thống v6.8.2 đã kích hoạt. Bảo vệ bộ nhớ đang hoạt động.' },
        { timestamp: new Date().toLocaleTimeString(), level: 'BỘ_NÃO', msg: 'Elite OS v6.0 Bộ não Tự hành đã khởi tạo.' }
      ];
    } catch {
      return [];
    }
  });

  const [queue, setQueue] = useState<Job[]>(() => {
    try {
      const saved = localStorage.getItem('elite_queue');
      return saved ? JSON.parse(saved) : [
        { id: 'J-601', name: 'Chưng cất Mô hình Toàn cầu', requirements: { vram: 40, priority: 'KHẨN_CẤP', latency: 'LÔ' }, status: 'XẾP_HÀNG', executor: 'ĐANG_CHỜ', estCost: '0.00$', retries: 0 },
        { id: 'J-602', name: 'Suy luận Thời gian thực', requirements: { vram: 4, priority: 'CAO', latency: 'THỜI_GIAN_THỰC' }, status: 'XẾP_HÀNG', executor: 'ĐANG_CHỜ', estCost: '0.00$', retries: 0 },
        { id: 'J-603', name: 'Phân mảnh Dữ liệu', requirements: { vram: 8, priority: 'THẤP', latency: 'LÔ' }, status: 'THÀNH_CÔNG', executor: 'COLAB', estCost: '0.01$', retries: 0 }
      ];
    } catch {
      return [];
    }
  });

  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [isThrottled, setIsThrottled] = useState(false);
  const [recoveryRamp, setRecoveryRamp] = useState(1.0);

  useEffect(() => {
    if (isThrottled) {
      setRecoveryRamp(SCHEDULER_CONFIG.HYSTERESIS.FACTOR);
    } else if (recoveryRamp < 1.0) {
      // Gradual recovery to prevent oscillation
      const timer = setTimeout(() => {
        setRecoveryRamp(prev => Math.min(1.0, prev + SCHEDULER_CONFIG.HYSTERESIS.RAMP_RATE));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isThrottled, recoveryRamp]);

  // v6.0 Robust Network Telemetry using MAD (Median Absolute Deviation)
  const networkOverhead = useMemo(() => {
    if (latencyHistory.length < 3) return SCHEDULER_CONFIG.NETWORK.DEFAULT_OVERHEAD;
    
    const sorted = [...latencyHistory].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    // Calculate MAD
    const deviations = sorted.map(v => Math.abs(v - median)).sort((a, b) => a - b);
    const mad = deviations[Math.floor(deviations.length / 2)];
    const threshold = Math.max(50, mad * SCHEDULER_CONFIG.NETWORK.MAD_THRESHOLD);
    
    // Filter outliers and return mean of valid points
    const validPoints = sorted.filter(v => Math.abs(v - median) <= threshold);
    return validPoints.length > 0 
      ? validPoints.reduce((a, b) => a + b, 0) / validPoints.length 
      : median;
  }, [latencyHistory]);

  useEffect(() => {
    if (session.temp > SCHEDULER_CONFIG.HYSTERESIS.HOT) setIsThrottled(true);
    if (session.temp < SCHEDULER_CONFIG.HYSTERESIS.WARM) setIsThrottled(false);
  }, [session.temp]);

  useEffect(() => {
    const activeJobs = queue.filter(j => j.status === 'ĐANG_CHẠY' || j.status === 'ĐANG_ĐIỀU_PHỐI' || j.status === 'ĐANG_CÔ_LẬP');
    const queuedJobs = queue.filter(j => j.status === 'XẾP_HÀNG');
    
    // v6.5 Bộ điều tốc công suất nâng cao
    const currentCapacity = SCHEDULER_CONFIG.TOTAL_CAPACITY * recoveryRamp;
    
    const currentLoad = activeJobs.reduce((acc, curr) => acc + (curr.cost || 20), 0);
    const criticalLoad = activeJobs.filter(j => j.requirements.priority === 'CRITICAL')
                                  .reduce((acc, curr) => acc + (curr.cost || 20), 0);

    if (queuedJobs.length > 0) {
      // v6.5 Điểm số lũy tiến (Age-Cap Aware)
      const scoredQueue = queuedJobs.map(j => {
        const bonus = Math.min(SCHEDULER_CONFIG.AGING.CAP, Math.log2(1 + (j.waitTicks || 0)) * SCHEDULER_CONFIG.AGING.FACTOR);
        const score = SCHEDULER_CONFIG.PRIORITY_WEIGHTS[j.requirements.priority] + bonus;
        return { ...j, score };
      }).sort((a, b) => b.score - a.score);

      const nextJob = scoredQueue[0];
      const nextJobCost = nextJob.cost || 20;

      // Admission 6.5: Quota Dự báo + Reservation Sâu
      const availableRU = currentCapacity - currentLoad;
      const isCriticalCapped = nextJob.requirements.priority === 'KHẨN_CẤP' && 
                               (criticalLoad + nextJobCost) > (currentCapacity * SCHEDULER_CONFIG.QUOTAS.MAX_CRITICAL);

      // Cửa sổ giữ chỗ sâu: Tìm các tác vụ quan trọng lớn trong hàng đợi
      const lookaheadDepth = Math.min(10, 5 + Math.floor(queuedJobs.length / 4));
      const pendingLargeCritical = scoredQueue.slice(0, lookaheadDepth).some(j => (j.cost || 0) > 40 && j.requirements.priority === 'KHẨN_CẤP');
      const isReserved = pendingLargeCritical && nextJob.requirements.priority !== 'KHẨN_CẤP' && availableRU < SCHEDULER_CONFIG.RESERVATION.WINDOW_RU;

      if (availableRU >= nextJobCost && !isCriticalCapped && !isReserved) {
        handlePipeline(nextJob.id); 
      } else {
        // Lấp đầy (Backfilling): Chỉ chạy nếu tải thấp hoặc job cực nhẹ
        const backfillJob = scoredQueue.find(j => 
          (j.cost || 0) <= Math.min(12, availableRU * 0.5) && 
          j.requirements.priority !== 'KHẨN_CẤP'
        );

        if (backfillJob && !isReserved) {
          handlePipeline(backfillJob.id);
        } else {
          // Tăng chu kỳ chờ cho các job đang xếp hàng
          setQueue(prev => prev.map(j => (j.status === 'XẾP_HÀNG' ? { ...j, waitTicks: (j.waitTicks || 0) + 1 } : j)));
        }
      }
    }

    const activeVram = activeJobs.reduce((acc, curr) => acc + curr.requirements.vram, 0);
    
    setSession(prev => {
      const baseCpu = 2 + (Math.random() * 2);
      const workloadCpu = activeJobs.reduce((acc, curr) => {
        const priorityWeight = curr.requirements.priority === 'CRITICAL' ? 1.6 : 1.0;
        const currentTokens = curr.metrics?.tokens || 500;
        return acc + (currentTokens / 150) + (curr.requirements.vram * 0.2 * priorityWeight);
      }, 0);
      
      const newCpu = Math.min(100, baseCpu + workloadCpu);
      const targetTemp = 32 + (newCpu * 0.4) + (activeVram * 0.04);
      const newTemp = prev.temp * (1 - SMOOTHING_ALPHA) + targetTemp * SMOOTHING_ALPHA;
      const newVram = Math.min(100, 5 + (activeVram * 1.25) + (activeJobs.length * 1.5)); 
      
      return { 
        ...prev, 
        vramLoad: newVram, 
        cpuLoad: newCpu,
        temp: newTemp,
        predictiveAlert: newCpu > 85 || newTemp > 80 
      };
    });
  }, [queue, isThrottled]);

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
      setSession(prev => ({ ...prev, status: 'đã kết nối' }));
      addLog('Đường truyền đã đồng bộ với Cụm thời gian chạy Liên bang.', 'THÔNG_TIN', 'NHÂN-LBB');
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const addLog = (msg: string, level: LogEntry['level'] = 'THÔNG_TIN', executor: string = 'BỘ_NÃO') => {
    const entry: LogEntry = { timestamp: new Date().toLocaleTimeString(), level, msg, executor };
    setLogs(prev => [entry, ...prev].slice(0, 50));
    
    if (level === 'LỖI' || level === 'NGHIÊM_TRỌNG') {
      triggerNotification(msg, 'ERROR');
      vibrate(HAPTIC.ERROR);
    } else if (level === 'BỘ_NÃO') {
      vibrate(HAPTIC.NEURAL);
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

  const nukeSession = () => {
    vibrate(HAPTIC.CRITICAL);
    localStorage.clear();
    setSession({ 
      status: 'đã kết nối', 
      vramLoad: 12, 
      activeExecutor: 'TỰ_HÀNH', 
      predictiveAlert: false, 
      learningProgress: 76,
      cpuLoad: 24,
      temp: 42,
      latency: 18
    });
    setQueue([]);
    setLogs([{ timestamp: new Date().toLocaleTimeString(), level: 'NGHIÊM_TRỌNG', msg: 'KHẨN CẤP HỆ THỐNG: Giao thức Hủy diệt đã thực thi. Tất cả các nút đã được dọn sạch.' }]);
    triggerNotification('HỆ THỐNG ĐÃ ĐƯỢC DỌN SẠCH', 'ERROR');
  };

  const optimizeKernel = () => {
    vibrate(HAPTIC.NEURAL);
    addLog('NHÂN: Đang khởi tạo hồi phục tài nguyên dự báo...', 'NHÂN');
    
    setTimeout(() => {
      setQueue(prev => {
        const kept = prev.filter(j => j.status !== 'THÀNH_CÔNG' && j.status !== 'LỖI');
        
        // Tiered Resource Protection Logic
        if (session.cpuLoad > 80) {
          addLog('NHÂN: Tải > 80%. Đang loại bỏ các nút ưu tiên THẤP.', 'CẢNH_BÁO');
          return kept.filter(j => j.requirements.priority !== 'THẤP' || j.status !== 'ĐANG_CHẠY');
        }
        if (session.cpuLoad > 90) {
          addLog('NHÂN: Tải > 90%. Dọn dẹp khẩn cấp các nút ưu tiên TRUNG_BÌNH.', 'NGHIÊM_TRỌNG');
          return kept.filter(j => j.requirements.priority === 'KHẨN_CẤP' || j.status !== 'ĐANG_CHẠY');
        }
        
        return kept;
      });

      setSession(prev => ({ 
        ...prev, 
        learningProgress: Math.min(100, prev.learningProgress + 3),
        cpuLoad: Math.max(5, prev.cpuLoad * 0.5) // Instant relief
      }));
      addLog('NHÂN: Tập lệnh đã được song song hóa. Các bể tài nguyên đã bình thường hóa.', 'THÀNH_CÔNG');
      triggerNotification('Nhân v3 đã tối ưu', 'SUCCESS');
    }, 1200);
  };

  const flushCache = () => {
    vibrate(HAPTIC.WARN);
    addLog('BỘ_NÃO: Đang dọn sạch bộ nhớ đệm thần kinh và ngăn xếp gỡ lỗi...', 'BỘ_NÃO');
    setTimeout(() => {
      setNeuralCache({});
      setLogs(prev => prev.filter(l => l.level !== 'GỠ_LỖI'));
      addLog('BỘ_NÃO: Bộ nhớ đệm thần kinh đã vô hiệu. Còn lại 0 mục.', 'THÔNG_TIN');
      triggerNotification('Đã xóa bộ nhớ đệm', 'INFO');
    }, 1000);
  };

  const removeJob = (id: string) => {
    setQueue(prev => prev.filter(j => j.id !== id));
    addLog(`GIÁM_SÁT_OS: Tác vụ ${id} đã bị dọn sạch khỏi ma trận.`, 'THÔNG_TIN');
  };

  const handleGuardedSwipe = (job: Job, direction: 'LEFT' | 'RIGHT') => {
    if (job.requirements.priority === 'KHẨN_CẤP' && direction === 'LEFT') {
      vibrate(HAPTIC.CRITICAL);
      triggerNotification(`Khóa hệ thống: Tác vụ KHẨN CẤP ${job.id} không thể chấm dứt thủ công.`, 'ERROR');
      return;
    }

    if (direction === 'RIGHT') {
      vibrate(HAPTIC.RUN);
      if (job.status === 'THÀNH_CÔNG' || job.status === 'LỖI') {
         // Cycle back to queued
         setQueue(prev => prev.map(j => j.id === job.id ? { ...j, status: 'XẾP_HÀNG', executor: 'ĐANG_CHỜ' } : j));
         addLog(`THỬ_LẠI: Đang xếp hàng lại ${job.id} cho vòng đời mới.`, 'THÔNG_TIN');
      } else {
         handlePipeline(job.id);
      }
    } else {
      // Guarded Kill with Undo
      const timeoutId = setTimeout(() => {
        if (job.status === 'THÀNH_CÔNG' || job.status === 'LỖI' || job.status === 'XẾP_HÀNG') {
          removeJob(job.id);
        } else {
          cancelJob(job.id);
        }
        setPendingActions(prev => {
          const next = { ...prev };
          delete next[job.id];
          return next;
        });
      }, 5000);

      setPendingActions(prev => ({ ...prev, [job.id]: timeoutId }));
      vibrate(HAPTIC.WARN);
      const actionLabel = (job.status === 'THÀNH_CÔNG' || job.status === 'LỖI' || job.status === 'XẾP_HÀNG') ? 'DỌN SẠCH' : 'CHẤM DỨT';
      triggerNotification(`Đang chờ ${actionLabel}: ${job.name}...`, 'WARN', {
        label: 'HOÀN TÁC',
        onUndo: () => {
          clearTimeout(timeoutId);
          setPendingActions(prev => {
            const next = { ...prev };
            delete next[job.id];
            return next;
          });
          vibrate(HAPTIC.SUCCESS);
          addLog(`GIÁM_SÁT_OS: ${actionLabel} đã bị hủy bỏ cho ${job.id}.`, 'THÔNG_TIN');
        }
      });
    }
  };

  const pushToQueue = (taskName: string, config: { priority: JobRequirements['priority'], vram: number }) => {
    // Backpressure v6.5: Cảnh báo theo tầng
    const queuedCount = queue.filter(j => j.status === 'XẾP_HÀNG').length;
    const isSaturated = queuedCount >= 18;
    const isCriticalSaturated = queuedCount >= 25;
    
    // Ước lượng ETA v6.5 (Dựa trên RU và throughput trung bình)
    const totalPendingRU = queue.filter(j => j.status === 'XẾP_HÀNG' || j.status === 'ĐANG_CHẠY')
                               .reduce((acc, curr) => acc + (curr.cost || 20), 0);
    const etaSeconds = Math.round(totalPendingRU / 12); 

    const id = `TX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const contextEst = Math.floor(taskName.length / 4);
    const priorityBase = SCHEDULER_CONFIG.PRIORITY_WEIGHTS[config.priority];
    const cost = (config.vram * 1.5) + (priorityBase * 0.2) + contextEst;

    const newJob: Job = {
      id,
      name: taskName,
      status: 'XẾP_HÀNG',
      requirements: { ...config, latency: config.vram > 16 ? 'LÔ' : 'THỜI_GIAN_THỰC' },
      executor: 'ĐANG_CHỜ',
      estCost: `${(cost / 50).toFixed(2)}$`,
      retries: 0,
      cost,
      waitTicks: 0
    };
    
    setQueue(prev => [newJob, ...prev]);
    
    if (isCriticalSaturated) {
      addLog(`QUÁ_TẢI_NGHIÊM_TRỌNG: Hàng chờ vượt ngưỡng an toàn. ETA: ${etaSeconds}s.`, 'NGHIÊM_TRỌNG', 'HỆ_THỐNG');
      triggerNotification(`Hệ thống bão hòa: ETA ${etaSeconds}s`, 'ERROR');
    } else if (isSaturated) {
      addLog(`CẢNH_BÁO_ÁP_LỰC: Tải cao. Hàng chờ: ${queuedCount}. ETA dự kiến: ${etaSeconds}s.`, 'CẢNH_BÁO', 'HỆ_THỐNG');
      triggerNotification(`Tải hệ thống cao: ETA ${etaSeconds}s`, 'WARN');
    } else {
      addLog(`ĐIỀU_PHỐI: Tác vụ ${id} đã đăng ký. Độ phức tạp: ${cost.toFixed(0)} RU.`, 'THÔNG_TIN');
      triggerNotification(`Đã xếp hàng: ${id}`, 'INFO');
    }
  };

  const handlePipeline = (id: string) => {
    setQueue(prev => {
      const job = prev.find(j => j.id === id);
      if (!job || job.status !== 'XẾP_HÀNG') return prev;

      addLog(`ĐIỀU_PHỐI: Đang phân bổ tài nguyên cho ${id}...`, 'BỘ_NÃO');
      
      setTimeout(() => {
        setQueue(q => {
          const currentJob = q.find(j => j.id === id);
          if (!currentJob) return q;

          let selectedNode: Job['executor'] = 'COLAB';
          let cost = '0.02$';
          const nodeId = `NODE-${selectedNode}-${Math.floor(Math.random() * 99)}`;

          if (currentJob.requirements.vram > 16 || currentJob.requirements.priority === 'KHẨN_CẤP') {
            selectedNode = 'REMOTE';
            cost = '1.25$';
          }

          addLog(`QUYẾT_ĐỊNH: Điều hướng ${id} tới cụm ${selectedNode}. NodeID: ${nodeId}`, 'BỘ_NÃO');
          executeJob(id, selectedNode, nodeId);
          return q.map(j => j.id === id ? { ...j, executor: selectedNode, status: 'ĐANG_CÔ_LẬP', estCost: cost, metrics: { throughput: 'Đang tính...', nodeId, startTime: Date.now(), tokens: 0 } } : j);
        });
      }, 1500);

      return prev.map(j => j.id === id ? { ...j, status: 'ĐANG_ĐIỀU_PHỐI' } : j);
    });
  };

  const addJob = () => {
    const names = ['Di cư Thần kinh', 'Định hình lại Trọng số', 'Tiêm Ngữ cảnh', 'Ổn định Lớp', 'Tinh chỉnh Hướng dẫn'];
    const priorities: JobRequirements['priority'][] = ['THẤP', 'TRUNG_BÌNH', 'CAO', 'KHẨN_CẤP'];
    
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const vram = priority === 'KHẨN_CẤP' ? 24 : priority === 'CAO' ? 16 : 8;
    
    pushToQueue(names[Math.floor(Math.random() * names.length)], { vram, priority });
    vibrate(HAPTIC.NEURAL);
  };

  const executeJob = (id: string, executor: Job['executor'], nodeId: string) => {
    addLog(`KHỞI_TẠO: Giai đoạn cô lập đang hoạt động trên ${executor} (${nodeId}).`, 'GỠ_LỖI', executor);
    vibrate(HAPTIC.RUN);

    setTimeout(() => {
      setQueue(prev => {
        const currentJob = prev.find(j => j.id === id);
        if (!currentJob || currentJob.status !== 'ĐANG_CÔ_LẬP') return prev;

        addLog(`ĐANG_CHẠY: Thực thi tự hành đang hoạt động trên ${nodeId}`, 'THÔNG_TIN', executor);
        
        const streamInterval = setInterval(() => {
          setQueue(q => {
            const sj = q.find(job => job.id === id);
            if (!sj || sj.status !== 'ĐANG_CHẠY') {
              clearInterval(streamInterval);
              return q;
            }
            const duration = (Date.now() - sj.metrics!.startTime) / 1000;
            const computeTime = Math.max(0.01, duration - (networkOverhead / 1000));
            const baseTps = executor === 'REMOTE' ? 130 : 60;
            const loadFactor = 1 - (session.cpuLoad / 400); 
            const currentTps = Math.floor(baseTps * loadFactor * (0.9 + Math.random() * 0.2));
            const throughput = `${currentTps} tok/s`;
            
            return q.map(j => j.id === id ? { ...j, metrics: { 
              ...j.metrics!, 
              throughput, 
              tokens: Math.floor(currentTps * computeTime) 
            } } : j);
          });
        }, 5000);

        setTimeout(() => {
          setQueue(finalQueue => {
            const finalJob = finalQueue.find(j => j.id === id);
            if (!finalJob || finalJob.status !== 'ĐANG_CHẠY') return finalQueue;

            clearInterval(streamInterval);
            addLog(`THÀNH_CÔNG: ${id} hoàn tất. Tối ưu hóa toàn bộ các nút.`, 'THÀNH_CÔNG', executor);
            triggerNotification(`Tác vụ ${id} hoàn tất.`, 'SUCCESS');
            vibrate(HAPTIC.SUCCESS);
            setSession(s => ({ ...s, learningProgress: Math.min(100, s.learningProgress + 2) }));
            return finalQueue.map(j => j.id === id ? { ...j, status: 'THÀNH_CÔNG' } : j);
          });
        }, 15000);

        return prev.map(j => j.id === id ? { ...j, status: 'ĐANG_CHẠY' } : j);
      });
    }, 1500);
  };

  const createJob = (name: string, vram = 8, priority: JobRequirements['priority'] = 'THẤP') => {
    const id = `J-${Math.floor(Math.random() * 900) + 100}`;
    const priorityBase = SCHEDULER_CONFIG.PRIORITY_WEIGHTS[priority];
    const cost = (vram * 1.5) + (priorityBase * 0.2) + 5;
    
    const newJob: Job = {
      id,
      name,
      requirements: { vram, priority, latency: vram > 16 ? 'LÔ' : 'THỜI_GIAN_THỰC' },
      status: 'XẾP_HÀNG',
      executor: 'ĐANG_CHỜ',
      estCost: `${(cost / 50).toFixed(2)}$`,
      retries: 0,
      cost,
      waitTicks: 0
    };
    setQueue(prev => [newJob, ...prev]);
    addLog(`HỆ_THỐNG: Nút thủ công đã đăng ký: ${id}. Tải: ${cost.toFixed(0)} RU.`, 'THÔNG_TIN');
    triggerNotification(`Đã tạo Tác vụ Mới: ${id}`, 'SUCCESS');
    vibrate(HAPTIC.SUCCESS);
  };

  const cancelJob = (id: string) => {
    setQueue(prev => prev.map(j => j.id === id ? { ...j, status: 'LỖI' } : j));
    addLog(`HỆ_THỐNG: Đã xác nhận chấm dứt thủ công tác vụ ${id}.`, 'CẢNH_BÁO', 'NGƯỜI_DÙNG');
    vibrate(HAPTIC.ERROR);
  };

  const compilePipeline = async () => {
    if (!prompt.trim()) return;

      // Kiểm tra bộ nhớ đệm thần kinh (Cân nhắc ngữ cảnh)
      if (neuralCache[prompt]) {
        const entry = neuralCache[prompt];
        const hitLatency = 3 + Math.floor(Math.random() * 5);
        addLog(`BỘ_NÃO: Bộ nhớ trùng khớp. Đang tái hiện ${entry.tokens} tokens từ trọng số nóng.`, 'THÀNH_CÔNG');
        vibrate(HAPTIC.SUCCESS);
        
        setNeuralCache(prev => ({
          ...prev,
          [prompt]: { ...entry, lastAccessed: Date.now() }
        }));

        setAiResult(entry.data);
        setSession(prev => ({ ...prev, latency: hitLatency })); 
        setPrompt('');
        return;
      }

    setIsGenerating(true);
    const startTime = Date.now();
    addLog('TRÌNH_BIÊN_DỊCH: Đang dệt các hướng dẫn thần kinh thích ứng...', 'BỘ_NÃO');
    
    if (!ai) {
      triggerNotification("Thiếu API Key. Vui lòng nhập Key trong tab Hệ thống.", "ERROR");
      vibrate(HAPTIC.ERROR);
      setIsGenerating(false);
      return;
    }

    try {
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `Thiết kế một script Python AI Tự hành & Liên bang cho: ${prompt}. CHỈ XUẤT MÃ NGUỒN THUẦN.` }] }],
      });
      
      const response = await result.response;
      const latency = Date.now() - startTime;
      const code = response.text().replace(/```[a-z]*\n|```/g, '') || "";
      
      setLatencyHistory(prev => {
        const next = [latency, ...prev].slice(0, SCHEDULER_CONFIG.NETWORK.WINDOW_SIZE);
        return next;
      });

      const complexity = Math.floor(code.length / 4);
      const computeLatency = Math.max(50, latency - networkOverhead);
      const realThroughput = Math.floor((complexity / (computeLatency / 1000)));
      
      setAiResult(code);
      setNeuralCache(prev => {
        const next = { 
          ...prev, 
          [prompt]: { 
            data: code, 
            timestamp: Date.now(), 
            lastAccessed: Date.now(), 
            latency: computeLatency,
            tokens: complexity
          } 
        };
        
        // v6.5 Hybrid LRU-Frequency Eviction (TinyLFU-lite)
        const keys = Object.keys(next);
        if (keys.length > 55) {
           const oldestKey = keys.sort((a, b) => {
             const recency = next[a].lastAccessed;
             const frequencyBonus = (next[a].tokens > 0 ? 50000 : 0); 
             const sizePenalty = next[a].tokens * 8;
             const scoreA = recency + frequencyBonus - sizePenalty;
             
             const recencyB = next[b].lastAccessed;
             const frequencyBonusB = (next[b].tokens > 0 ? 50000 : 0);
             const sizePenaltyB = next[b].tokens * 8;
             const scoreB = recencyB + frequencyBonusB - sizePenaltyB;
             
             return scoreA - scoreB;
           })[0];
           delete next[oldestKey];
           addLog('BỘ_NÃO: Cân bằng lại bể nhớ đệm. Đã loại bỏ các trọng số giá trị thấp.', 'CẢNH_BÁO');
        }
        return next;
      });
      
      setSession(prev => ({ 
        ...prev, 
        latency: computeLatency
      }));
      setPrompt('');
      addLog(`TRÌNH_BIÊN_DỊCH: Đã biên dịch ${complexity} tokens. Băng thông nút: ${realThroughput} tok/s.`, 'THÀNH_CÔNG', 'PHÂN_XƯỞNG_AI');
    } catch (err) {
      addLog('TRÌNH_BIÊN_DỊCH: Vòng lặp phản hồi thần kinh thất bại. Ma trận bị hỏng.', 'LỖI', 'HỆ_THỐNG');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    addLog(`BỘ_ĐỆM: Phân đoạn [${id}] đã được chuyển vào khay nhớ tạm thần kinh.`, 'THÔNG_TIN');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#010203] text-slate-400 font-sans selection:bg-brand-primary/30">
      {/* Autonomous OS Status Strip */}
      <div className="bg-brand-primary/5 h-8 border-b border-white/5 flex items-center justify-between px-4 md:px-8 shrink-0 overflow-hidden backdrop-blur-2xl">
        <div className="flex gap-4 md:gap-8 overflow-x-auto no-scrollbar whitespace-nowrap">
          <KernelStatus label="BỘ_NÃO" val="TỰ_HÀNH-V6.5" color="text-brand-primary" />
          <KernelStatus label="LIÊN_KẾT" val="LIÊN_BANG" color="text-cyan-400" />
          <KernelStatus label="CPU" val={`${(session.cpuLoad ?? 0).toFixed(0)}%`} color={(session.cpuLoad ?? 0) > 70 ? 'text-red-500' : 'text-indigo-400'} className="hidden md:flex" />
          <KernelStatus label="NHIỆT" val={`${(session.temp ?? 0).toFixed(1)}°C`} color={(session.temp ?? 0) > 75 ? 'text-orange-500' : 'text-emerald-400'} className="hidden lg:flex" />
          <KernelStatus label="TRỄ" val={`${(session.latency ?? 0).toFixed(0)}ms`} color="text-yellow-500" className="hidden lg:flex" />
          <KernelStatus label="VRAM" val={`${(session.vramLoad ?? 0).toFixed(1)}%`} color={(session.vramLoad ?? 0) > 85 ? 'text-red-500' : 'text-emerald-400'} />
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {session.predictiveAlert && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-2 py-0.5 bg-red-500/10 rounded border border-red-500/20">
               <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
               <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">DỰ_BÁO_SỤP_ĐỔ</span>
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
            <h1 className="text-xl md:text-3xl font-black tracking-tighter text-white italic leading-none">ELITE<span className="text-brand-primary">OS</span></h1>
            <div className="flex gap-2 md:gap-4 mt-1 md:mt-2">
              <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest px-1.5 md:px-2.5 py-0.5 md:py-1 rounded border transition-colors ${session.status === 'đã kết nối' ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/30' : 'bg-slate-500/10 text-slate-500 border-white/5'}`}>
                {session.status}
              </span>
              <span className="text-[8px] md:text-[9px] font-mono text-slate-600 tracking-widest hidden sm:inline">REL_6-TỰ_HÀNH</span>
            </div>
          </div>
        </div>

        <div className="hidden xl:flex gap-12 items-center">
           <MetricPill label="Hội tụ Logic" val={`${session.learningProgress}%`} sub="Độ chín bộ não" />
           <div className="w-[1px] h-10 bg-white/5" />
           <MetricPill label="Lưới nút" val={queue.filter(j => j.status === 'ĐANG_CHẠY').length.toString()} sub="Luồng hoạt động" />
           <div className="w-[1px] h-10 bg-white/5" />
           <MetricPill label="Quyết định tiếp" val="T-GIÂY" sub="Ngữ cảnh thần kinh" />
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
                      <Activity className="w-4 h-4 md:w-6 md:h-6 text-brand-primary" /> MA TRẬN CÔNG VIỆC
                    </h3>
                    <div className="flex gap-4">
                       <button 
                         onClick={() => createJob(`Luồng xử lý ${Math.floor(Math.random() * 1000)}`, Math.floor(Math.random() * 24) + 4, 'CAO')}
                         className="text-[8px] md:text-[9px] font-black text-brand-primary uppercase italic hover:text-white transition-colors flex items-center gap-2"
                       >
                         <Plus className="w-3 h-3" /> ĐĂNG_KÝ_NÚT
                       </button>
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
                          if (info.offset.x > 80 && (job.status === 'QUEUED' || job.status === 'FAILURE' || job.status === 'SUCCESS')) {
                            handleGuardedSwipe(job, 'RIGHT');
                          } else if (info.offset.x < -80 && (job.status === 'RUNNING' || job.status === 'SUCCESS' || job.status === 'FAILURE' || job.status === 'QUEUED')) {
                            handleGuardedSwipe(job, 'LEFT');
                          }
                        }}
                        className={`glass-panel p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between group hover:border-brand-primary/50 transition-all bg-white/[0.01] relative overflow-hidden touch-none active:scale-[0.98] ${pendingActions[job.id] ? 'opacity-50 grayscale' : ''}`}
                      >
                         {pendingActions[job.id] && (
                           <div className="absolute inset-0 bg-orange-500/10 flex items-center justify-center backdrop-blur-sm z-10">
                              <span className="text-[10px] font-black text-white italic animate-pulse">ĐANG_CHỜ_CHẤM_DỨT...</span>
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
                                  <span>ID: {job.id}</span>
                                  <span className="hidden sm:block w-1 md:w-1.5 h-1 md:h-1.5 bg-white/10 rounded-full" />
                                  <span className={job.executor !== 'ĐANG_CHỜ' ? 'text-indigo-400' : ''}>
                                    {job.executor === 'ĐANG_CHỜ' ? (job.waitTicks && job.waitTicks > 3 ? `ĐANG_ĐÓI [${job.waitTicks}t]` : 'ĐANG_ÁNH_XẠ...') : `${job.executor} [${job.metrics?.nodeId || 'N/A'}]`}
                                  </span>
                                  <span className="hidden sm:block w-1 md:w-1.5 h-1 md:h-1.5 bg-white/10 rounded-full" />
                                  <span className="text-brand-primary">{job.metrics?.tokens ? `${job.metrics.tokens} TOK` : `${job.cost || '??'} RU`}</span>
                               </div>
                            </div>
                         </div>
                         <div className="flex items-center justify-between md:justify-end gap-6 md:gap-12 w-full md:w-auto pt-6 md:pt-0 border-t md:border-t-0 border-white/5">
                            <div className="text-left md:text-right">
                               <div className={`text-[10px] md:text-[11px] font-black uppercase tracking-widest ${job.status === 'THÀNH_CÔNG' ? 'text-emerald-500' : job.status === 'ĐANG_CHẠY' || job.status === 'ĐANG_ĐIỀU_PHỐI' ? 'text-brand-primary' : 'text-slate-700'}`}>{job.status.replace('_', ' ')}</div>
                               <div className="text-[8px] md:text-[9px] font-black text-slate-800 uppercase italic mt-1 md:mt-1.5">{job.requirements.vram} GB VRAM</div>
                            </div>
                            <button 
                              onClick={() => handlePipeline(job.id)}
                              disabled={job.status !== 'XẾP_HÀNG' && job.status !== 'LỖI'}
                              className="flex-1 md:flex-none w-auto md:w-40 py-4 md:py-5 bg-white/5 hover:bg-white text-slate-500 hover:text-black rounded-xl md:rounded-2xl font-black text-[10px] md:text-[11px] uppercase tracking-[0.2em] md:tracking-[0.3em] transition-all disabled:opacity-20 shadow-2xl border border-white/5"
                            >
                              BẮT ĐẦU
                            </button>
                         </div>
                      </motion.div>
                    ))}
                 </div>

                 {/* Autonomous Brain Stream */}
                 <div className="space-y-4 md:space-y-6">
                    <div className="flex justify-between items-center px-2 md:px-4">
                       <h3 className="text-[9px] md:text-[11px] font-black uppercase text-slate-600 tracking-[0.2em] md:tracking-[0.4em] flex items-center gap-2 md:gap-3">
                        <TerminalIcon className="w-4 h-4 md:w-6 md:h-6 text-brand-primary" /> NHẬT KÝ HỆ THỐNG
                      </h3>
                      <button onClick={() => setLogs([])} className="text-[8px] md:text-[9px] font-black uppercase text-slate-800 hover:text-white transition-colors tracking-widest">XÓA</button>
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
                  <Shield className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" /> BẢNG HỆ THỐNG
                </h3>
                <div className="glass-panel p-6 md:p-12 rounded-[2.5rem] md:rounded-[4.5rem] border-white/5 space-y-8 md:space-y-12 bg-gradient-to-b from-white/[0.05] to-transparent shadow-4xl relative overflow-hidden">
                   <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-brand-primary/10 rounded-full blur-3xl" />
                   
                   <div className="grid grid-cols-1 gap-4 md:gap-8">
                      <StateRow label="TẢI VRAM" val={`${(session.vramLoad ?? 0).toFixed(1)}%`} color={(session.vramLoad ?? 0) > 80 ? 'text-red-500' : 'text-emerald-500'} />
                      <StateRow label="TÍNH TOÁN CPU" val={`${(session.cpuLoad ?? 0).toFixed(0)}%`} color={(session.cpuLoad ?? 0) > 85 ? 'text-orange-500' : 'text-brand-primary'} />
                      <StateRow label="NHIỆT ĐỘ" val={`${(session.temp ?? 0).toFixed(1)}°C`} color={(session.temp ?? 0) > 80 ? 'text-red-500' : 'text-indigo-400'} />
                      <StateRow label="ĐỘ TRỄ MẠNG" val={`${(session.latency ?? 0).toFixed(0)}ms`} color="text-emerald-500" />
                   </div>

                   <div className="pt-6 md:pt-12 border-t border-white/10 space-y-6 md:space-y-10">
                      <label className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-slate-700 block text-brand-primary">Lưu trữ API Key</label>
                      <div className="relative group">
                        <input 
                          type="password"
                          value={userApiKey}
                          onChange={(e) => {
                            const val = e.target.value;
                            setUserApiKey(val);
                            localStorage.setItem('gemini_api_key', val);
                          }}
                          placeholder="Nhập Gemini API Key tại đây..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-[11px] md:text-[13px] text-white placeholder:text-slate-700 focus:border-brand-primary/50 focus:outline-none transition-all pr-12"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-brand-primary transition-colors">
                          <Zap className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                      </div>
                      <p className="text-[8px] md:text-[9px] text-slate-600 font-bold leading-relaxed">
                        * Key được lưu cục bộ trong trình duyệt. Hệ thống sẽ ưu tiên key này hơn biến môi trường.
                      </p>
                   </div>

                   <div className="pt-6 md:pt-12 border-t border-white/10 space-y-6 md:space-y-10">
                      <label className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-slate-700 block">ĐIỂM KIỂM SOÁT</label>
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
                      <MetricBar label="Hội tụ" percentage={session.learningProgress} color="bg-indigo-500 shadow-indigo-500/20" />
                      <MetricBar label="Băng thông" percentage={88} color="bg-brand-primary" />
                   </div>

                   <button onClick={() => addLog('BỀN_VỮNG: Đang chụp nhanh trạng thái bộ não toàn cầu...', 'BỘ_NÃO')} className="w-full py-5 md:py-7 bg-brand-primary text-black font-black uppercase text-[11px] md:text-[13px] tracking-[0.2em] md:tracking-[0.4em] rounded-2xl md:rounded-[2rem] shadow-5xl shadow-brand-primary/40 hover:scale-[1.02] active:scale-95 transition-all">
                     ĐỒNG BỘ BỀN VỮNG
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
                     <h2 className="text-3xl md:text-6xl font-black text-white italic tracking-tighter mb-4 md:mb-6 leading-none uppercase">LÒ TỔNG HỢP PIPELINE</h2>
                     <p className="text-slate-600 text-[9px] md:text-[11px] mb-8 md:mb-16 leading-relaxed font-black uppercase tracking-[0.3em] md:tracking-[0.5em] max-w-2xl mx-auto italic">Logic Điều phối Cô lập & Bảo mật</p>
                     
                     <div className="relative group mb-8 md:mb-12">
                        <textarea 
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="Ý định mục tiêu..."
                          className="w-full bg-black/80 border-2 border-white/5 rounded-3xl md:rounded-[4rem] p-8 md:p-16 text-white focus:border-brand-primary/30 outline-none transition-all placeholder:text-slate-900 text-sm md:text-base min-h-[250px] md:min-h-[350px] shadow-4xl ring-1 ring-white/10"
                        />
                        <button 
                          onClick={compilePipeline}
                          disabled={isGenerating}
                          className="w-full md:w-auto mt-4 md:absolute md:bottom-12 md:right-12 bg-brand-primary px-8 md:px-16 py-4 md:py-6 rounded-2xl md:rounded-full font-black text-[12px] md:text-[14px] uppercase tracking-widest text-black flex items-center justify-center gap-4 md:gap-5 shadow-4xl shadow-brand-primary/40 hover:bg-white transition-all disabled:opacity-50 active:scale-90"
                        >
                          {isGenerating ? <RotateCw className="w-5 h-5 md:w-7 md:h-7 animate-spin" /> : <Zap className="w-5 h-5 md:w-7 md:h-7" />}
                          {isGenerating ? 'Đang tổng hợp...' : 'KHỞI CHẠY PIPELINE'}
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
                  <h2 className="text-3xl md:text-5xl font-black italic text-white tracking-[0.2em] md:tracking-[0.3em] uppercase">Thư viện Module</h2>
                  <div className="bg-white/5 px-6 md:px-8 py-2 md:py-3 rounded-full text-[10px] md:text-[12px] font-black text-slate-700 uppercase tracking-widest border border-white/5 shadow-inner self-start md:self-auto">BỘ_NÃO-V6.5</div>
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
                  <h2 className="text-3xl md:text-5xl font-black text-white italic mb-4 md:mb-6 tracking-tighter leading-none">THAM SỐ HỆ THỐNG</h2>
                  <p className="text-[10px] text-brand-primary/60 uppercase tracking-[0.4em] md:tracking-[0.6em] font-black mb-16 md:mb-24 italic">Giao thức Điều khiển v6.5</p>
                  
                  <div className="grid gap-6 md:gap-10 text-left">
                     <KernelToggle label="Cô lập thích ứng" defaultEnabled />
                     <KernelToggle label="Tài nguyên dự báo" defaultEnabled />
                     <KernelToggle label="Điểm kiểm soát trạng thái" defaultEnabled />
                     <KernelToggle label="Di cư mạng thần kinh" />
                     
                     <div className="mt-8 pt-8 border-t border-white/5">
                        <div className="flex justify-between items-center mb-4">
                           <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Hồi phục Bộ điều tốc</span>
                           <span className="text-[10px] font-mono text-brand-primary">{(recoveryRamp * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                           <motion.div 
                              animate={{ width: `${recoveryRamp * 100}%` }}
                              className={`h-full ${recoveryRamp < 1 ? 'bg-orange-500' : 'bg-brand-primary'}`}
                           />
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 md:mt-20">
                     <button onClick={optimizeKernel} className="py-6 bg-white/5 border border-white/10 rounded-3xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-brand-primary hover:text-black transition-all">Tối ưu hóa Nhân</button>
                     <button onClick={flushCache} className="py-6 bg-white/5 border border-white/10 rounded-3xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-orange-500 hover:text-black transition-all">Xóa Bộ nhớ đệm Thần kinh</button>
                  </div>
               </div>

               <div className="p-8 md:p-14 border-2 border-red-500/20 rounded-[3rem] md:rounded-[5rem] bg-red-500/5 flex flex-col md:flex-row items-center justify-between group overflow-hidden relative backdrop-blur-3xl shadow-4xl gap-8">
                  <div className="relative z-10 text-center md:text-left">
                     <h4 className="text-red-500 font-black text-2xl md:text-3xl italic tracking-tighter leading-none mb-3 md:mb-4 uppercase tracking-widest">Ghi đè Hủy diệt</h4>
                     <p className="text-[10px] md:text-[12px] text-red-500/50 font-black uppercase tracking-[0.3em] font-mono">Dọn sạch Phiên & Nút</p>
                  </div>
                  <button onClick={nukeSession} className="w-full md:w-auto px-12 md:px-16 py-4 md:py-6 bg-red-500 text-white font-black text-[12px] md:text-[14px] uppercase tracking-widest rounded-2xl md:rounded-[2rem] shadow-4xl shadow-red-500/40 hover:bg-white hover:text-black transition-all relative z-10 active:scale-90">HỦY DIỆT</button>
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
         <NavDeckIcon active={activeTab === 'hub'} onClick={() => setActiveTab('hub')} icon={<Monitor className="w-6 h-6 md:w-10 md:h-10" />} label="Trung tâm" />
         <NavDeckIcon active={activeTab === 'forge'} onClick={() => setActiveTab('forge')} icon={<Sparkles className="w-6 h-6 md:w-10 md:h-10" />} label="Lò AI" />
         <NavDeckIcon active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={<Code2 className="w-6 h-6 md:w-10 md:h-10" />} label="Thư viện" />
         <NavDeckIcon active={activeTab === 'system'} onClick={() => setActiveTab('system')} icon={<Settings className="w-6 h-6 md:w-10 md:h-10" />} label="Hệ thống" />
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
              <OrbitalAction icon={<Zap />} label="Chạy Khẩn cấp" color="bg-red-500" onClick={() => addLog('TỰ_HÀNH: Quy trình ưu tiên cao đã bắt đầu qua FAB.', 'BỘ_NÃO')} />
              <OrbitalAction icon={<RefreshCwIcon className="w-5 h-5" />} label="Đồng bộ lại tất cả" color="bg-indigo-500" onClick={() => addLog('ĐỒNG_BỘ: Đang đồng bộ lại các nút liên bang...', 'THÔNG_TIN')} />
              <OrbitalAction icon={<Shield />} label="Cô lập Cứng" color="bg-emerald-500" onClick={() => addLog('HỆ_THỐNG: Đang cưỡng bức cô lập phần cứng...', 'CẢNH_BÁO')} />
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

import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Terminal as XTerminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { 
  Server, Terminal, Activity, HardDrive, Cpu, Clock, 
  Settings, Plus, X, Menu, Layers, LayoutDashboard, 
  ArrowRight, MonitorSmartphone, Eye, EyeOff, BookOpen,
  Cloud, Shield, Database, Code, Globe, Package, Search, Zap, Info, ChevronRight, RefreshCw, Layout, CheckCircle2
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:3001';

// ==========================================
// 1. HELPER: DETEKSI CLOUD PROVIDER
// ==========================================
const getProviderInfo = (vendorString) => {
  if (!vendorString) return { name: 'Local VM', color: 'bg-slate-700/30 border-white/5', icon: <Globe size={12}/> };
  const v = vendorString.toLowerCase();
  if (v.includes('digitalocean')) return { name: 'DigitalOcean', color: 'bg-blue-600/20 text-blue-400 border-blue-500/30', icon: <Cloud size={12}/> };
  if (v.includes('amazon') || v.includes('aws')) return { name: 'AWS', color: 'bg-orange-600/20 text-orange-400 border-orange-500/30', icon: <Cloud size={12}/> };
  if (v.includes('google')) return { name: 'GCP', color: 'bg-red-600/20 text-red-400 border-red-500/30', icon: <Cloud size={12}/> };
  if (v.includes('vultr')) return { name: 'Vultr', color: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30', icon: <Cloud size={12}/> };
  return { name: vendorString.split(' ')[0], color: 'bg-white/5 text-white/40 border-white/10', icon: <Server size={12}/> };
};

// ==========================================
// 2. KOMPONEN: TERMINAL & SOFTWARE
// ==========================================
const WebTerminal = ({ vps, socket }) => {
  const terminalRef = useRef(null);
  useEffect(() => {
    if (!terminalRef.current || !socket) return;
    const term = new XTerminal({
      cursorBlink: true, fontSize: 11,
      theme: { background: 'transparent', foreground: '#e2e8f0', cursor: '#38bdf8' },
      allowTransparency: true
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    setTimeout(() => fitAddon.fit(), 100);
    socket.emit('connect_vps', { ip: vps.ip, username: vps.username, password: vps.password });
    socket.on('terminal_output', (data) => term.write(data));
    term.onData((data) => socket.emit('terminal_input', data));
    return () => { 
      socket.off('terminal_output'); 
      socket.emit('disconnect_vps'); 
      term.dispose(); 
    };
  }, [vps, socket]);

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-xl rounded-2xl sm:rounded-[32px] border border-white/5 shadow-2xl overflow-hidden ring-1 ring-white/10">
      <div className="flex items-center justify-between px-4 py-2 sm:px-6 sm:py-3 bg-white/5 border-b border-white/5 shrink-0">
        <span className="text-[9px] sm:text-[10px] font-mono text-blue-400/70 uppercase tracking-widest truncate max-w-[150px]">{vps.ip}</span>
        <div className="flex space-x-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500/40"></div><div className="w-1.5 h-1.5 rounded-full bg-yellow-500/40"></div><div className="w-1.5 h-1.5 rounded-full bg-green-500/40"></div></div>
      </div>
      <div ref={terminalRef} className="flex-1 p-2 sm:p-4" />
    </div>
  );
};

const SoftwareManager = ({ apps, loading }) => {
  const [q, setQ] = useState('');
  const filtered = apps.filter(a => a.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="bg-black/20 backdrop-blur-md rounded-2xl sm:rounded-[32px] border border-white/5 overflow-hidden flex flex-col h-full font-sans">
      <div className="p-4 sm:p-6 bg-white/5 border-b border-white/5 flex items-center justify-between gap-4">
        <div className="relative flex-1"><Search size={14} className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-white/20"/><input type="text" placeholder="Cari package..." value={q} onChange={(e)=>setQ(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-blue-500/50" /></div>
        <div className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg uppercase tracking-widest">{apps.length} Pkgs</div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-3 space-y-1.5">
        {loading ? <div className="h-40 flex flex-col items-center justify-center text-blue-400/40 animate-pulse"><RefreshCw size={24} className="animate-spin mb-3"/><span className="text-[9px] font-black uppercase">Scanning System</span></div> : 
        filtered.map((a, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all group">
            <div className="flex items-center space-x-3 truncate">
              <div className="p-2 rounded-lg bg-blue-500/5 text-blue-400 shrink-0"><Package size={14}/></div>
              <div className="truncate"><div className="text-xs font-bold text-white truncate">{a.name}</div><div className="text-[9px] text-white/20 truncate italic">{a.description}</div></div>
            </div>
            <div className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0 ml-2 border border-emerald-500/10">{a.version}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 3. KOMPONEN: UI CARDS & PAGES
// ==========================================
const MetricCard = ({ title, value, unit, icon: Icon, percentage, colorClasses }) => {
  const isLongValue = String(value).length > 5;
  return (
    <div className="group relative bg-white/5 backdrop-blur-md p-4 sm:p-6 rounded-2xl sm:rounded-[32px] border border-white/5 hover:border-blue-500/30 transition-all shadow-xl overflow-hidden h-full font-sans">
      <div className={`absolute -right-2 -top-2 opacity-5 ${colorClasses.text} group-hover:scale-125 transition-transform duration-700`}><Icon size={80} /></div>
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div className="flex justify-between items-center mb-3 sm:mb-6"><span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/30 truncate pr-2">{title}</span><div className={`p-1.5 rounded-lg bg-gradient-to-br ${colorClasses.bg} ${colorClasses.text} bg-opacity-10`}><Icon size={14} className="sm:w-5 sm:h-5" /></div></div>
        <div><div className="flex items-end space-x-1 sm:space-x-2"><span className={`font-black text-white tracking-tighter ${isLongValue ? 'text-lg sm:text-2xl' : 'text-xl sm:text-3xl'}`}>{value}</span><span className="text-[8px] sm:text-[10px] text-white/20 font-bold pb-1 uppercase">{unit}</span></div>
        {percentage !== undefined && <div className="mt-3 h-1 w-full bg-black/40 rounded-full overflow-hidden"><div className={`h-full bg-gradient-to-r ${colorClasses.fill} transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }}></div></div>}</div>
      </div>
    </div>
  );
};

const DocsPage = () => (
  <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-1 font-sans">
    <div className="relative p-6 sm:p-10 rounded-2xl sm:rounded-[48px] bg-gradient-to-br from-blue-600/20 to-indigo-900/10 border border-white/10 overflow-hidden shadow-2xl">
      <div className="absolute -right-6 -top-6 text-blue-500/5 rotate-12"><BookOpen size={200} /></div>
      <div className="relative z-10 text-center sm:text-left">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-400 uppercase tracking-widest mb-4">Handbook v1.2</div>
        <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 tracking-tighter leading-none uppercase italic">Zero Monitor <span className="text-blue-500 font-light block sm:inline">Resources</span></h1>
        <p className="text-blue-100/50 leading-relaxed max-w-lg text-xs sm:text-base mx-auto sm:ml-0">Monitoring cloud terdistribusi langsung dari smartphone lu, Mal.</p>
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      <div className="p-6 sm:p-8 rounded-2xl sm:rounded-[32px] bg-white/5 border border-white/10 group"><Zap className="text-blue-400 mb-4" size={24}/><h3 className="text-lg font-bold text-white mb-2">Metrics Engine</h3><p className="text-xs text-blue-100/40 leading-relaxed">Sistem narik data CPU/RAM langsung dari kernel VPS via /proc filesystem tiap 5000ms.</p></div>
      <div className="p-6 sm:p-8 rounded-2xl sm:rounded-[32px] bg-white/5 border border-white/10 group"><Shield className="text-cyan-400 mb-4" size={24}/><h3 className="text-lg font-bold text-white mb-2">Encrypted Bridge</h3><p className="text-xs text-blue-100/40 leading-relaxed">Semua komunikasi antara Frontend dan Backend diproteksi oleh WebSocket Secure.</p></div>
    </div>
  </div>
);

// --- MODAL: CREATE PTERODACTYL WIZARD ---
const PteroWizardModal = ({ isOpen, onClose, onInstall }) => {
  const [data, setData] = useState({ domain: '', email: '', user: 'admin', pass: '' });
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#020617]/95 backdrop-blur-xl p-4 font-sans">
      <div className="bg-[#0b1731] border border-white/10 rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 sm:p-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
          <div className="flex items-center space-x-3"><Layout className="text-blue-500" size={24}/><h3 className="text-xl font-black text-white uppercase tracking-widest">Install Wizard</h3></div>
          <button onClick={onClose} className="p-1.5 bg-white/5 rounded-full text-white/40"><X size={18}/></button>
        </div>
        <div className="p-6 sm:p-8 space-y-4">
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] mb-4">Konfigurasi Panel Pterodactyl</p>
          <input type="text" placeholder="FQDN (Contoh: panel.domain.com)" value={data.domain} onChange={(e)=>setData({...data, domain: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 outline-none text-sm" />
          <input type="email" placeholder="Admin Email" value={data.email} onChange={(e)=>setData({...data, email: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 outline-none text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Admin User" value={data.user} onChange={(e)=>setData({...data, user: e.target.value})} className="bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 outline-none text-sm" />
            <input type="password" placeholder="Admin Pass" value={data.pass} onChange={(e)=>setData({...data, pass: e.target.value})} className="bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 outline-none text-sm" />
          </div>
          <button onClick={()=>onInstall(data)} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl text-xs tracking-widest uppercase mt-4 shadow-lg active:scale-95 transition-all">START AUTO INSTALL</button>
        </div>
      </div>
    </div>
  );
};

const AddServerModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({ name: '', ip: '', username: 'root', password: '' });
  if (!isOpen) return null;
  const handleSubmit = (e) => { e.preventDefault(); onAdd(formData); setFormData({ name: '', ip: '', username: 'root', password: '' }); onClose(); };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/95 backdrop-blur-xl p-4 font-sans">
      <div className="bg-[#0b1731] border border-white/10 rounded-2xl sm:rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-white/5"><h3 className="text-xl sm:text-2xl font-black text-white">New Node</h3><button onClick={onClose} className="p-1.5 bg-white/5 rounded-full text-white/40"><X size={18}/></button></div>
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          <input type="text" required placeholder="Alias" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 outline-none text-sm" />
          <input type="text" required placeholder="IP Address" value={formData.ip} onChange={(e) => setFormData({...formData, ip: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 outline-none text-sm font-mono" />
          <div className="grid grid-cols-2 gap-3"><input type="text" required value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 outline-none text-sm" /><input type="password" required placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 outline-none text-sm" /></div>
          <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-xl text-xs tracking-widest uppercase">DEPLOY NODE</button>
        </form>
      </div>
    </div>
  );
};

const HomePage = ({ vpsList, onSelect, onDelete }) => (
  <div className="space-y-6 sm:space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-7xl mx-auto pb-20 font-sans">
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
      <div className="p-4 sm:p-8 rounded-2xl sm:rounded-[48px] bg-blue-600/10 border border-blue-500/20 shadow-2xl relative overflow-hidden group">
        <div className="text-[8px] sm:text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Active Nodes</div>
        <div className="text-3xl sm:text-7xl font-black text-white tracking-tighter">{vpsList.length}</div>
      </div>
      <div className="p-4 sm:p-8 rounded-2xl sm:rounded-[48px] bg-cyan-600/10 border border-cyan-500/20 shadow-2xl relative overflow-hidden group">
        <div className="text-[8px] sm:text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">Core Status</div>
        <div className="text-xl sm:text-6xl font-black text-white tracking-tighter uppercase">Online</div>
      </div>
      <div className="col-span-2 lg:col-span-1 p-4 sm:p-8 rounded-2xl sm:rounded-[48px] bg-white/5 border border-white/10 flex items-center justify-between backdrop-blur-md shadow-2xl"><div><div className="text-[8px] sm:text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Bridge</div><div className="text-lg sm:text-2xl font-black text-white italic uppercase tracking-wider">WS Stable</div></div><div className="w-8 h-8 sm:w-14 sm:h-14 rounded-full border-4 sm:border-[6px] border-emerald-500/10 border-t-emerald-500 animate-spin"></div></div>
    </div>
    <div className="space-y-4 px-1">
      <div className="flex items-center space-x-3 mb-2"><Layers size={18} className="text-blue-500" /><h3 className="text-sm sm:text-xl font-black text-white uppercase tracking-wider">Deployments</h3></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">{vpsList.length === 0 ? (<div className="col-span-full py-16 rounded-2xl border-2 border-dashed border-white/5 text-center text-white/20 font-bold uppercase text-[10px] tracking-widest">No nodes established</div>) : vpsList.map(v => (
        <div key={v.id} onClick={() => onSelect(v)} className="group bg-white/5 backdrop-blur-2xl border border-white/5 p-5 sm:p-8 rounded-2xl sm:rounded-[48px] hover:border-blue-500/40 hover:bg-blue-900/5 transition-all duration-700 cursor-pointer relative overflow-hidden shadow-2xl">
          <button onClick={(e)=>{e.stopPropagation(); onDelete(v.id);}} className="absolute top-4 right-4 sm:top-8 sm:right-8 p-2 bg-white/5 text-white/10 hover:text-red-400 rounded-xl z-20"><X size={14}/></button>
          <div className="flex items-center space-x-4 sm:space-x-6 mb-6 sm:mb-10"><div className="p-4 sm:p-6 rounded-xl sm:rounded-[32px] bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-xl group-hover:rotate-6 transition-transform"><Server size={24} className="sm:w-8 sm:h-8"/></div><div className="truncate"><h3 className="text-lg sm:text-2xl font-black text-white truncate leading-tight">{v.name}</h3><p className="text-[10px] sm:text-xs font-mono text-blue-400 mt-0.5 tracking-widest uppercase opacity-60 truncate">{v.ip}</p></div></div>
          <div className="flex items-center justify-between pt-4 border-t border-white/5 relative z-10"><span className="px-2 py-0.5 rounded-md bg-black/40 text-[8px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{v.username}</span><span className="flex items-center text-xs font-black text-blue-400 group-hover:translate-x-2 transition-all">OPEN SHIELD <ArrowRight size={14} className="ml-2"/></span></div>
        </div>
      ))}</div>
    </div>
  </div>
);

// ==========================================
// 4. MAIN APP ENTRY POINT
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'home');
  const [serverTab, setServerTab] = useState('terminal');
  const [vpsList, setVpsList] = useState(() => JSON.parse(localStorage.getItem('vps_list')) || []);
  const [selectedVPS, setSelectedVPS] = useState(() => {
    const savedId = localStorage.getItem('selectedVPSId');
    const list = JSON.parse(localStorage.getItem('vps_list')) || [];
    return list.find(v => v.id === Number(savedId)) || null;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPteroModalOpen, setIsPteroModalOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const [metrics, setMetrics] = useState({ os: '...', uptime: '...', cpu: 0, ramText: '0/0', ramPercent: 0, disk: 0, vendor: '' });
  const [apps, setApps] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);

  useEffect(() => { 
    localStorage.setItem('vps_list', JSON.stringify(vpsList)); 
    localStorage.setItem('activeTab', activeTab);
    if (selectedVPS) localStorage.setItem('selectedVPSId', selectedVPS.id);
    else localStorage.removeItem('selectedVPSId');
  }, [vpsList, activeTab, selectedVPS]);

  useEffect(() => { 
    const s = io(BACKEND_URL); setSocket(s); 
    s.on('vps_metrics', (d)=>setMetrics(d)); 
    s.on('installed_apps', (a)=>{setApps(a); setLoadingApps(false);}); 
    return () => s.close(); 
  }, []);

  const handleSelect = (v) => { setSelectedVPS(v); setActiveTab('terminal'); setServerTab('terminal'); setIsSidebarOpen(false); setApps([]); setMetrics({ os: '...', uptime: '...', cpu: 0, ramText: '0/0', ramPercent: 0, disk: 0, vendor: '' }); };
  
  const handleStartPteroWizard = (wizardData) => {
    if (!socket || !selectedVPS) return;
    setIsPteroModalOpen(false);
    // Jalankan script dengan argumen default atau instruksi
    const cmd = `bash <(curl -s https://pterodactyl-installer.se) <<EOF
0
${wizardData.domain}
${wizardData.email}
${wizardData.user}
${wizardData.pass}
EOF\n`;
    socket.emit('terminal_input', cmd);
    const newList = vpsList.map(v => v.id === selectedVPS.id ? { ...v, hasPanel: true } : v);
    setVpsList(newList);
  };

  const providerInfo = getProviderInfo(metrics.vendor);

  return (
    <div className="flex h-screen w-full bg-[#020617] text-blue-50 font-sans overflow-hidden selection:bg-blue-500/30">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-30"><div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[160px]"></div><div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[160px]"></div></div>
      <AddServerModal isOpen={isAddModalOpen} onClose={()=>setIsAddModalOpen(false)} onAdd={(d)=>setVpsList([...vpsList,{id:Date.now(),...d, hasPanel: false}])}/>
      <PteroWizardModal isOpen={isPteroModalOpen} onClose={()=>setIsPteroModalOpen(false)} onInstall={handleStartPteroWizard} />
      
      {isSidebarOpen && <div className="fixed inset-0 bg-[#020617]/80 z-40 lg:hidden backdrop-blur-md transition-opacity" onClick={()=>setIsSidebarOpen(false)}/>}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-[#0b1731]/60 backdrop-blur-3xl border-r border-white/5 flex flex-col transition-transform duration-500 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 sm:h-20 flex items-center justify-between px-6 sm:px-8 border-b border-white/5"><div className="flex items-center space-x-3"><div className="p-2 bg-blue-600 rounded-lg shadow-lg"><MonitorSmartphone size={18} className="text-white" /></div><h1 className="text-base sm:text-xl font-black text-white tracking-tighter uppercase italic">Zero<span className="text-blue-500 font-light">Monitor</span></h1></div><button className="lg:hidden p-1.5 bg-white/5 rounded-lg text-white/40" onClick={()=>setIsSidebarOpen(false)}><X size={18}/></button></div>
        <nav className="flex-1 p-4 sm:p-5 space-y-2 sm:space-y-3 overflow-y-auto custom-scrollbar">
          <button onClick={()=>{setActiveTab('home');setIsSidebarOpen(false)}} className={`w-full flex items-center space-x-3 p-3 sm:p-4 rounded-xl sm:rounded-[24px] transition-all text-sm sm:text-base ${activeTab==='home'?'bg-blue-600/10 text-blue-400 font-black border border-blue-500/20 shadow-xl':'text-white/30 hover:bg-white/5'}`}><LayoutDashboard size={18}/><span>Dashboard</span></button>
          <button onClick={()=>{setActiveTab('docs');setIsSidebarOpen(false)}} className={`w-full flex items-center space-x-3 p-3 sm:p-4 rounded-xl sm:rounded-[24px] transition-all text-sm sm:text-base ${activeTab==='docs'?'bg-blue-600/10 text-blue-400 font-black border border-blue-500/20 shadow-xl':'text-white/30 hover:bg-white/5'}`}><BookOpen size={18}/><span>Knowledge</span></button>
          <div className="mt-8 mb-2 px-4 text-[8px] sm:text-[10px] font-black uppercase text-white/20 tracking-widest">Global Nodes</div>
          {vpsList.map(v => <button key={v.id} onClick={()=>handleSelect(v)} className={`w-full flex items-center space-x-3 p-3 sm:p-4 rounded-xl sm:rounded-[20px] transition-all truncate border text-xs sm:text-sm ${activeTab==='terminal'&&selectedVPS?.id===v.id?'bg-white/5 text-white font-black border-white/10 shadow-2xl':'border-transparent text-white/20 hover:bg-white/5'}`}><Server size={14} className={activeTab==='terminal'&&selectedVPS?.id===v.id?'text-blue-50':''}/><span className="truncate">{v.name}</span></button>)}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative z-10 font-sans">
        <header className="h-16 sm:h-20 border-b border-white/5 flex items-center justify-between px-4 sm:px-8 bg-black/20 backdrop-blur-md">
          <div className="flex items-center space-x-3 sm:space-x-4 truncate max-w-[70%]"><button className="lg:hidden p-2 bg-white/5 rounded-lg text-white/40" onClick={()=>setIsSidebarOpen(true)}><Menu size={18}/></button><h2 className="text-sm sm:text-xl font-black text-white truncate tracking-widest uppercase">{activeTab==='home'?'System Overview':activeTab==='docs'?'Docs':selectedVPS?.name}</h2></div>
          {activeTab==='home'&&<button onClick={()=>setIsAddModalOpen(true)} className="bg-blue-600 text-white font-black text-[9px] sm:text-[10px] px-3 py-2 sm:px-6 sm:py-3 rounded-xl tracking-widest shadow-lg active:scale-95 transition-all">ADD NODE</button>}
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-10 custom-scrollbar">
          {activeTab==='home'&&<HomePage vpsList={vpsList} onSelect={handleSelect} onDelete={(id)=>setVpsList(vpsList.filter(v=>v.id!==id))}/>}
          {activeTab==='docs'&&<DocsPage/>}
          {activeTab==='terminal'&&selectedVPS&&(
            <div className="max-w-7xl mx-auto flex flex-col h-full space-y-6 sm:space-y-10 animate-in fade-in zoom-in-95 duration-500">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 shrink-0">
                <MetricCard title="Processing" value={metrics.cpu} unit="%" icon={Cpu} percentage={metrics.cpu} colorClasses={{bg:'from-blue-600',text:'text-blue-400',fill:'from-blue-600 to-cyan-400'}}/><MetricCard title="Memory" value={metrics.ramText} unit="GB" icon={Activity} percentage={metrics.ramPercent} colorClasses={{bg:'from-cyan-600',text:'text-cyan-400',fill:'from-cyan-600 to-emerald-400'}}/><MetricCard title="Storage" value={metrics.disk} unit="%" icon={HardDrive} percentage={metrics.disk} colorClasses={{bg:'from-sky-600',text:'text-sky-400',fill:'from-sky-600 to-blue-400'}}/><MetricCard title="Runtime" value={metrics.uptime} unit="" icon={Clock} colorClasses={{bg:'from-indigo-600',text:'text-indigo-400',fill:''}}/>
              </div>
              <div className="flex-1 flex flex-col min-h-[400px]">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
                  <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 shadow-2xl">
                    <button onClick={()=>setServerTab('terminal')} className={`px-4 py-1.5 sm:px-8 sm:py-3 rounded-lg sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase transition-all ${serverTab==='terminal'?'bg-blue-600 text-white shadow-lg':'text-white/40'}`}>Shell</button>
                    <button onClick={()=>{setServerTab('apps');if(apps.length===0){setLoadingApps(true);socket.emit('get_installed_apps');}}} className={`px-4 py-1.5 sm:px-8 sm:py-3 rounded-lg sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase transition-all ${serverTab==='apps'?'bg-blue-600 text-white shadow-lg':'text-white/40'}`}>Apps</button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`flex items-center px-3 py-1.5 rounded-lg text-[8px] sm:text-[10px] font-black uppercase border backdrop-blur-md ${providerInfo.color}`}>{providerInfo.icon}<span className="ml-2">{providerInfo.name}</span></span>
                    <span className="hidden sm:inline-flex px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-mono text-white/30 uppercase tracking-widest truncate max-w-[120px]">{metrics.os}</span>
                  </div>
                </div>
                <div className="flex-1 relative">{serverTab==='terminal' ? <WebTerminal vps={selectedVPS} socket={socket}/> : <SoftwareManager apps={apps} loading={loadingApps}/>}</div>
                <div className="mt-6 flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-top-2 duration-500 pb-10">
                   <button disabled={selectedVPS.hasPanel} onClick={()=>setIsPteroModalOpen(true)} className={`flex items-center justify-center space-x-3 py-4 sm:py-5 px-8 rounded-2xl sm:rounded-3xl border transition-all duration-300 group ${selectedVPS.hasPanel ? 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border-blue-500/30 text-blue-400 hover:border-blue-500 hover:bg-blue-500/10 hover:shadow-[0_0_30px_rgba(37,99,235,0.2)]'}`}>
                     {selectedVPS.hasPanel ? <CheckCircle2 size={20} /> : <Layout size={20} className="group-hover:rotate-12 transition-transform" />}
                     <span className="text-xs sm:text-sm font-black uppercase tracking-widest">{selectedVPS.hasPanel ? "Sudah ada Panel" : "Create Pterodactyl Panel"}</span>
                   </button>
                   <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center">
                     <Info size={14} className="text-blue-500/50 mr-3 shrink-0" />
                     <p className="text-[10px] text-white/30 leading-relaxed font-medium uppercase tracking-tight">Script installer berjalan real-time di terminal. Pastikan koneksi stabil, Mal.</p>
                   </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
        body { background-color: #020617; }
        .xterm-viewport { border-radius: 24px; padding: 5px; }
      `}} />
    </div>
  );
}
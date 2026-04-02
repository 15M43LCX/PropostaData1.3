import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import {
  LogIn, LayoutDashboard, FileText, Users, Printer, Settings, LogOut,
  BarChart3, X, CheckCircle2, AlertCircle, Kanban, ChevronLeft, ChevronRight, Menu, ClipboardList
} from 'lucide-react';
import { storage } from './services/storage';
import { User, UserRole } from './types';

import Dashboard from './pages/Dashboard';
import ProposalList from './pages/ProposalList';
import ProposalEditor from './pages/ProposalEditor';
import CustomerList from './pages/CustomerList';
import EquipmentList from './pages/EquipmentList';
import AdminPanel from './pages/AdminPanel';
import KanbanBoard from './pages/KanbanBoard';
import AuditLogPage from './pages/AuditLogPage';

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutos

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(storage.getCurrentUser());
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const doLogout = useCallback(() => {
    storage.setCurrentUser(null);
    setUser(null);
    setShowTimeoutWarning(false);
  }, []);

  // ── Timer de inatividade ──
  const resetInactivity = useCallback(() => {
    if (!user) return;
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    setShowTimeoutWarning(false);
    // Aviso 2 min antes
    warningTimer.current = setTimeout(() => setShowTimeoutWarning(true), INACTIVITY_MS - 2 * 60 * 1000);
    inactivityTimer.current = setTimeout(() => doLogout(), INACTIVITY_MS);
  }, [user, doLogout]);

  useEffect(() => {
    if (!user) return;
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetInactivity, { passive: true }));
    resetInactivity();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivity));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (warningTimer.current) clearTimeout(warningTimer.current);
    };
  }, [user, resetInactivity]);

  const handleLogin = async (email: string, pass: string) => {
    try {
      const allUsers = await storage.getUsers();
      const found = allUsers.find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass
      );
      if (found) {
        storage.setCurrentUser(found);
        setUser(found);
        notify('Login realizado com sucesso', 'success');
      } else {
        notify('Senha incorreta ou usuário não encontrado', 'error');
      }
    } catch {
      notify('Erro ao conectar. Verifique as configurações.', 'error');
    }
  };

  const handleLogout = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    storage.setCurrentUser(null);
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} notification={notification} />;
  }

  return (
    <HashRouter>
      {/* Aviso de inatividade */}
      {showTimeoutWarning && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-amber-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Sessão expirando</h3>
            <p className="text-slate-500 text-sm mb-6">Você ficará desconectado em <strong>2 minutos</strong> por inatividade.</p>
            <div className="flex gap-3">
              <button onClick={doLogout} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition text-sm">
                Sair agora
              </button>
              <button onClick={resetInactivity} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition text-sm">
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      <AppLayout user={user} onLogout={handleLogout} notification={notification} />
    </HashRouter>
  );
};

// ─── Layout principal ─────────────────────────────────────────────────────────
const AppLayout: React.FC<{ user: User; onLogout: () => void; notification: any }> = ({ user, onLogout, notification }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <Sidebar user={user} onLogout={onLogout} collapsed={collapsed} mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed(c => !c)} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition" onClick={() => setMobileOpen(true)}>
              <Menu size={22} />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 font-montserrat tracking-tight">Premium Pro</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-700">{user.name}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{user.role}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-100 text-sm">
              {user.name.charAt(0)}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {notification && (
            <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-white border-l-4 border-green-500' : 'bg-white border-l-4 border-red-500'}`}>
              {notification.type === 'success' ? <CheckCircle2 className="text-green-500" size={20} /> : <AlertCircle className="text-red-500" size={20} />}
              <span className="font-semibold text-sm text-slate-800">{notification.message}</span>
            </div>
          )}
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/proposals" element={<ProposalList user={user} />} />
            <Route path="/proposals/new" element={<ProposalEditor user={user} />} />
            <Route path="/proposals/edit/:id" element={<ProposalEditor user={user} />} />
            <Route path="/customers" element={<CustomerList user={user} />} />
            <Route path="/equipment" element={<EquipmentList user={user} />} />
            <Route path="/kanban" element={<KanbanBoard user={user} />} />
            <Route path="/admin" element={user.role === UserRole.ADMIN ? <AdminPanel /> : <Navigate to="/" />} />
            <Route path="/logs" element={user.role === UserRole.ADMIN ? <AuditLogPage user={user} /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// ─── Sidebar retrátil ─────────────────────────────────────────────────────────
interface SidebarProps {
  user: User; onLogout: () => void;
  collapsed: boolean; mobileOpen: boolean;
  onToggleCollapse: () => void; onCloseMobile: () => void;
}
const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, collapsed, mobileOpen, onToggleCollapse, onCloseMobile }) => {
  const location = useLocation();
  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Mural Kanban', icon: Kanban, path: '/kanban' },
    { label: 'Propostas', icon: FileText, path: '/proposals' },
    { label: 'Clientes', icon: Users, path: '/customers' },
    { label: 'Equipamentos', icon: Printer, path: '/equipment' },
  ];
  if (user.role === UserRole.ADMIN) {
    menuItems.push({ label: 'Log de Alterações', icon: ClipboardList, path: '/logs' });
    menuItems.push({ label: 'Configurações', icon: Settings, path: '/admin' });
  }
  const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <aside className={[
      'fixed lg:relative inset-y-0 left-0 z-40 flex flex-col bg-slate-900 text-slate-300 transition-all duration-300 ease-in-out h-full shrink-0',
      mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      collapsed ? 'w-20' : 'w-64',
    ].join(' ')}>
      <div className={`flex items-center h-16 border-b border-slate-800/60 px-4 shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 text-white min-w-0">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center shadow-lg shrink-0"><BarChart3 size={16} /></div>
            <span className="text-lg font-bold font-montserrat tracking-tighter uppercase truncate">Premium</span>
          </div>
        )}
        {collapsed && <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center shadow-lg"><BarChart3 size={16} /></div>}
        <button onClick={onToggleCollapse} className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0" title={collapsed ? 'Expandir' : 'Retrair'}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <button onClick={onCloseMobile} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {menuItems.map(item => {
          const active = isActive(item.path);
          return (
            <Link key={item.path} to={item.path} title={collapsed ? item.label : undefined}
              className={['flex items-center gap-3 rounded-xl transition-all group relative', collapsed ? 'px-0 py-3 justify-center' : 'px-4 py-3', active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'hover:bg-slate-800 hover:text-white text-slate-400'].join(' ')}>
              <item.icon size={20} className={active ? 'text-white' : 'group-hover:text-blue-400 transition-colors'} />
              {!collapsed && <span className="font-semibold text-sm truncate">{item.label}</span>}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-slate-700 text-white text-xs font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">{item.label}</div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={`border-t border-slate-800/50 p-3 shrink-0 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">{user.name.charAt(0)}</div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{user.role}</p>
            </div>
          </div>
        )}
        <button onClick={onLogout} title={collapsed ? 'Sair' : undefined}
          className={['flex items-center gap-3 rounded-xl hover:bg-red-900/20 hover:text-red-400 transition-all text-slate-400', collapsed ? 'p-3 justify-center w-full' : 'px-4 py-3 w-full'].join(' ')}>
          <LogOut size={18} />
          {!collapsed && <span className="font-bold text-sm">Sair</span>}
        </button>
      </div>
    </aside>
  );
};

// ─── Login ────────────────────────────────────────────────────────────────────
const Login: React.FC<{ onLogin: (e: string, p: string) => void; notification: any }> = ({ onLogin, notification }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-10 text-center bg-gradient-to-br from-blue-700 to-indigo-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 dot-pattern opacity-10"></div>
          <h2 className="text-3xl font-bold font-montserrat mb-2 relative z-10">DATI Propostas</h2>
          <p className="text-blue-100 opacity-80 relative z-10">Sistema de Propostas Comerciais</p>
        </div>
        <div className="p-10">
          <form onSubmit={(e) => { e.preventDefault(); onLogin(email, pass); }}>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">E-mail Corporativo</label>
                <input type="email" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" placeholder="voce@empresa.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Senha de Acesso</label>
                <input type="password" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} required />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-3">
                <LogIn size={20} /> Entrar no Sistema
              </button>
            </div>
          </form>
          {notification && (
            <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm font-semibold ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {notification.message}
            </div>
          )}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">DATICOPY - Soluções em Impressão © 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

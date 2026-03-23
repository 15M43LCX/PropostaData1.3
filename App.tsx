
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { LogIn, LayoutDashboard, FileText, Users, Printer, Settings, LogOut, PlusCircle, BarChart3, ChevronRight, Menu, X, CheckCircle2, AlertCircle, Kanban } from 'lucide-react';
import { storage } from './services/storage';
import { User, UserRole } from './types';

// Page Components
import Dashboard from './pages/Dashboard';
import ProposalList from './pages/ProposalList';
import ProposalEditor from './pages/ProposalEditor';
import CustomerList from './pages/CustomerList';
import EquipmentList from './pages/EquipmentList';
import AdminPanel from './pages/AdminPanel';
import KanbanBoard from './pages/KanbanBoard';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(storage.getCurrentUser());
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const notify = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

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
  } catch (err) {
    notify('Erro ao conectar. Verifique as configurações.', 'error');
  }
  };

  const handleResetSystem = () => {
    if (window.confirm('Isso apagará todos os dados (propostas, clientes, etc) e restaurará o padrão. Continuar?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleLogout = () => {
    storage.setCurrentUser(null);
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} onReset={handleResetSystem} notification={notification} />;
  }

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Sidebar user={user} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
             <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800 font-montserrat tracking-tight">Premium Pro</h1>
             </div>
             <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-700">{user.name}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{user.role}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-100">
                  {user.name.charAt(0)}
                </div>
             </div>
          </header>
          
          <main className="flex-1 overflow-y-auto p-6">
            {notification && (
              <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-white border-l-4 border-green-500 text-slate-800' : 'bg-white border-l-4 border-red-500 text-slate-800'}`}>
                {notification.type === 'success' ? <CheckCircle2 className="text-green-500" /> : <AlertCircle className="text-red-500" />}
                <span className="font-semibold">{notification.message}</span>
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
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

const Login: React.FC<{ onLogin: (e: string, p: string) => void; onReset: () => void; notification: any }> = ({ onLogin, onReset, notification }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
       <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-10 text-center bg-gradient-to-br from-blue-700 to-indigo-900 text-white relative overflow-hidden">
            <div className="absolute inset-0 dot-pattern opacity-10"></div>
            <h2 className="text-3xl font-bold font-montserrat mb-2 relative z-10">DATY Propostas</h2>
            <p className="text-blue-100 opacity-80 relative z-10">Geração de propostas v1.0.0</p>
          </div>
          <div className="p-10">
            <form onSubmit={(e) => { e.preventDefault(); onLogin(email, pass); }}>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">E-mail Corporativo</label>
                  <input 
                    type="email" 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" 
                    placeholder="voce@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Senha de Acesso</label>
                  <input 
                    type="password" 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" 
                    placeholder="••••••••"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    required
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-3 transform active:scale-95"
                >
                  <LogIn size={20} />
                  Entrar no Sistema
                </button>
              </div>
            </form>
            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
              <button 
                onClick={onReset}
                className="text-slate-300 hover:text-red-400 text-[10px] uppercase tracking-widest transition-colors"
              >
                Resetar Sistema (Limpar Cache)
              </button>
              <p className="mt-2 text-slate-400 text-[10px] uppercase tracking-widest">
                Premium Pro Proposals © 2024 - Hostgator Cloud Ready
              </p>
            </div>
          </div>
       </div>
    </div>
  );
};

const Sidebar: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Mural Kanban', icon: Kanban, path: '/kanban' },
    { label: 'Propostas', icon: FileText, path: '/proposals' },
    { label: 'Clientes', icon: Users, path: '/customers' },
    { label: 'Equipamentos', icon: Printer, path: '/equipment' },
  ];

  if (user.role === UserRole.ADMIN) {
    menuItems.push({ label: 'Configurações', icon: Settings, path: '/admin' });
  }

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 shrink-0">
      <div className="p-8">
        <div className="flex items-center gap-3 text-white">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center shadow-lg">
            <BarChart3 size={20} />
          </div>
          <span className="text-xl font-bold font-montserrat tracking-tighter uppercase">Premium</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => (
          <Link 
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-slate-800 hover:text-white transition group"
          >
            <item.icon size={20} className="group-hover:text-blue-400 transition-colors" />
            <span className="font-semibold text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-800/50">
        <button 
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-red-900/20 hover:text-red-400 transition-all text-slate-400"
        >
          <LogOut size={20} />
          <span className="font-bold text-sm">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default App;

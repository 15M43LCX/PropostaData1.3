import React, { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Search, X, ChevronDown, Filter } from 'lucide-react';
import { storage } from '../services/storage';
import { AuditLog, AuditModule, AuditAction, User, UserRole } from '../types';

const MODULE_LABELS: Record<AuditModule, string> = {
  proposta: 'Proposta',
  cliente: 'Cliente',
  equipamento: 'Equipamento',
  usuario: 'Usuário',
};

const ACTION_COLORS: Record<AuditAction, string> = {
  criar:   'bg-emerald-100 text-emerald-700',
  editar:  'bg-blue-100 text-blue-700',
  excluir: 'bg-red-100 text-red-700',
};

const MODULE_COLORS: Record<AuditModule, string> = {
  proposta:     'bg-indigo-100 text-indigo-700',
  cliente:      'bg-amber-100 text-amber-700',
  equipamento:  'bg-purple-100 text-purple-700',
  usuario:      'bg-rose-100 text-rose-700',
};

const AuditLogPage: React.FC<{ user: User }> = ({ user }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');

  useEffect(() => {
    const load = async () => {
      const [l, u] = await Promise.all([storage.getLogs(), storage.getUsers()]);
      setLogs(l);
      setAllUsers(u);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => logs.filter(l => {
    if (search && !l.description.toLowerCase().includes(search.toLowerCase()) && !l.userName.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterModule && l.module !== filterModule) return false;
    if (filterAction && l.action !== filterAction) return false;
    if (filterUser && l.userId !== filterUser) return false;
    return true;
  }), [logs, search, filterModule, filterAction, filterUser]);

  const activeFilters = [search, filterModule, filterAction, filterUser].filter(Boolean).length;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <ClipboardList className="text-blue-600" size={28} />
            Log de Alterações
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Registro completo de todas as ações realizadas no sistema.</p>
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-100 rounded-xl px-4 py-2">
          {filtered.length} registro(s)
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-700 text-sm uppercase tracking-wider flex items-center gap-2">
            <Filter size={13} /> Filtros
          </h3>
          {activeFilters > 0 && (
            <button onClick={() => { setSearch(''); setFilterModule(''); setFilterAction(''); setFilterUser(''); }}
              className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-wider flex items-center gap-1">
              <X size={11} /> Limpar
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Busca */}
          <div className="sm:col-span-2 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" placeholder="Buscar por descrição ou usuário..."
              className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {/* Módulo */}
          <div className="relative">
            <select className="w-full p-2.5 bg-slate-50 rounded-xl font-bold text-sm appearance-none pr-7 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={filterModule} onChange={e => setFilterModule(e.target.value)}>
              <option value="">Todos os módulos</option>
              {(Object.keys(MODULE_LABELS) as AuditModule[]).map(m => (
                <option key={m} value={m}>{MODULE_LABELS[m]}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          {/* Ação */}
          <div className="relative">
            <select className="w-full p-2.5 bg-slate-50 rounded-xl font-bold text-sm appearance-none pr-7 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={filterAction} onChange={e => setFilterAction(e.target.value)}>
              <option value="">Todas as ações</option>
              <option value="criar">Criar</option>
              <option value="editar">Editar</option>
              <option value="excluir">Excluir</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          {/* Usuário — só ADMIN vê todos */}
          {user.role === UserRole.ADMIN && (
            <div className="relative">
              <select className="w-full p-2.5 bg-slate-50 rounded-xl font-bold text-sm appearance-none pr-7 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={filterUser} onChange={e => setFilterUser(e.target.value)}>
                <option value="">Todos os usuários</option>
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Lista de logs */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-300 bg-white rounded-[40px] border border-slate-100">
          <ClipboardList className="mx-auto mb-4 opacity-20" size={56} />
          <p className="text-sm font-medium">{logs.length === 0 ? 'Nenhuma ação registrada ainda.' : 'Nenhum log com esses filtros.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Hora</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ação</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{formatDate(log.timestamp)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-800">{log.userName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${MODULE_COLORS[log.module]}`}>
                        {MODULE_LABELS[log.module]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${ACTION_COLORS[log.action]}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-medium">{log.description}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogPage;

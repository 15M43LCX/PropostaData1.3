import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, TrendingUp, PlusCircle, Kanban, ChevronRight, Filter, X, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { storage } from '../services/storage';
import { User, ProposalStatus, PricingModel, MasterData, Proposal, Customer } from '../types';
import { INITIAL_MASTER_DATA } from '../constants';

const currentYearMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
const getYearMonth = (dateStr: string) => {
  const p = dateStr.split('/');
  return p.length === 3 ? `${p[2]}-${p[1]}` : '';
};

interface Filters {
  sellerId: string;
  customerId: string;
  pricingModel: string;
  status: string;
}

const EMPTY_FILTERS: Filters = { sellerId: '', customerId: '', pricingModel: '', status: '' };

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [masterData, setMasterData] = useState<MasterData>(INITIAL_MASTER_DATA);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [p, c, users, md] = await Promise.all([
        storage.getVisibleProposals(user),
        storage.getVisibleCustomers(user),
        storage.getUsers(),
        storage.getMasterData(),
      ]);
      setProposals(p);
      setCustomers(c);
      setAllUsers(users);
      setMasterData(md);
      setLoading(false);
    };
    load();
  }, [user]);

  // Propostas filtradas
  const filtered = useMemo(() => {
    return proposals.filter(p => {
      if (filters.sellerId && p.sellerId !== filters.sellerId) return false;
      if (filters.customerId && p.customerId !== filters.customerId) return false;
      if (filters.pricingModel && p.pricingModel !== filters.pricingModel) return false;
      if (filters.status && p.status !== filters.status) return false;
      return true;
    });
  }, [proposals, filters]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const thisMonth = currentYearMonth();

  const proposalsThisMonth = useMemo(
    () => filtered.filter(p => getYearMonth(p.date) === thisMonth),
    [filtered, thisMonth]
  );
  const closedThisMonth = useMemo(
    () => proposalsThisMonth.filter(p => p.status === ProposalStatus.FECHADO),
    [proposalsThisMonth]
  );
  const conversionRate = proposalsThisMonth.length > 0
    ? (closedThisMonth.length / proposalsThisMonth.length) * 100
    : 0;

  const closedAll = filtered.filter(p => p.status === ProposalStatus.FECHADO);
  const totalClosedValue = closedAll.reduce((acc, p) => acc + p.totalValue, 0);
  const goalProgress = masterData.salesGoal > 0 ? (totalClosedValue / masterData.salesGoal) * 100 : 0;

  const stats = [
    { label: 'Propostas', value: filtered.length, icon: FileText, color: 'bg-blue-600', path: '/proposals' },
    { label: 'Clientes', value: customers.length, icon: Users, color: 'bg-indigo-600', path: '/customers' },
    { label: 'No Funil', value: filtered.filter(p => p.status === ProposalStatus.EM_NEGOCIACAO).length, icon: Kanban, color: 'bg-amber-500', path: '/kanban' },
    {
      label: 'Taxa Conversão (mês)',
      value: `${conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'bg-emerald-500',
      path: '/proposals',
      sub: `${closedThisMonth.length}/${proposalsThisMonth.length} este mês`
    },
  ];

  const chartData = [
    { name: 'Meta Comercial', value: masterData.salesGoal },
    { name: 'Total Fechado', value: totalClosedValue }
  ];

  const setFilter = (key: keyof Filters, val: string) =>
    setFilters(prev => ({ ...prev, [key]: val }));

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Dashboard Comercial</h2>
          <p className="text-slate-500 font-medium text-sm">Bem-vindo, {user.name.split(' ')[0]}. Aqui está seu resumo.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterOpen(o => !o)}
            className={`flex items-center gap-2 border font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-sm relative ${filterOpen || activeFilterCount > 0 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Filter size={16} />
            Filtros
            {activeFilterCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
          <button onClick={() => navigate('/kanban')}
            className="bg-white border border-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition shadow-sm text-sm">
            <Kanban size={18} className="text-blue-500" /> Ver Mural
          </button>
          <button onClick={() => navigate('/proposals/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition shadow-lg shadow-blue-200 text-sm">
            <PlusCircle size={18} /> Nova Proposta
          </button>
        </div>
      </div>

      {/* ── Painel de Filtros ── */}
      {filterOpen && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-700 text-sm uppercase tracking-wider flex items-center gap-2">
              <Filter size={14} /> Filtrar Dashboard
            </h3>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-wider flex items-center gap-1 transition">
                <X size={12} /> Limpar Filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

            {/* Consultor (só ADMIN vê) */}
            {user.role === 'ADMIN' && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Consultor</label>
                <div className="relative">
                  <select
                    className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm appearance-none pr-8 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={filters.sellerId}
                    onChange={e => setFilter('sellerId', e.target.value)}
                  >
                    <option value="">Todos</option>
                    {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Cliente */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cliente</label>
              <div className="relative">
                <select
                  className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm appearance-none pr-8 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={filters.customerId}
                  onChange={e => setFilter('customerId', e.target.value)}
                >
                  <option value="">Todos</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Modelo de Precificação */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Modelo</label>
              <div className="relative">
                <select
                  className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm appearance-none pr-8 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={filters.pricingModel}
                  onChange={e => setFilter('pricingModel', e.target.value)}
                >
                  <option value="">Todos</option>
                  {Object.values(PricingModel).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status</label>
              <div className="relative">
                <select
                  className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm appearance-none pr-8 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={filters.status}
                  onChange={e => setFilter('status', e.target.value)}
                >
                  <option value="">Todos</option>
                  {Object.values(ProposalStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Chips dos filtros ativos */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
              {filters.sellerId && (
                <Chip label={`Consultor: ${allUsers.find(u => u.id === filters.sellerId)?.name || '—'}`} onRemove={() => setFilter('sellerId', '')} />
              )}
              {filters.customerId && (
                <Chip label={`Cliente: ${customers.find(c => c.id === filters.customerId)?.companyName || '—'}`} onRemove={() => setFilter('customerId', '')} />
              )}
              {filters.pricingModel && (
                <Chip label={`Modelo: ${filters.pricingModel}`} onRemove={() => setFilter('pricingModel', '')} />
              )}
              {filters.status && (
                <Chip label={`Status: ${filters.status}`} onRemove={() => setFilter('status', '')} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Cards de stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} onClick={() => navigate(stat.path)}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] leading-tight">{stat.label}</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{stat.value}</h3>
                {'sub' in stat && stat.sub && (
                  <p className="text-[10px] text-slate-400 mt-0.5">{stat.sub}</p>
                )}
              </div>
              <div className={`${stat.color} p-2.5 rounded-xl text-white shadow-xl transform group-hover:scale-110 transition-transform shrink-0`}>
                <stat.icon size={20} />
              </div>
            </div>
            <div className="mt-3 flex items-center text-[10px] font-bold text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Ver Detalhes</span>
              <ChevronRight size={10} className="ml-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico + Fluxo recente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-3">
            <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
            Desempenho vs Meta
            {activeFilterCount > 0 && <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg">Filtrado</span>}
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} fontWeight="bold" width={100} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 40px -8px rgb(0 0 0 / 0.1)' }}
                  formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={40}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#f1f5f9' : '#2563eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 p-4 bg-slate-50 rounded-2xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Atingimento da Meta</span>
              <span className="text-sm font-black text-blue-600">{goalProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-slate-100">
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(goalProgress, 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-3">
            <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
            Fluxo Recente
          </h3>
          <div className="space-y-3">
            {filtered.slice(0, 5).map(p => {
              const customer = customers.find(c => c.id === p.customerId);
              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs group-hover:bg-white group-hover:text-blue-500 transition shrink-0">
                      {p.code.slice(-2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{customer?.companyName || 'Removido'}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{p.date}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase shrink-0 ml-2 ${
                    p.status === ProposalStatus.FECHADO ? 'bg-green-100 text-green-700' :
                    p.status === ProposalStatus.ABERTO ? 'bg-blue-100 text-blue-700' :
                    p.status === ProposalStatus.EM_NEGOCIACAO ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'}`}>
                    {p.status}
                  </span>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-10 text-slate-300">
                <FileText className="mx-auto mb-3 opacity-20" size={40} />
                <p className="text-sm font-medium">Nenhuma proposta{activeFilterCount > 0 ? ' com esses filtros' : ''}.</p>
              </div>
            )}
          </div>
          <button onClick={() => navigate('/proposals')}
            className="w-full mt-6 py-3 text-xs font-bold text-slate-500 hover:text-blue-600 border border-slate-100 rounded-xl hover:bg-blue-50 hover:border-blue-100 transition-all uppercase tracking-[0.2em]">
            Gerenciar Propostas
          </button>
        </div>
      </div>
    </div>
  );
};

// Chip de filtro ativo
const Chip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black rounded-full uppercase tracking-wider">
    {label}
    <button onClick={onRemove} className="hover:text-red-500 transition"><X size={11} /></button>
  </span>
);

export default Dashboard;

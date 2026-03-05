
import React from 'react';
import { useNavigate } from 'react-router-dom';
// Added ChevronRight to imports
import { FileText, Users, Printer, TrendingUp, Target, PlusCircle, Kanban, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { storage } from '../services/storage';
import { User, ProposalStatus } from '../types';

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const proposals = storage.getVisibleProposals(user);
  const customers = storage.getVisibleCustomers(user);
  const equipmentCount = storage.getEquipments().length;
  const masterData = storage.getMasterData();

  const closedProposals = proposals.filter(p => p.status === ProposalStatus.FECHADO);
  const totalClosedValue = closedProposals.reduce((acc, curr) => acc + curr.totalValue, 0);
  const conversionRate = proposals.length > 0 ? (closedProposals.length / proposals.length) * 100 : 0;
  
  const goalProgress = (totalClosedValue / masterData.salesGoal) * 100;

  const stats = [
    { label: 'Propostas', value: proposals.length, icon: FileText, color: 'bg-blue-600', path: '/proposals' },
    { label: 'Clientes', value: customers.length, icon: Users, color: 'bg-indigo-600', path: '/customers' },
    { label: 'No Funil (Kanban)', value: proposals.filter(p => p.status === ProposalStatus.EM_NEGOCIACAO).length, icon: Kanban, color: 'bg-amber-500', path: '/kanban' },
    { label: 'Taxa Conversão', value: `${conversionRate.toFixed(1)}%`, icon: TrendingUp, color: 'bg-emerald-500', path: '/proposals' },
  ];

  const chartData = [
    { name: 'Meta Comercial', value: masterData.salesGoal },
    { name: 'Total Fechado', value: totalClosedValue }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Dashboard Comercial</h2>
          <p className="text-slate-500 font-medium">Bem-vindo, {user.name.split(' ')[0]}. Aqui está seu resumo comercial.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/kanban')}
            className="bg-white border border-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition shadow-sm"
          >
            <Kanban size={20} className="text-blue-500" />
            Ver Mural
          </button>
          <button 
            onClick={() => navigate('/proposals/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition shadow-lg shadow-blue-200"
          >
            <PlusCircle size={20} />
            Nova Proposta
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div 
            key={idx} 
            onClick={() => navigate(stat.path)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                <h3 className="text-3xl font-black text-slate-800 mt-1">{stat.value}</h3>
              </div>
              <div className={`${stat.color} p-3 rounded-xl text-white shadow-xl transform group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-[10px] font-bold text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Visualizar Detalhes</span>
              <ChevronRight size={10} className="ml-1" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-3">
            <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
            Desempenho vs Meta
          </h3>
          <div className="h-72">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} fontWeight="bold" width={100} />
                 <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }}
                 />
                 <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={45}>
                   {chartData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={index === 0 ? '#f1f5f9' : '#2563eb'} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
          <div className="mt-8 flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Atingimento da Meta</span>
                <span className="text-sm font-black text-blue-600">{goalProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full h-4 bg-white rounded-full overflow-hidden border border-slate-100">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full transition-all duration-1000 shadow-inner"
                  style={{ width: `${Math.min(goalProgress, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
            <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
            Fluxo Recente
          </h3>
          <div className="space-y-4">
            {proposals.slice(0, 5).map(p => {
              const customer = customers.find(c => c.id === p.customerId);
              return (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100 group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs group-hover:bg-white group-hover:text-blue-500 transition-colors">
                      {p.code.slice(-2)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 truncate max-w-[140px]">{customer?.companyName || 'Removido'}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{p.date}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                    p.status === ProposalStatus.FECHADO ? 'bg-green-100 text-green-700' : 
                    p.status === ProposalStatus.ABERTO ? 'bg-blue-100 text-blue-700' : 
                    p.status === ProposalStatus.EM_NEGOCIACAO ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {p.status}
                  </span>
                </div>
              );
            })}
            {proposals.length === 0 && (
              <div className="text-center py-16 text-slate-300">
                <FileText className="mx-auto mb-4 opacity-20" size={56} />
                <p className="text-sm font-medium">Aguardando novos negócios.</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => navigate('/proposals')}
            className="w-full mt-8 py-3 text-xs font-bold text-slate-500 hover:text-blue-600 border border-slate-100 rounded-xl hover:bg-blue-50 hover:border-blue-100 transition-all uppercase tracking-[0.2em]"
          >
            Gerenciar Propostas
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

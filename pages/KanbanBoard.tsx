
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProposalStatus, User, Proposal } from '../types';
import { storage } from '../services/storage';
import { ChevronRight, Edit, FileText, User as UserIcon, Calendar, DollarSign, CheckCircle, Clock, Ban } from 'lucide-react';

const KanbanBoard: React.FC<{ user: User }> = ({ user }) => {
const [proposals, setProposals] = useState<Proposal[]>([]);
const [customers, setCustomers] = useState<Customer[]>([]);

useEffect(() => {
  const load = async () => {
    const [p, c] = await Promise.all([
      storage.getVisibleProposals(user),
      storage.getCustomers(),
    ]);
    setProposals(p); setCustomers(c);
  };
  load();
}, []);

// Ao mover card no Kanban:
const handleStatusChange = async (id: string, status: ProposalStatus) => {
  const updated = proposals.find(p => p.id === id);
  if (!updated) return;
  await storage.saveProposal({ ...updated, status });
  setProposals(prev => prev.map(p => p.id === id ? { ...p, status } : p));
};

  useEffect(() => {
    loadData();
  }, [user]);

  const columns: { status: ProposalStatus; label: string; icon: any; color: string }[] = [
    { status: ProposalStatus.ABERTO, label: 'Prospecção / Aberto', icon: FileText, color: 'border-blue-500 bg-blue-50/30' },
    { status: ProposalStatus.EM_NEGOCIACAO, label: 'Em Negociação', icon: Clock, color: 'border-amber-500 bg-amber-50/30' },
    { status: ProposalStatus.FECHADO, label: 'Contrato Fechado', icon: CheckCircle, color: 'border-emerald-500 bg-emerald-50/30' },
    { status: ProposalStatus.PERDIDO, label: 'Perdido', icon: Ban, color: 'border-red-500 bg-red-50/30' }
  ];

  const handleUpdateStatus = (proposal: Proposal, newStatus: ProposalStatus) => {
    const updated: Proposal = { ...proposal, status: newStatus };
    storage.saveProposal(updated);
    loadData(); // Re-sincroniza o estado local com o storage
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.companyName || 'N/A';

  return (
    <div className="h-full flex flex-col space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Fluxo de Vendas</h2>
          <p className="text-slate-500 font-medium">Arraste a visão geral para controlar seus negócios.</p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-6 scrollbar-hide">
        <div className="flex gap-8 h-full min-w-max px-2">
          {columns.map(col => {
            const colProposals = proposals.filter(p => p.status === col.status);
            return (
              <div key={col.status} className="w-[320px] flex flex-col gap-5">
                <div className={`p-5 rounded-[24px] border-t-8 bg-white shadow-sm flex items-center justify-between ${col.color}`}>
                  <div className="flex items-center gap-3">
                    <col.icon size={18} className="text-slate-400" />
                    <span className="font-black text-slate-700 uppercase text-[11px] tracking-widest">{col.label}</span>
                  </div>
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black">{colProposals.length}</span>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto pr-2 custom-scrollbar min-h-[400px]">
                  {colProposals.map(p => (
                    <div key={p.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-default">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg font-black border border-blue-100">{p.code}</span>
                        <button onClick={() => navigate(`/proposals/edit/${p.id}`)} className="text-slate-300 hover:text-blue-500 bg-slate-50 p-2 rounded-xl transition">
                          <Edit size={16} />
                        </button>
                      </div>
                      
                      <h4 className="font-black text-slate-800 text-sm mb-4 line-clamp-2 leading-tight uppercase tracking-tight">{getCustomerName(p.customerId)}</h4>
                      
                      <div className="space-y-2 mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                        <div className="flex items-center gap-2 text-xs">
                          <DollarSign size={14} className="text-emerald-500" />
                          <span className="font-black text-slate-700">R$ {p.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                          <Calendar size={12} />
                          <span>{p.date}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                         {col.status !== ProposalStatus.EM_NEGOCIACAO && col.status !== ProposalStatus.FECHADO && (
                           <button onClick={() => handleUpdateStatus(p, ProposalStatus.EM_NEGOCIACAO)} className="flex-1 bg-amber-50 text-[9px] font-black text-amber-600 py-2 rounded-xl border border-amber-100 hover:bg-amber-600 hover:text-white transition uppercase tracking-tighter">Negociar</button>
                         )}
                         {col.status !== ProposalStatus.FECHADO && (
                           <button onClick={() => handleUpdateStatus(p, ProposalStatus.FECHADO)} className="flex-1 bg-emerald-50 text-[9px] font-black text-emerald-600 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-600 hover:text-white transition uppercase tracking-tighter">Fechar</button>
                         )}
                         {col.status !== ProposalStatus.PERDIDO && (
                           <button onClick={() => handleUpdateStatus(p, ProposalStatus.PERDIDO)} className="bg-red-50 text-[9px] font-black text-red-400 p-2 rounded-xl border border-red-100 hover:bg-red-500 hover:text-white transition"><Ban size={12} /></button>
                         )}
                      </div>
                    </div>
                  ))}
                  {colProposals.length === 0 && (
                    <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-[32px] text-slate-200 text-[10px] font-black uppercase tracking-widest">
                      Coluna Limpa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KanbanBoard;

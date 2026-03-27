import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, PlusCircle, Edit, Download, Loader2, Printer, 
  Copy, Trash2, User as UserIcon, Filter, X, ChevronDown, Search 
} from 'lucide-react';
import { storage } from '../services/storage';
import { User, Proposal, ProposalStatus, PricingModel, Customer, Equipment, MasterData } from '../types';
import { INITIAL_MASTER_DATA } from '../constants';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- Sub-componente Chip para os filtros ---
const Chip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 text-[10px] font-black uppercase tracking-wider">
    {label}
    <button onClick={onRemove} className="hover:text-red-500 transition-colors">
      <X size={12} />
    </button>
  </div>
);

interface PLFilters { search: string; sellerId: string; customerId: string; pricingModel: string; status: string; }
const EMPTY: PLFilters = { search: '', sellerId: '', customerId: '', pricingModel: '', status: '' };

const ProposalList: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const pdfRef = useRef<HTMLDivElement>(null);

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [masterData, setMasterData] = useState<MasterData>(INITIAL_MASTER_DATA);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [activeProp, setActiveProp] = useState<Proposal | null>(null);
  const [filters, setFilters] = useState<PLFilters>(EMPTY);
  const [filterOpen, setFilterOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [props, custs, eqs, users, md] = await Promise.all([
        storage.getVisibleProposals(user),
        storage.getCustomers(),
        storage.getEquipments(),
        storage.getUsers(),
        storage.getMasterData(),
      ]);
      setProposals(props);
      setCustomers(custs);
      setEquipments(eqs);
      setAllUsers(users);
      setMasterData(md);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const getCustomer = (id: string) => customers.find(c => c.id === id);
  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatFullDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    const [day, month, year] = parts;
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `Rio de Janeiro, ${parseInt(day)} de ${months[parseInt(month) - 1]} de ${year}`;
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Deseja realmente excluir esta proposta? Esta ação é irreversível.')) {
      await storage.deleteProposal(id);
      await loadData();
    }
  };

  const handleDuplicate = async (prop: Proposal) => {
    const newProp: Proposal = {
      ...prop,
      id: Math.random().toString(36).substr(2, 9),
      code: `${prop.code}-COPIA`,
      date: new Date().toLocaleDateString('pt-BR'),
      status: ProposalStatus.ABERTO
    };
    await storage.saveProposal(newProp);
    await loadData();
  };

  const generatePDF = async (prop: Proposal) => {
    setGenerating(prop.id);
    setActiveProp(prop);
    
    // Pequeno delay para garantir que o estado activeProp foi processado no DOM
    setTimeout(async () => {
      if (!pdfRef.current) return;
      try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pages = pdfRef.current.children;
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i] as HTMLElement;
          const canvas = await html2canvas(page, { scale: 2, useCORS: true, logging: false, windowWidth: 794 });
          const imgData = canvas.toDataURL('image/png');
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        }
        const cust = getCustomer(prop.customerId);
        pdf.save(`${prop.code}-${cust?.companyName || 'proposta'}.pdf`);
      } catch (err) {
        console.error(err);
        alert('Erro ao gerar PDF.');
      } finally {
        setGenerating(null);
        setActiveProp(null);
      }
    }, 500);
  };

  const setF = (k: keyof PLFilters, v: string) => setFilters(prev => ({ ...prev, [k]: v }));
  const activeCount = Object.values(filters).filter(Boolean).length;

  const filtered = useMemo(() => proposals.filter(p => {
    const cust = getCustomer(p.customerId);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match = (cust?.companyName || '').toLowerCase().includes(q)
        || p.code.toLowerCase().includes(q)
        || p.title.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filters.sellerId && p.sellerId !== filters.sellerId) return false;
    if (filters.customerId && p.customerId !== filters.customerId) return false;
    if (filters.pricingModel && p.pricingModel !== filters.pricingModel) return false;
    if (filters.status && p.status !== filters.status) return false;
    return true;
  }), [proposals, filters, customers]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 size={40} className="animate-spin text-blue-600" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Sincronizando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Vendas e Propostas</h2>
          <p className="text-slate-500 font-medium text-sm">Controle seus documentos comerciais.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterOpen(o => !o)}
            className={`relative flex items-center gap-2 font-bold py-2.5 px-4 rounded-xl text-sm transition border shadow-sm ${filterOpen || activeCount > 0 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Filter size={15} /> Filtros
            {activeCount > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{activeCount}</span>}
          </button>
          <button onClick={() => navigate('/proposals/new')} className="bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-5 rounded-xl flex items-center gap-2 transition shadow-xl text-sm">
            <PlusCircle size={18} /> Novo Projeto
          </button>
        </div>
      </div>

      {/* Painel de Filtros */}
      {filterOpen && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Busca</label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Código, empresa..." className="w-full pl-8 pr-3 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none" value={filters.search} onChange={e => setF('search', e.target.value)} />
              </div>
            </div>
            {/* Outros selects de filtro... */}
          </div>
          {activeCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
              {filters.search && <Chip label={`"${filters.search}"`} onRemove={() => setF('search', '')} />}
              {filters.status && <Chip label={`Status: ${filters.status}`} onRemove={() => setF('status', '')} />}
              <button onClick={() => setFilters(EMPTY)} className="text-[10px] font-black text-red-500 uppercase ml-auto">Limpar Tudo</button>
            </div>
          )}
        </div>
      )}

      {/* Tabela de Resultados */}
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Código</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Empresa</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-all">
                <td className="px-6 py-5 font-mono text-xs font-black text-blue-600">{p.code}</td>
                <td className="px-6 py-5 text-sm font-black text-slate-800">{getCustomer(p.customerId)?.companyName || 'N/A'}</td>
                <td className="px-6 py-5 text-right space-x-1">
                  <button onClick={() => handleDuplicate(p)} className="p-2 text-slate-400 hover:text-blue-600"><Copy size={16} /></button>
                  <button onClick={() => navigate(`/proposals/edit/${p.id}`)} className="p-2 text-slate-400 hover:text-blue-600"><Edit size={16} /></button>
                  <button onClick={() => generatePDF(p)} disabled={generating === p.id} className="p-2 text-slate-400 hover:text-emerald-600">
                    {generating === p.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TEMPLATE PDF (Escondido da visualização principal) */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div className="pdf-template" ref={pdfRef}>
          {activeProp && (
            <>
              {/* PÁGINA 1: CAPA */}
              <div className="pdf-page bg-white w-[210mm] h-[297mm] relative overflow-hidden flex flex-col items-center justify-end pb-24">
                {masterData.layoutImages.cover && <img src={masterData.layoutImages.cover} className="absolute inset-0 w-full h-full object-cover" alt="Capa" />}
                <div className="relative z-10 text-center">
                  <h2 className="text-2xl font-medium text-slate-700 uppercase tracking-widest">Proposta Comercial</h2>
                  <p className="text-4xl font-black text-slate-900 uppercase">Nº {activeProp.code}</p>
                </div>
              </div>

              {/* PÁGINA 2: ITENS */}
              <div className="pdf-page bg-white w-[210mm] h-[297mm] p-16 flex flex-col relative">
                <div className="flex justify-center mb-8">
                  <div className="text-[#00AEEF] text-3xl font-black">DATICOPY</div>
                </div>
                <div className="mb-6">
                   <h1 className="text-2xl font-black text-slate-900">{getCustomer(activeProp.customerId)?.companyName}</h1>
                   <p className="text-sm text-slate-500">{formatFullDate(activeProp.date)}</p>
                </div>
                
                <div className="space-y-8">
                  {activeProp.items.map((item, idx) => {
                    const eq = equipments.find(e => e.id === item.equipmentId);
                    return (
                      <div key={idx} className="border-b border-slate-100 pb-4">
                        <p className="font-bold text-blue-600">Item {idx + 1}: {eq?.model || item.extraDescription}</p>
                        <p className="text-xs text-slate-600">{eq?.specs}</p>
                        <p className="font-black mt-2">Qtd: {item.quantity} | {formatCurrency(activeProp.pricingModel === PricingModel.VENDA ? (item.unitValue || 0) : (item.monthlyValue || 0))}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProposalList;

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, PlusCircle, Edit, Download, Loader2, Printer, Copy, Trash2, User as UserIcon, Star, Filter, X, ChevronDown, Search } from 'lucide-react';
import { storage } from '../services/storage';
import { User, Proposal, ProposalStatus, PricingModel, Customer, Equipment, MasterData } from '../types';
import { INITIAL_MASTER_DATA } from '../constants';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const getSeller = (id: string) => allUsers.find(u => u.id === id);

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

  const getTotalLabel = (model: PricingModel): string | null => {
    // Venda: não exibe total consolidado (itens já mostram valor unitário individualmente)
    if (model === PricingModel.OUTSOURCING) return 'Valor Total Mensal';
    return null;
  };

  const handleDelete = async (id: string) => {
    const prop = proposals.find(p => p.id === id);
    if (window.confirm('Deseja realmente excluir esta proposta? Esta ação é irreversível.')) {
      await storage.deleteProposal(id);
      storage.addLog({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), userId: user.id, userName: user.name, module: 'proposta', action: 'excluir', recordId: id, description: `Excluiu proposta ${prop?.code || id} — ${getCustomer(prop?.customerId || '')?.companyName || ''}` });
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
    storage.addLog({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), userId: user.id, userName: user.name, module: 'proposta', action: 'criar', recordId: newProp.id, description: `Duplicou proposta ${prop.code} → ${newProp.code} — ${getCustomer(prop.customerId)?.companyName || ''}` });
    await loadData();
  };

  const generatePDF = async (prop: Proposal) => {
    setGenerating(prop.id);
    setActiveProp(prop);
    setTimeout(async () => {
      if (!pdfRef.current) return;
      try {
        const pdf = new jsPDF('p', 'mm', 'a4', true);
        const pages = pdfRef.current.children;
        // A4 a 96dpi = 794x1123px — tamanho fixo de saída
        const OUT_W = 794;
        const OUT_H = 1123;
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i] as HTMLElement;
          const canvas = await html2canvas(page, {
            scale: 1,
            useCORS: true,
            logging: false,
            windowWidth: 794,
            imageTimeout: 0,
            backgroundColor: '#ffffff',
          });
          // Redimensiona para tamanho fixo, independente do canvas original
          const resized = document.createElement('canvas');
          resized.width = OUT_W;
          resized.height = OUT_H;
          const ctx = resized.getContext('2d')!;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, OUT_W, OUT_H);
          ctx.drawImage(canvas, 0, 0, OUT_W, OUT_H);
          // JPEG 0.60 — bom visual, arquivo leve (~1-3MB por página)
          const imgData = resized.toDataURL('image/jpeg', 0.60);
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, `pg${i}`, 'FAST');
        }
        const cust = getCustomer(prop.customerId);
        pdf.save(`${prop.code}-${cust?.companyName || 'proposta'}.pdf`);
      } catch (err) {
        alert('Erro ao gerar PDF.');
      } finally {
        setGenerating(null);
        setActiveProp(null);
      }
    }, 1500);
  };

  const getProposalBreakdown = (prop: Proposal) => {
    const totalMonoFranchise = prop.items.reduce((acc, curr) => acc + (curr.monoFranchise * curr.quantity), 0);
    const monoExcessRate = prop.items.find(i => i.monoExcess > 0)?.monoExcess || 0;
    const monoClickRate = prop.items.find(i => (i.monoClickPrice || 0) > 0)?.monoClickPrice || 0;
    const colorItems = prop.items.filter(item => equipments.find(e => e.id === item.equipmentId)?.isColor);
    const totalColorFranchise = colorItems.reduce((acc, curr) => acc + ((curr.colorFranchise || 0) * curr.quantity), 0);
    const colorExcessRate = colorItems.find(i => (i.colorExcess || 0) > 0)?.colorExcess || 0;
    const colorClickRate = colorItems.find(i => (i.colorClickPrice || 0) > 0)?.colorClickPrice || 0;
    return {
      mono: { totalFranchise: totalMonoFranchise, excessRate: monoExcessRate, clickRate: monoClickRate },
      color: { totalFranchise: totalColorFranchise, excessRate: colorExcessRate, clickRate: colorClickRate }
    };
  };

  // ── Filtro aplicado ──
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
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Sincronizando com Banco de Dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 font-montserrat tracking-tight">Vendas e Propostas</h2>
          <p className="text-slate-500 font-medium text-sm">Controle total sobre seus documentos comerciais.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterOpen(o => !o)}
            className={`relative flex items-center gap-2 font-bold py-2.5 px-4 rounded-xl text-sm transition border shadow-sm ${filterOpen || activeCount > 0 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Filter size={15} /> Filtros
            {activeCount > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{activeCount}</span>}
          </button>
          <button onClick={() => navigate('/proposals/new')} className="bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-5 rounded-xl flex items-center gap-2 transition shadow-xl shadow-blue-100 text-sm">
            <PlusCircle size={18} /> Novo Projeto
          </button>
        </div>
      </div>

      {/* Painel de filtros */}
      {filterOpen && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-700 text-sm uppercase tracking-wider flex items-center gap-2"><Filter size={13} /> Filtrar Propostas</h3>
            {activeCount > 0 && (
              <button onClick={() => setFilters(EMPTY)} className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-wider flex items-center gap-1">
                <X size={11} /> Limpar
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Busca */}
            <div className="lg:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Busca</label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="text" placeholder="Código, empresa, título..." className="w-full pl-8 pr-3 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400" value={filters.search} onChange={e => setF('search', e.target.value)} />
              </div>
            </div>
            {/* Consultor (só ADMIN) */}
            {user.role === 'ADMIN' && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Consultor</label>
                <div className="relative">
                  <select className="w-full p-2.5 bg-slate-50 rounded-xl font-bold text-sm appearance-none pr-7 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400" value={filters.sellerId} onChange={e => setF('sellerId', e.target.value)}>
                    <option value="">Todos</option>
                    {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}
            {/* Cliente */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cliente</label>
              <div className="relative">
                <select className="w-full p-2.5 bg-slate-50 rounded-xl font-bold text-sm appearance-none pr-7 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400" value={filters.customerId} onChange={e => setF('customerId', e.target.value)}>
                  <option value="">Todos</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            {/* Modelo */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Modelo</label>
              <div className="relative">
                <select className="w-full p-2.5 bg-slate-50 rounded-xl font-bold text-sm appearance-none pr-7 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400" value={filters.pricingModel} onChange={e => setF('pricingModel', e.target.value)}>
                  <option value="">Todos</option>
                  {Object.values(PricingModel).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            {/* Status */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status</label>
              <div className="relative">
                <select className="w-full p-2.5 bg-slate-50 rounded-xl font-bold text-sm appearance-none pr-7 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400" value={filters.status} onChange={e => setF('status', e.target.value)}>
                  <option value="">Todos</option>
                  {Object.values(ProposalStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
          {/* Chips */}
          {activeCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
              {filters.search && <Chip label={`"${filters.search}"`} onRemove={() => setF('search', '')} />}
              {filters.sellerId && <Chip label={`Consultor: ${allUsers.find(u => u.id === filters.sellerId)?.name || '—'}`} onRemove={() => setF('sellerId', '')} />}
              {filters.customerId && <Chip label={`Cliente: ${customers.find(c => c.id === filters.customerId)?.companyName || '—'}`} onRemove={() => setF('customerId', '')} />}
              {filters.pricingModel && <Chip label={`Modelo: ${filters.pricingModel}`} onRemove={() => setF('pricingModel', '')} />}
              {filters.status && <Chip label={`Status: ${filters.status}`} onRemove={() => setF('status', '')} />}
            </div>
          )}
        </div>
      )}

      {/* Tabela */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-300 bg-white rounded-[40px] border border-slate-100">
          <FileText className="mx-auto mb-4 opacity-20" size={56} />
          <p className="text-sm font-medium">{proposals.length === 0 ? 'Nenhuma proposta criada ainda.' : 'Nenhuma proposta com esses filtros.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between px-8 py-4 border-b border-slate-50 gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {filtered.length} proposta(s){activeCount > 0 ? ' filtrada(s)' : ''}
            </span>
            {/* Somatório por modelo nos resultados filtrados */}
            <div className="flex flex-wrap gap-3">
              {(() => {
                const vendaTotal = filtered.filter(p => p.pricingModel === PricingModel.VENDA).reduce((a, p) => a + p.totalValue, 0);
                const outsTotal = filtered.filter(p => p.pricingModel === PricingModel.OUTSOURCING).reduce((a, p) => a + p.totalValue, 0);
                const cliqQty = filtered.filter(p => p.pricingModel === PricingModel.CLIQUE).length;
                return (
                  <>
                    {vendaTotal > 0 && (
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                        Venda: {formatCurrency(vendaTotal)}
                      </span>
                    )}
                    {outsTotal > 0 && (
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                        Outsourcing/mês: {formatCurrency(outsTotal)}
                      </span>
                    )}
                    {cliqQty > 0 && (
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                        Clique: {cliqQty} proposta(s)
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Código</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresa / Negócio</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Investimento</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(p => {
                  const customer = getCustomer(p.customerId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-6 py-5">
                        <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">{p.code}</span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-black text-slate-800">{customer?.companyName || 'N/A'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{p.title}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-black text-slate-700">
                          {p.pricingModel === PricingModel.CLIQUE
                            ? '— Por Clique'
                            : formatCurrency(p.totalValue)}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{p.pricingModel}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${p.status === ProposalStatus.FECHADO ? 'bg-emerald-100 text-emerald-700' : p.status === ProposalStatus.ABERTO ? 'bg-blue-100 text-blue-700' : p.status === ProposalStatus.EM_NEGOCIACAO ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{p.status}</span>
                      </td>
                      <td className="px-6 py-5 text-right space-x-1">
                        <button onClick={() => handleDuplicate(p)} className="p-2.5 text-slate-300 hover:text-blue-600 transition rounded-xl hover:bg-white hover:shadow-md" title="Duplicar"><Copy size={16} /></button>
                        <button onClick={() => navigate(`/proposals/edit/${p.id}`)} className="p-2.5 text-slate-300 hover:text-blue-600 transition rounded-xl hover:bg-white hover:shadow-md" title="Editar"><Edit size={16} /></button>
                        <button onClick={() => generatePDF(p)} disabled={generating === p.id} className={`p-2.5 transition rounded-xl ${generating === p.id ? 'text-blue-600' : 'text-slate-300 hover:text-emerald-600 hover:bg-white hover:shadow-md'}`} title="Baixar PDF">{generating === p.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}</button>
                        <button onClick={() => handleDelete(p.id)} className="p-2.5 text-slate-300 hover:text-red-500 transition rounded-xl hover:bg-white hover:shadow-md" title="Excluir"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TEMPLATE DO PDF */}
      {activeProp && (
        <div className="pdf-template" ref={pdfRef}>

          {/* PÁGINA 1: CAPA */}
          <div className="pdf-page flex flex-col items-center justify-end pb-24 relative bg-white overflow-hidden">
            {masterData.layoutImages.cover && <img src={masterData.layoutImages.cover} className="w-full h-full object-cover absolute inset-0" alt="Capa" />}
            <div className="relative z-10 flex flex-col items-center text-center">
              <h2 className="text-2xl font-medium text-slate-700 uppercase tracking-[0.2em] mb-1">Proposta Comercial</h2>
              <p className="text-4xl font-black text-slate-900 font-montserrat uppercase tracking-tight mb-4">Nº {activeProp.code}</p>
            </div>
          </div>

          {/* PÁGINA 2: APRESENTAÇÃO */}
          <div className="pdf-page flex flex-col items-center justify-center relative bg-white overflow-hidden">
            {masterData.layoutImages.intro && <img src={masterData.layoutImages.intro} className="w-full h-full object-cover absolute inset-0" alt="Apresentação" />}
          </div>

          {/* PÁGINAS DE EQUIPAMENTOS — 2 itens por página (itens normais) */}
          {(() => {
            // Separa equipamentos normais de ítens extras
            const normalItems = activeProp.items.filter(i => !i.isExtra);
            const extraItems = activeProp.items.filter(i => i.isExtra);

            const chunks: typeof activeProp.items[] = [];
            for (let i = 0; i < normalItems.length; i += 2) {
              chunks.push(normalItems.slice(i, i + 2));
            }

            return chunks.map((chunk, pageIdx) => (
              <div key={pageIdx} className="pdf-page flex flex-col p-16 bg-white relative">
                {masterData.layoutImages.background && (
                  <img src={masterData.layoutImages.background} className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none" alt="Fundo" />
                )}
                <div className="relative z-10 flex-1 flex flex-col">
                  <div className="flex justify-center mb-8">
                    <div className="text-[#00AEEF] text-3xl font-black font-montserrat tracking-tighter uppercase">DATICOPY</div>
                  </div>

                  {pageIdx === 0 && (
                    <div className="mb-10 flex flex-col items-center">
                      <div className="bg-slate-50/50 backdrop-blur-sm p-8 rounded-[32px] border border-slate-100 w-full text-center shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{formatFullDate(activeProp.date)}</p>
                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.4em] mb-3">Proposta Comercial Preparada Para:</p>
                        <h1 className="text-2xl font-black text-slate-900 font-montserrat uppercase tracking-tighter leading-tight mb-2">
                          {getCustomer(activeProp.customerId)?.companyName}
                        </h1>
                        <div className="flex items-center justify-center gap-2 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-t border-slate-100 mt-3 pt-3">
                          <UserIcon size={12} className="text-blue-500" />
                          <span>A/C: {getCustomer(activeProp.customerId)?.contactName}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-10 flex-1">
                    {chunk.map((item, idx) => {
                      const globalIdx = (pageIdx * 2) + idx;
                      const eq = equipments.find(e => e.id === item.equipmentId);
                      const itemSubtotal = activeProp.pricingModel === PricingModel.VENDA
                        ? (item.unitValue || 0) * item.quantity
                        : (item.monthlyValue || 0) * item.quantity;

                      return (
                        <div key={globalIdx} className="space-y-4">
                          {/* Cabeçalho do ítem */}
                          <div className="bg-[#00f2ff]/20 p-3 border-l-8 border-[#FFFF00] rounded-r-xl flex justify-between items-center">
                            <p className="text-slate-900 font-bold text-xs leading-tight">
                              Tipo {globalIdx + 1}) {eq?.title} ({item.quantity} unidade(s))
                            </p>
                            {/* Valor do ítem — apenas se não for Clique */}
                            {activeProp.pricingModel !== PricingModel.CLIQUE && (
                              <div className="text-right">
                                <p className="text-[9px] font-bold text-slate-500 uppercase">
                                  {activeProp.pricingModel === PricingModel.VENDA ? 'Valor Unitário' : 'Valor Mensal'}
                                </p>
                                <p className="text-sm font-black text-slate-800">
                                  {activeProp.pricingModel === PricingModel.VENDA
                                    ? formatCurrency(item.unitValue || 0)
                                    : formatCurrency(item.monthlyValue || 0)}
                                  {item.quantity > 1 && (
                                    <span className="text-[9px] text-slate-400 font-bold ml-1">× {item.quantity} = {formatCurrency(itemSubtotal)}</span>
                                  )}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="text-center">
                            <h3 className="text-[#00AEEF] text-base font-bold uppercase tracking-tight">
                              {eq?.type} {eq?.model}
                            </h3>
                          </div>

                          <div className="flex gap-8 items-start">
                            <div className="w-1/3 aspect-square bg-white border border-slate-100 rounded-3xl flex items-center justify-center p-3">
                              {eq?.imageUrl ? <img src={eq.imageUrl} className="w-full h-full object-contain mix-blend-multiply" alt={eq.model} /> : <Printer size={40} className="text-slate-200" />}
                            </div>
                            <div className="w-2/3 flex flex-col gap-2">
                              <p className="text-slate-700 text-[11px] leading-relaxed text-justify font-medium">{eq?.specs}</p>
                              {/* Texto / observação do ítem */}
                              {item.itemNote && (
                                <p className="text-[10px] text-slate-500 italic border-l-2 border-blue-200 pl-3 mt-1">{item.itemNote}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-auto pt-6 border-t border-slate-100 text-[9px] text-center text-slate-400 italic font-bold">
                    Daticopy Comércio e Representações LTDA - Rua Alm. Ari Parreiras, 355 - Rocha, Rio de Janeiro - RJ – Tel.: (21) 2582-2700 - www.daticopyrj.com.br
                  </div>
                </div>
              </div>
            ));
          })()}

          {/* PÁGINA DE ÍTENS EXTRAS (se houver) */}
          {activeProp.items.some(i => i.isExtra) && (() => {
            const extraItems = activeProp.items.filter(i => i.isExtra);
            return (
              <div className="pdf-page flex flex-col p-16 bg-white relative">
                {masterData.layoutImages.background && (
                  <img src={masterData.layoutImages.background} className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none" alt="Fundo" />
                )}
                <div className="relative z-10 flex-1 flex flex-col">
                  <div className="flex justify-center mb-8">
                    <div className="text-[#00AEEF] text-3xl font-black font-montserrat tracking-tighter uppercase">DATICOPY</div>
                  </div>

                  <h2 className="text-[#00AEEF] text-xl font-black uppercase mb-6 border-l-8 border-[#00AEEF] pl-4">
                    Ítens Adicionais
                  </h2>

                  <div className="space-y-4">
                    {extraItems.map((item, idx) => {
                      const itemValue = activeProp.pricingModel === PricingModel.VENDA
                        ? (item.unitValue || 0) * item.quantity
                        : (item.monthlyValue || 0) * item.quantity;

                      return (
                        <div key={idx} className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-amber-400 mt-1"></div>
                              <p className="font-black text-slate-800 text-sm">
                                {item.quantity}× {item.extraDescription || 'Ítem Extra'}
                              </p>
                            </div>
                            {activeProp.pricingModel !== PricingModel.CLIQUE && (
                              <div className="text-right">
                                {item.quantity > 1 && (
                                  <p className="text-[9px] text-slate-400">
                                    {activeProp.pricingModel === PricingModel.VENDA
                                      ? formatCurrency(item.unitValue || 0)
                                      : formatCurrency(item.monthlyValue || 0)} × {item.quantity}
                                  </p>
                                )}
                                <p className="font-black text-slate-800">{formatCurrency(itemValue)}</p>
                              </div>
                            )}
                          </div>
                          {item.itemNote && (
                            <p className="text-[10px] text-slate-500 italic border-l-2 border-amber-300 pl-3 mt-2">{item.itemNote}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-auto pt-6 border-t border-slate-100 text-[9px] text-center text-slate-400 italic font-bold">
                    Daticopy Comércio e Representações LTDA - Rua Alm. Ari Parreiras, 355 - Rocha, Rio de Janeiro - RJ – Tel.: (21) 2582-2700 - www.daticopyrj.com.br
                  </div>
                </div>
              </div>
            );
          })()}

          {/* PÁGINA FINAL: CONDIÇÕES COMERCIAIS */}
          <div className="pdf-page flex flex-col p-16 bg-white relative">
            {masterData.layoutImages.background && <img src={masterData.layoutImages.background} className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none" alt="Fundo" />}
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-center mb-10 border-b-2 border-slate-50 pb-6">
                <div className="text-[#00AEEF] text-3xl font-black font-montserrat tracking-tighter uppercase">DATICOPY</div>
              </div>

              <h2 className="text-[#00AEEF] text-2xl font-black uppercase mb-8 border-l-8 border-[#00AEEF] pl-6">CONDIÇÕES COMERCIAIS</h2>

              <div className="border-2 border-slate-100 rounded-[40px] overflow-hidden mb-8 shadow-sm bg-white/80 backdrop-blur-sm">
                <div className="bg-[#eff6ff]/50 p-6 text-[#1e40af] font-black uppercase text-sm border-b-2 border-slate-100 flex items-center gap-3">
                  <div className="w-2 h-6 bg-[#00AEEF] rounded-full"></div>
                  Investimento em {activeProp.pricingModel}
                </div>

                <div className="divide-y-2 divide-slate-50">

                  {/* ── RESUMO POR ÍTEM ── */}
                  <div className="p-6 px-8">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Detalhamento dos Ítens</p>
                    <div className="space-y-2">
                      {activeProp.items.map((item, idx) => {
                        const eq = equipments.find(e => e.id === item.equipmentId);
                        const isExtra = item.isExtra;
                        const label = isExtra
                          ? (item.extraDescription || 'Ítem Extra')
                          : (eq ? `${eq.brand} ${eq.model}` : 'Equipamento');
                        const itemSubtotal = activeProp.pricingModel === PricingModel.VENDA
                          ? (item.unitValue || 0) * item.quantity
                          : (item.monthlyValue || 0) * item.quantity;

                        return (
                          <div key={idx} className={`flex justify-between items-center py-2 px-3 rounded-xl text-xs ${isExtra ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50'}`}>
                            <div className="flex items-center gap-2">
                              {isExtra && <span className="text-amber-500 text-[9px] font-black uppercase">★ Extra</span>}
                              <span className="font-bold text-slate-700">{item.quantity}× {label}</span>
                              {item.itemNote && <span className="text-[9px] text-slate-400 italic ml-1">— {item.itemNote}</span>}
                            </div>
                            {activeProp.pricingModel !== PricingModel.CLIQUE ? (
                              <span className="font-black text-slate-800">{formatCurrency(itemSubtotal)}</span>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400 uppercase">por clique</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── TOTAL (apenas Venda e Outsourcing) ── */}
                  {getTotalLabel(activeProp.pricingModel) && (
                    <div className="p-8 flex justify-between items-center bg-slate-50/50">
                      <span className="text-slate-500 font-black uppercase text-[11px] tracking-widest">
                        {getTotalLabel(activeProp.pricingModel)}:
                      </span>
                      <span className="font-black text-3xl text-slate-900 font-montserrat tracking-tighter">
                        {formatCurrency(activeProp.totalValue)}
                      </span>
                    </div>
                  )}

                  {/* ── CLIQUE: só mostra preços por página, sem total ── */}
                  {activeProp.pricingModel === PricingModel.CLIQUE && (() => {
                    const breakdown = getProposalBreakdown(activeProp);
                    return (
                      <div className="p-6 px-8 bg-emerald-50/30">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Preço por Página Produzida</p>
                        {breakdown.mono.clickRate > 0 && (
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-500 font-bold text-xs">P&B (Monocromática):</span>
                            <span className="font-black text-slate-800">R$ {breakdown.mono.clickRate.toFixed(3)}</span>
                          </div>
                        )}
                        {breakdown.color.clickRate > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-blue-500 font-bold text-xs">Colorida:</span>
                            <span className="font-black text-blue-700">R$ {breakdown.color.clickRate.toFixed(3)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── OUTSOURCING: franquias ── */}
                  {activeProp.pricingModel === PricingModel.OUTSOURCING && (() => {
                    const breakdown = getProposalBreakdown(activeProp);
                    return (
                      <>
                        {breakdown.mono.totalFranchise > 0 && (
                          <div className="p-6 px-8 bg-slate-50/20">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Impressão Monocromática</p>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-slate-500 font-bold text-xs">Franquia:</span>
                              <span className="font-black text-slate-800">{breakdown.mono.totalFranchise.toLocaleString('pt-BR')} pág</span>
                            </div>
                            {breakdown.mono.excessRate > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-bold text-xs">Excedente:</span>
                                <span className="font-black text-slate-800">R$ {breakdown.mono.excessRate.toFixed(3)}/pág</span>
                              </div>
                            )}
                          </div>
                        )}
                        {breakdown.color.totalFranchise > 0 && (
                          <div className="p-6 px-8 bg-blue-50/10">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Impressão Colorida</p>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-blue-600 font-bold text-xs">Franquia:</span>
                              <span className="font-black text-blue-700">{breakdown.color.totalFranchise.toLocaleString('pt-BR')} pág</span>
                            </div>
                            {breakdown.color.excessRate > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-blue-500 font-bold text-xs">Excedente:</span>
                                <span className="font-black text-blue-600">R$ {breakdown.color.excessRate.toFixed(3)}/pág</span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* CONDIÇÕES SELECIONADAS */}
              {(activeProp.selectedConditions?.length ?? 0) > 0 && (
                <div className="border-2 border-slate-100 rounded-[40px] overflow-hidden shadow-sm bg-white/80 backdrop-blur-sm mb-8">
                  <div className="bg-[#f8fafc]/50 p-6 text-slate-800 font-black uppercase text-sm border-b-2 border-slate-100 flex items-center gap-3">
                    <div className="w-2 h-6 bg-slate-400 rounded-full"></div>
                    Condições Gerais
                  </div>
                  <div className="p-8 space-y-4">
                    {activeProp.selectedConditions?.map(id => {
                      const cond = masterData.commercialConditions.find(c => c.id === id);
                      return cond ? (
                        <div key={id} className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                          <span className="text-xs font-black text-slate-700 uppercase">{cond.condition}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* ASSINATURA */}
              {(() => {
                const propSeller = getSeller(activeProp.sellerId) || user;
                return (
                  <div className="mt-auto flex justify-between items-end p-8 border-t-4 border-slate-50">
                    <div className="space-y-1">
                      <p className="font-black text-slate-900 text-lg font-montserrat">{propSeller.name}</p>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{propSeller.title}</p>
                      <p className="text-[#00AEEF] text-sm font-black underline">{propSeller.email}</p>
                      <div className="flex gap-4 mt-2">
                        {propSeller.phone && <p className="text-slate-600 text-[11px] font-bold"><span className="text-[#00AEEF] mr-1">T:</span> {propSeller.phone}</p>}
                        {propSeller.mobile && <p className="text-slate-600 text-[11px] font-bold"><span className="text-[#00AEEF] mr-1">C:</span> {propSeller.mobile}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#00AEEF] text-2xl font-black font-montserrat tracking-tighter">DATICOPY</div>
                      <p className="text-slate-300 text-[9px] font-bold uppercase tracking-widest">Desde 1987</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

const Chip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black rounded-full uppercase tracking-wider">
    {label}
    <button onClick={onRemove} className="hover:text-red-500 transition"><X size={10} /></button>
  </span>
);

export default ProposalList;

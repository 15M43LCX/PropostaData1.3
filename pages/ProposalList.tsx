import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, PlusCircle, Edit, Download, Loader2, Printer, Copy, Trash2, User as UserIcon } from 'lucide-react';
import { storage } from '../services/storage';
import { User, Proposal, ProposalStatus, PricingModel, Customer, Equipment, MasterData } from '../types';
import { INITIAL_MASTER_DATA } from '../constants';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
        alert('Erro ao gerar PDF.');
      } finally {
        setGenerating(null);
        setActiveProp(null);
      }
    }, 1500);
  };

  // Lógica de Breakdown Corrigida para suportar Venda, Outsourcing e Clique
  const getProposalBreakdown = (prop: Proposal) => {
    const totalMonoFranchise = prop.items.reduce((acc, curr) => acc + (curr.monoFranchise * curr.quantity), 0);
    const monoExcessRate = prop.items.find(i => i.monoExcess > 0)?.monoExcess || 0;
    
    // Captura o preço por página/clique
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 size={40} className="animate-spin text-blue-600" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Sincronizando com Banco de Dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ... Cabeçalho idêntico ao original ... */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-800 font-montserrat tracking-tight">Vendas e Propostas</h2>
          <p className="text-slate-500 font-medium">Controle total sobre seus documentos comerciais.</p>
        </div>
        <button onClick={() => navigate('/proposals/new')} className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-10 rounded-2xl flex items-center gap-3 transition shadow-xl shadow-blue-100 uppercase text-xs tracking-widest">
          <PlusCircle size={20} /> Novo Projeto
        </button>
      </div>

      {proposals.length === 0 ? (
        <div className="text-center py-20 text-slate-300 bg-white rounded-[40px] border border-slate-100">
          <FileText className="mx-auto mb-4 opacity-20" size={56} />
          <p className="text-sm font-medium">Nenhuma proposta criada ainda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Código</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresa / Negócio</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Investimento</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {proposals.map(p => {
                  const customer = getCustomer(p.customerId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-8 py-6">
                        <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">{p.code}</span>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-black text-slate-800">{customer?.companyName || 'N/A'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{p.title}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-black text-slate-700">R$ {p.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{p.pricingModel}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${p.status === ProposalStatus.FECHADO ? 'bg-emerald-100 text-emerald-700' : p.status === ProposalStatus.ABERTO ? 'bg-blue-100 text-blue-700' : p.status === ProposalStatus.EM_NEGOCIACAO ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{p.status}</span>
                      </td>
                      <td className="px-8 py-6 text-right space-x-2">
                        <button onClick={() => handleDuplicate(p)} className="p-3 text-slate-300 hover:text-blue-600 transition rounded-xl hover:bg-white hover:shadow-md" title="Duplicar Proposta"><Copy size={18} /></button>
                        <button onClick={() => navigate(`/proposals/edit/${p.id}`)} className="p-3 text-slate-300 hover:text-blue-600 transition rounded-xl hover:bg-white hover:shadow-md" title="Editar Proposta"><Edit size={18} /></button>
                        <button onClick={() => generatePDF(p)} disabled={generating === p.id} className={`p-3 transition rounded-xl ${generating === p.id ? 'text-blue-600' : 'text-slate-300 hover:text-emerald-600 hover:bg-white hover:shadow-md'}`} title="Baixar PDF">{generating === p.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}</button>
                        <button onClick={() => handleDelete(p.id)} className="p-3 text-slate-300 hover:text-red-500 transition rounded-xl hover:bg-white hover:shadow-md" title="Excluir Proposta"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeProp && (
        <div className="pdf-template" ref={pdfRef}>
          {/* ... Páginas 1 e 2 idênticas ... */}
          <div className="pdf-page flex flex-col items-center justify-end pb-24 relative bg-white overflow-hidden">
             {masterData.layoutImages.cover && <img src={masterData.layoutImages.cover} className="w-full h-full object-cover absolute inset-0" alt="Capa" />}
             <div className="relative z-10 flex flex-col items-center text-center">
               <h2 className="text-2xl font-medium text-slate-700 uppercase tracking-[0.2em] mb-1">Proposta Comercial</h2>
               <p className="text-4xl font-black text-slate-900 font-montserrat uppercase tracking-tight mb-4">Nº {activeProp.code}</p>
             </div>
          </div>

          <div className="pdf-page flex flex-col items-center justify-center relative bg-white overflow-hidden">
             {masterData.layoutImages.intro && <img src={masterData.layoutImages.intro} className="w-full h-full object-cover absolute inset-0" alt="Apresentação" />}
          </div>

          {/* Renderização dos Itens */}
          {(() => {
            const chunks: typeof activeProp.items[] = [];
            for (let i = 0; i < activeProp.items.length; i += 2) {
              chunks.push(activeProp.items.slice(i, i + 2));
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
                      return (
                        <div key={globalIdx} className="space-y-4">
                          <div className="bg-[#00f2ff]/20 p-3 border-l-8 border-[#FFFF00] rounded-r-xl">
                            <p className="text-slate-900 font-bold text-xs leading-tight">
                              Tipo {globalIdx + 1}) {eq?.title} ({item.quantity} unidade(s))
                            </p>
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
                            <div className="w-2/3 text-slate-700 text-[11px] leading-relaxed text-justify font-medium">
                              {eq?.specs}
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

          {/* PÁGINA FINAL: CONDIÇÕES COMERCIAIS ADAPTADAS */}
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
                  <div className="p-8 flex justify-between items-center">
                    <span className="text-slate-500 font-black uppercase text-[11px] tracking-widest">
                      {activeProp.pricingModel === PricingModel.VENDA ? 'Valor Total do Investimento:' : 'Valor Total do (s) Equipamento (s):'}
                    </span>
                    <span className="font-black text-3xl text-slate-900 font-montserrat tracking-tighter">
                      R$ {activeProp.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {(() => {
                    const breakdown = getProposalBreakdown(activeProp);
                    const isOutsourcing = activeProp.pricingModel === PricingModel.OUTSOURCING;
                    const isClique = activeProp.pricingModel === PricingModel.CLIQUE;

                    return (
                      <>
                        {/* Seção Mono */}
                        {(isOutsourcing || isClique) && (breakdown.mono.clickRate > 0 || breakdown.mono.totalFranchise > 0) && (
                          <div className="p-6 px-8 bg-slate-50/20">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-1">Serviços de Impressão Monocromática (P&B)</p>
                            
                            {/* Só mostra franquia se for Outsourcing */}
                            {isOutsourcing && breakdown.mono.totalFranchise > 0 && (
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-slate-500 font-bold text-xs">FRANQUIA:</span>
                                <span className="font-black text-slate-800">{breakdown.mono.totalFranchise.toLocaleString('pt-BR')} pág</span>
                              </div>
                            )}

                            {/* Mostra o preço por página (Clique) para ambos os modelos */}
                            {breakdown.mono.clickRate > 0 && (
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-blue-500 font-bold text-[10px]">PÁGINA PRODUZIDA:</span>
                                <span className="font-black text-blue-600">R$ {breakdown.mono.clickRate.toFixed(3)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Seção Colorida */}
                        {(isOutsourcing || isClique) && (breakdown.color.clickRate > 0 || breakdown.color.totalFranchise > 0) && (
                          <div className="p-6 px-8 bg-blue-50/10 border-t-2 border-slate-50">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 border-b border-blue-50 pb-1">Serviços de Impressão Colorida</p>
                            
                            {isOutsourcing && breakdown.color.totalFranchise > 0 && (
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-blue-600 font-bold text-xs">FRANQUIA:</span>
                                <span className="font-black text-blue-700">{breakdown.color.totalFranchise.toLocaleString('pt-BR')} pág</span>
                              </div>
                            )}

                            {breakdown.color.clickRate > 0 && (
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-blue-500 font-bold text-[10px]">CLIQUE:</span>
                                <span className="font-black text-blue-600">R$ {breakdown.color.clickRate.toFixed(3)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Condições e Assinaturas permanecem iguais */}
              <div className="border-2 border-slate-100 rounded-[40px] overflow-hidden shadow-sm bg-white/80 backdrop-blur-sm">
                <div className="bg-[#f8fafc]/50 p-6 text-slate-800 font-black uppercase text-sm border-b-2 border-slate-100 flex items-center gap-3">
                  <div className="w-2 h-6 bg-slate-400 rounded-full"></div>
                  Condições Comerciais
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

export default ProposalList;

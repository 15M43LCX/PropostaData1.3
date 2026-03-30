import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, AlertCircle, Star, Search, X, Printer } from 'lucide-react';
import { storage } from '../services/storage';
import { User, Proposal, PricingModel, OutsourcingSubtype, ProposalStatus, ProposalItem, Customer, Equipment, MasterData } from '../types';
import { INITIAL_MASTER_DATA } from '../constants';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ProposalEditor: React.FC<{ user: User }> = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [condSearch, setCondSearch] = useState('');
  const [eqSearch, setEqSearch] = useState('');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [masterData, setMasterData] = useState<MasterData>(INITIAL_MASTER_DATA);

  const [formData, setFormData] = useState<Proposal>({
    id: id || Math.random().toString(36).substr(2, 9),
    code: '',
    date: new Date().toLocaleDateString('pt-BR'),
    sellerId: user.id,
    customerId: '',
    title: '',
    pricingModel: PricingModel.OUTSOURCING,
    outsourcingSubtype: OutsourcingSubtype.FRANCHISE_EXCESS,
    items: [],
    paymentMethod: '',
    validity: '',
    deliveryTime: '',
    slaTime: '',
    contractTerm: '',
    selectedConditions: [],
    status: ProposalStatus.ABERTO,
    totalValue: 0
  });

  useEffect(() => {
    const load = async () => {
      const [c, e, md, proposals] = await Promise.all([
        storage.getVisibleCustomers(user),
        storage.getEquipments(),
        storage.getMasterData(),
        storage.getProposals(),
      ]);
      setCustomers(c);
      setEquipments(e);
      setMasterData(md);
      if (id) {
        const existing = proposals.find(p => p.id === id);
        if (existing) setFormData({ ...existing, selectedConditions: existing.selectedConditions || [] });
      } else {
        const year = new Date().getFullYear();
        const sequence = (proposals.length + 1).toString().padStart(3, '0');
        setFormData(prev => ({
          ...prev,
          code: `${year}${sequence}`,
          paymentMethod: md.paymentMethods[0] || '',
          validity: md.validities[0] || '',
          deliveryTime: md.deliveryTimes[0] || '',
          slaTime: md.slaTimes[0] || '',
          contractTerm: md.contractTerms[0] || '',
        }));
      }
      setLoading(false);
    };
    load();
  }, [id, user]);

  useEffect(() => {
    let total = 0;
    if (formData.pricingModel === PricingModel.VENDA)
      total = formData.items.reduce((acc, i) => acc + ((i.unitValue || 0) * i.quantity), 0);
    else if (formData.pricingModel === PricingModel.OUTSOURCING)
      total = formData.items.reduce((acc, i) => acc + ((i.monthlyValue || 0) * i.quantity), 0);
    setFormData(prev => ({ ...prev, totalValue: total }));
  }, [formData.items, formData.pricingModel]);

  const newBlankItem = (isExtra = false): ProposalItem => ({
    equipmentId: isExtra ? '' : (equipments[0]?.id || ''),
    quantity: 1, unitValue: 0, monthlyValue: 0,
    monoFranchise: 0, monoExcess: 0, monoClickPrice: 0,
    colorFranchise: 0, colorExcess: 0, colorClickPrice: 0,
    itemNote: '', isExtra, extraDescription: '',
  });

  const updateItem = (index: number, updates: Partial<ProposalItem>) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], ...updates };
    setFormData(prev => ({ ...prev, items: newItems }));
  };
  const removeItem = (i: number) =>
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, x) => x !== i) }));

  const handleSave = async () => {
    if (!formData.customerId || !formData.title || formData.items.length === 0) {
      setError('Verifique o cliente, título e se há itens adicionados.');
      return;
    }
    setIsSaving(true);
    try {
      await storage.saveProposal(formData);
      navigate('/proposals');
    } catch {
      setError('Erro ao salvar proposta.');
      setIsSaving(false);
    }
  };

  const getTotalLabel = () => {
    if (formData.pricingModel === PricingModel.VENDA) return 'Valor Total';
    if (formData.pricingModel === PricingModel.OUTSOURCING) return 'Valor Total Mensal';
    return null;
  };
  const totalLabel = getTotalLabel();

  // Filtro de condições comerciais
  const filteredConditions = masterData.commercialConditions.filter(c =>
    c.condition.toLowerCase().includes(condSearch.toLowerCase())
  );

  // Filtro de equipamentos (Step 2)
  const filteredEquipments = equipments.filter(e =>
    `${e.brand} ${e.model} ${e.type} ${e.title}`.toLowerCase().includes(eqSearch.toLowerCase())
  );

  if (loading) return (
    <div className="flex h-screen items-center justify-center font-black text-blue-600">CARREGANDO...</div>
  );

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">
          {id ? 'Editar Proposta' : 'Nova Proposta'}
        </h2>
        <div className="flex gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${step === s ? 'bg-blue-600 text-white' : step > s ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {step > s ? '✓' : s}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Cliente</label>
                  <select className="w-full p-4 bg-slate-50 rounded-xl font-bold" value={formData.customerId} onChange={e => setFormData({ ...formData, customerId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Título da Solução</label>
                  <select className="w-full p-4 bg-slate-50 rounded-xl font-bold" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}>
                    <option value="">Selecione...</option>
                    {masterData.solutionTitles.map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-2">
                <label className="text-[10px] font-black uppercase text-slate-400 block text-center mb-4">Modelo de Precificação</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.values(PricingModel).map(m => (
                    <button key={m} onClick={() => setFormData({ ...formData, pricingModel: m })}
                      className={`p-4 rounded-xl border-2 font-black text-xs transition-all ${formData.pricingModel === m ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-300 hover:border-slate-200'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="font-black text-slate-800 uppercase text-sm">Configuração dos Equipamentos</h3>
                <div className="flex gap-2">
                  <button onClick={() => setFormData(prev => ({ ...prev, items: [...prev.items, newBlankItem(true)] }))}
                    className="bg-amber-500 text-white px-3 py-2 rounded-lg font-black text-[10px] flex items-center gap-1">
                    <Star size={11} /> ÍTEM EXTRA
                  </button>
                  <button onClick={() => setFormData(prev => ({ ...prev, items: [...prev.items, newBlankItem(false)] }))}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg font-black text-[10px]">+ ITEM</button>
                </div>
              </div>

              {/* Busca de equipamentos */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filtrar equipamentos por marca, modelo ou tipo..."
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
                  value={eqSearch}
                  onChange={e => setEqSearch(e.target.value)}
                />
                {eqSearch && (
                  <button onClick={() => setEqSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={13} />
                  </button>
                )}
                {eqSearch && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                    {filteredEquipments.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Nenhum equipamento encontrado.</p>
                    ) : (
                      filteredEquipments.map(eq => (
                        <button
                          key={eq.id}
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              items: [...prev.items, { ...newBlankItem(false), equipmentId: eq.id }]
                            }));
                            setEqSearch('');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left transition"
                        >
                          {eq.imageUrl
                            ? <img src={eq.imageUrl} className="w-8 h-8 object-contain rounded-lg bg-slate-50 border border-slate-100" alt={eq.model} />
                            : <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><Printer size={14} className="text-slate-400" /></div>
                          }
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{eq.brand} {eq.model}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">{eq.type}{eq.isColor ? ' · Colorido' : ' · P&B'}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {formData.items.length === 0 && (
                <div className="text-center py-12 text-slate-300">
                  <p className="text-sm">Adicione equipamentos ou ítens extras acima.</p>
                </div>
              )}

              {formData.items.map((item, idx) => {
                const eq = equipments.find(e => e.id === item.equipmentId);
                const isColor = eq?.isColor || false;
                const isOutsourcing = formData.pricingModel === PricingModel.OUTSOURCING;
                const isVenda = formData.pricingModel === PricingModel.VENDA;
                const isClique = formData.pricingModel === PricingModel.CLIQUE;
                const subtotal = isVenda ? (item.unitValue || 0) * item.quantity : (item.monthlyValue || 0) * item.quantity;

                if (item.isExtra) {
                  return (
                    <div key={idx} className="p-5 bg-amber-50 rounded-2xl border border-amber-200 relative">
                      <button onClick={() => removeItem(idx)} className="absolute top-4 right-4 text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                      <div className="flex items-center gap-2 mb-4">
                        <Star size={13} className="text-amber-500" />
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Ítem Extra</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-3">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Descrição</label>
                          <input type="text" placeholder="Ex: Suporte técnico, Instalação..." className="w-full p-3 bg-white rounded-xl font-bold text-sm border border-amber-200" value={item.extraDescription || ''} onChange={e => updateItem(idx, { extraDescription: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase">Qtd</label>
                          <input type="number" className="w-full p-3 bg-white rounded-xl font-bold text-sm border border-amber-200" value={item.quantity} onChange={e => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })} />
                        </div>
                        <div className="sm:col-span-2">
                          {isVenda && (<>
                            <label className="text-[9px] font-black text-blue-600 uppercase">Valor Unitário (R$)</label>
                            <input type="number" className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl font-black text-blue-800" value={item.unitValue || 0} onChange={e => updateItem(idx, { unitValue: parseFloat(e.target.value) || 0 })} />
                          </>)}
                          {(isOutsourcing || isClique) && (<>
                            <label className="text-[9px] font-black text-amber-600 uppercase">Valor Mensal (R$)</label>
                            <input type="number" className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl font-black text-amber-800" value={item.monthlyValue || 0} onChange={e => updateItem(idx, { monthlyValue: parseFloat(e.target.value) || 0 })} />
                          </>)}
                        </div>
                        <div className="sm:col-span-4">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Observação (opcional)</label>
                          <textarea rows={2} className="w-full p-3 bg-white border border-amber-200 rounded-xl text-sm resize-none" placeholder="Texto para aparecer na proposta..." value={item.itemNote || ''} onChange={e => updateItem(idx, { itemNote: e.target.value })} />
                        </div>
                        {!isClique && (
                          <div className="sm:col-span-4 flex justify-end">
                            <span className="text-[10px] font-black text-slate-400">Subtotal: <span className="text-slate-700">{fmt(subtotal)}</span></span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={idx} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 relative">
                    <button onClick={() => removeItem(idx)} className="absolute top-4 right-4 text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
                      <div className="sm:col-span-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Hardware</label>
                        <select className="w-full p-3 bg-white rounded-xl font-bold text-sm" value={item.equipmentId} onChange={e => updateItem(idx, { equipmentId: e.target.value })}>
                          {(eqSearch ? filteredEquipments : equipments).map(e => <option key={e.id} value={e.id}>{e.brand} {e.model}{e.isColor ? ' (Cor)' : ' (P&B)'}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase">Qtd</label>
                        <input type="number" className="w-full p-3 bg-white rounded-xl font-bold text-sm" value={item.quantity} onChange={e => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })} />
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {isVenda && (
                        <div className="sm:col-span-2">
                          <label className="text-[9px] font-black text-blue-600 uppercase">Preço Unitário de Venda (R$)</label>
                          <input type="number" className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl font-black text-blue-800" value={item.unitValue || 0} onChange={e => updateItem(idx, { unitValue: parseFloat(e.target.value) || 0 })} />
                        </div>
                      )}

                      {isOutsourcing && (<>
                        <div className="sm:col-span-2">
                          <label className="text-[9px] font-black text-blue-600 uppercase">Valor Mensal / Locação (R$)</label>
                          <input type="number" className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl font-black text-blue-800" value={item.monthlyValue || 0} onChange={e => updateItem(idx, { monthlyValue: parseFloat(e.target.value) || 0 })} />
                        </div>
                        {/* P&B */}
                        <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-2">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">P&B — Monocromático</p>
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold uppercase">Franquia (pág)</label>
                            <input type="number" className="w-full p-2 bg-slate-50 rounded-lg font-bold text-xs mt-1" value={item.monoFranchise || 0} onChange={e => updateItem(idx, { monoFranchise: parseInt(e.target.value) || 0 })} />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold uppercase">Excedente (R$/pág)</label>
                            <input type="number" step="0.001" className="w-full p-2 bg-slate-50 rounded-lg font-bold text-xs mt-1" value={item.monoExcess || 0} onChange={e => updateItem(idx, { monoExcess: parseFloat(e.target.value) || 0 })} />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold uppercase">Pág. Prod. P&B (R$/pág)</label>
                            <input type="number" step="0.001" className="w-full p-2 bg-slate-50 rounded-lg font-bold text-xs mt-1" value={item.monoClickPrice || 0} onChange={e => updateItem(idx, { monoClickPrice: parseFloat(e.target.value) || 0 })} />
                          </div>
                        </div>
                        {/* Cor */}
                        <div className={`p-3 rounded-xl border space-y-2 ${isColor ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-40 pointer-events-none'}`}>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${isColor ? 'text-blue-500' : 'text-slate-400'}`}>
                            Colorido {!isColor && '(N/D neste equipamento)'}
                          </p>
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold uppercase">Franquia Cor (pág)</label>
                            <input type="number" className="w-full p-2 bg-white rounded-lg font-bold text-xs mt-1" value={item.colorFranchise || 0} onChange={e => updateItem(idx, { colorFranchise: parseInt(e.target.value) || 0 })} disabled={!isColor} />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold uppercase">Excedente Cor (R$/pág)</label>
                            <input type="number" step="0.001" className="w-full p-2 bg-white rounded-lg font-bold text-xs mt-1" value={item.colorExcess || 0} onChange={e => updateItem(idx, { colorExcess: parseFloat(e.target.value) || 0 })} disabled={!isColor} />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold uppercase">Pág. Prod. Cor (R$/pág)</label>
                            <input type="number" step="0.001" className="w-full p-2 bg-white rounded-lg font-bold text-xs mt-1" value={item.colorClickPrice || 0} onChange={e => updateItem(idx, { colorClickPrice: parseFloat(e.target.value) || 0 })} disabled={!isColor} />
                          </div>
                        </div>
                      </>)}

                      {isClique && (<>
                        <div className="sm:col-span-2">
                          <label className="text-[9px] font-black text-emerald-600 uppercase">Valor de Gestão/Mensal (R$)</label>
                          <input type="number" className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-xl font-black text-emerald-800" value={item.monthlyValue || 0} onChange={e => updateItem(idx, { monthlyValue: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase">Pág. Prod. P&B (R$/pág)</label>
                          <input type="number" step="0.001" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs" value={item.monoClickPrice || 0} onChange={e => updateItem(idx, { monoClickPrice: parseFloat(e.target.value) || 0 })} />
                        </div>
                        {isColor && (
                          <div>
                            <label className="text-[9px] font-black text-blue-500 uppercase">Pág. Prod. Cor (R$/pág)</label>
                            <input type="number" step="0.001" className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl font-bold text-xs" value={item.colorClickPrice || 0} onChange={e => updateItem(idx, { colorClickPrice: parseFloat(e.target.value) || 0 })} />
                          </div>
                        )}
                      </>)}

                      <div className="sm:col-span-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Observação do Ítem (opcional)</label>
                        <textarea rows={2} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm resize-none" placeholder="Texto descritivo para aparecer na proposta..." value={item.itemNote || ''} onChange={e => updateItem(idx, { itemNote: e.target.value })} />
                      </div>
                    </div>

                    {!isClique && (
                      <div className="flex justify-end mt-2">
                        <span className="text-[10px] font-black text-slate-400">Subtotal: <span className="text-slate-700 text-sm">{fmt(subtotal)}</span></span>
                      </div>
                    )}
                  </div>
                );
              })}

              {formData.items.length > 0 && (
                totalLabel
                  ? <div className="bg-slate-900 rounded-2xl p-5 flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-blue-400">{totalLabel}</span>
                      <span className="text-2xl font-black text-white">{fmt(formData.totalValue)}</span>
                    </div>
                  : <div className="bg-emerald-900 rounded-2xl p-5 flex items-center justify-center">
                      <span className="text-[10px] font-black uppercase text-emerald-300">Contrato de Clique — cobrança por página produzida</span>
                    </div>
              )}
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in">
              {totalLabel ? (
                <div className="bg-slate-900 p-8 rounded-[24px] text-white flex justify-between items-center shadow-2xl">
                  <div>
                    <p className="text-[9px] font-black uppercase text-blue-400 mb-1">{totalLabel}</p>
                    <h3 className="text-4xl sm:text-5xl font-black">{fmt(formData.totalValue)}</h3>
                  </div>
                  <div className="bg-white/10 p-4 rounded-xl text-right">
                    <p className="text-[9px] font-black uppercase text-slate-300">Modelo</p>
                    <p className="font-black text-blue-300 text-sm">{formData.pricingModel}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-900 p-8 rounded-[24px] text-white flex justify-between items-center shadow-2xl">
                  <div>
                    <p className="text-[9px] font-black uppercase text-emerald-400 mb-1">Modelo Ativo</p>
                    <h3 className="text-2xl font-black text-emerald-200">{formData.pricingModel}</h3>
                    <p className="text-[10px] text-emerald-400 mt-1">Cobrança por clique — sem valor total fixo</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-xl">
                    <p className="text-[9px] font-black uppercase text-slate-300">{formData.items.length} ítens</p>
                  </div>
                </div>
              )}

              {/* Resumo ítens */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Resumo dos Ítens</label>
                <div className="space-y-2">
                  {formData.items.map((item, idx) => {
                    const eq = equipments.find(e => e.id === item.equipmentId);
                    const label = item.isExtra ? (item.extraDescription || 'Ítem Extra') : (eq ? `${eq.brand} ${eq.model}` : 'Equipamento');
                    const sub = formData.pricingModel === PricingModel.VENDA ? (item.unitValue || 0) * item.quantity : (item.monthlyValue || 0) * item.quantity;
                    return (
                      <div key={idx} className={`flex justify-between items-center p-3 rounded-xl text-sm ${item.isExtra ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50'}`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {item.isExtra && <Star size={11} className="text-amber-500 shrink-0" />}
                          <span className="font-bold text-slate-700 truncate">{item.quantity}× {label}</span>
                          {item.itemNote && <span className="text-[10px] text-slate-400 italic ml-1 hidden sm:inline truncate">— {item.itemNote}</span>}
                        </div>
                        {formData.pricingModel !== PricingModel.CLIQUE
                          ? <span className="font-black text-slate-800 ml-4 shrink-0">{fmt(sub)}</span>
                          : <span className="text-[9px] text-slate-400 ml-4 shrink-0 uppercase">por clique</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Condições Comerciais com filtro ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-slate-400">Condições Comerciais</label>
                  {(formData.selectedConditions?.length ?? 0) > 0 && (
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                      {formData.selectedConditions?.length} selecionada(s)
                    </span>
                  )}
                </div>

                {/* Campo de busca */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar condição..."
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
                    value={condSearch}
                    onChange={e => setCondSearch(e.target.value)}
                  />
                  {condSearch && (
                    <button onClick={() => setCondSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-3 border-2 border-slate-50 rounded-2xl">
                  {filteredConditions.length === 0 && (
                    <div className="col-span-2 text-center py-4 text-slate-300 text-xs">Nenhuma condição encontrada.</div>
                  )}
                  {filteredConditions.map(c => {
                    const sel = formData.selectedConditions?.includes(c.id);
                    return (
                      <button key={c.id}
                        onClick={() => {
                          const cur = formData.selectedConditions || [];
                          const next = sel ? cur.filter(x => x !== c.id) : [...cur, c.id];
                          setFormData({ ...formData, selectedConditions: next });
                        }}
                        className={`p-3 rounded-xl text-left text-[10px] font-bold border-2 transition-all ${sel ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-50 text-slate-400 hover:border-slate-200'}`}>
                        {c.condition}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl text-sm font-bold">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-5 sm:p-6 flex justify-between border-t border-slate-100">
          <button onClick={() => step > 1 ? setStep(step - 1) : navigate('/proposals')}
            className="px-6 font-black text-slate-400 uppercase text-[10px] tracking-widest hover:text-slate-600 transition">
            {step === 1 ? 'Cancelar' : '← Voltar'}
          </button>
          <button onClick={() => step < 3 ? setStep(step + 1) : handleSave()} disabled={isSaving}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-100 uppercase text-[10px] tracking-widest disabled:opacity-60">
            {isSaving ? 'Gravando...' : step < 3 ? 'Próximo →' : 'Gerar Proposta Final'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProposalEditor;

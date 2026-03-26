import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, AlertCircle, Star } from 'lucide-react';
import { storage } from '../services/storage';
import { User, Proposal, PricingModel, OutsourcingSubtype, ProposalStatus, ProposalItem, Customer, Equipment, MasterData } from '../types';
import { INITIAL_MASTER_DATA } from '../constants';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ProposalEditor: React.FC<{ user: User }> = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        if (existing) {
          setFormData({ ...existing, selectedConditions: existing.selectedConditions || [] });
        }
         } else {
          const year = new Date().getFullYear();
          // Ajuste o número 78 abaixo para o número anterior ao que você deseja iniciar
          const proximaSequencia = proposals.length + 78; 
          const sequence = proximaSequencia.toString().padStart(3, '0');  
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
    if (formData.pricingModel === PricingModel.VENDA) {
      total = formData.items.reduce((acc, curr) => acc + ((curr.unitValue || 0) * curr.quantity), 0);
    } else if (formData.pricingModel === PricingModel.OUTSOURCING) {
      total = formData.items.reduce((acc, curr) => acc + ((curr.monthlyValue || 0) * curr.quantity), 0);
    }
    // CLIQUE: total permanece 0
    setFormData(prev => ({ ...prev, totalValue: total }));
  }, [formData.items, formData.pricingModel]);

  const handleAddItem = () => {
    const newItem: ProposalItem = {
      equipmentId: equipments[0]?.id || '',
      quantity: 1,
      unitValue: 0,
      monthlyValue: 0,
      monoFranchise: 0,
      monoExcess: 0,
      monoClickPrice: 0,
      colorFranchise: 0,
      colorExcess: 0,
      colorClickPrice: 0,
      itemNote: '',
      isExtra: false,
      extraDescription: '',
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleAddExtraItem = () => {
    const newItem: ProposalItem = {
      equipmentId: '',
      quantity: 1,
      unitValue: 0,
      monthlyValue: 0,
      monoFranchise: 0,
      monoExcess: 0,
      monoClickPrice: 0,
      colorFranchise: 0,
      colorExcess: 0,
      colorClickPrice: 0,
      itemNote: '',
      isExtra: true,
      extraDescription: '',
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const updateItem = (index: number, updates: Partial<ProposalItem>) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], ...updates };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleSave = async () => {
    if (!formData.customerId || !formData.title || formData.items.length === 0) {
      setError('Verifique o cliente, título e se há itens adicionados.');
      return;
    }
    setIsSaving(true);
    try {
      await storage.saveProposal(formData);
      navigate('/proposals');
    } catch (err) {
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

  if (loading) return <div className="flex h-screen items-center justify-center font-black text-blue-600">CARREGANDO...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">
          {id ? 'Editar Proposta' : 'Nova Proposta'}
        </h2>
        <div className="flex gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${step === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {s}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-8">

          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Cliente</label>
                  <select className="w-full p-4 bg-slate-50 rounded-xl font-bold" value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})}>
                    <option value="">Selecione...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Título da Solução</label>
                  <select className="w-full p-4 bg-slate-50 rounded-xl font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}>
                    <option value="">Selecione...</option>
                    {masterData.solutionTitles.map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <label className="text-[10px] font-black uppercase text-slate-400 block text-center mb-4">Selecione o Modelo de Precificação</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.values(PricingModel).map(m => (
                    <button
                      key={m}
                      onClick={() => setFormData({ ...formData, pricingModel: m })}
                      className={`p-4 rounded-xl border-2 font-black text-xs transition-all ${formData.pricingModel === m ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-50 text-slate-300'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="font-black text-slate-800 uppercase text-sm">Configuração dos Equipamentos</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddExtraItem}
                    className="bg-amber-500 text-white px-4 py-2 rounded-lg font-black text-[10px] flex items-center gap-1"
                  >
                    <Star size={12} /> ÍTEM EXTRA
                  </button>
                  <button onClick={handleAddItem} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-black text-[10px]">+ ITEM</button>
                </div>
              </div>

              {formData.items.length === 0 && (
                <div className="text-center py-12 text-slate-300">
                  <p className="text-sm font-medium">Adicione equipamentos ou ítens extras usando os botões acima.</p>
                </div>
              )}

              {formData.items.map((item, idx) => {
                const eq = equipments.find(e => e.id === item.equipmentId);
                const isColor = eq?.isColor || false;

                if (item.isExtra) {
                  return (
                    <div key={idx} className="p-6 bg-amber-50 rounded-2xl border border-amber-700 relative mb-4">
                      <button onClick={() => removeItem(idx)} className="absolute top-4 right-4 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                      <div className="flex items-center gap-2 mb-4">
                        <Star size={14} className="text-amber-500" />
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Ítem Extra</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-3">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Descrição do Ítem Extra</label>
                          <input
                            type="text"
                            placeholder="Ex: Suporte técnico mensal, Instalação de rede..."
                            className="w-full p-3 bg-white rounded-xl font-bold text-sm border border-amber-200"
                            value={item.extraDescription || ''}
                            onChange={e => updateItem(idx, { extraDescription: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase">Qtd</label>
                          <input type="number" className="w-full p-3 bg-white rounded-xl font-bold text-sm border border-amber-200" value={item.quantity} onChange={e => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })} />
                        </div>
                        <div className="col-span-4 grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-amber-200">
                          {formData.pricingModel === PricingModel.VENDA && (
                            <div className="col-span-2">
                              <label className="text-[9px] font-black text-blue-600 uppercase">Valor Unitário (R$)</label>
                              <input type="number" className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl font-black text-blue-800" value={item.unitValue || 0} onChange={e => updateItem(idx, { unitValue: parseFloat(e.target.value) || 0 })} />
                            </div>
                          )}
                          {(formData.pricingModel === PricingModel.OUTSOURCING || formData.pricingModel === PricingModel.CLIQUE) && (
                            <div className="col-span-2">
                              <label className="text-[9px] font-black text-amber-600 uppercase">Valor Mensal (R$)</label>
                              <input type="number" className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl font-black text-amber-800" value={item.monthlyValue || 0} onChange={e => updateItem(idx, { monthlyValue: parseFloat(e.target.value) || 0 })} />
                            </div>
                          )}
                          <div className="col-span-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase">Observação / Texto do Ítem (opcional)</label>
                            <textarea rows={2} placeholder="Texto descritivo para aparecer na proposta..." className="w-full p-3 bg-white border border-amber-200 rounded-xl font-medium text-sm resize-none" value={item.itemNote || ''} onChange={e => updateItem(idx, { itemNote: e.target.value })} />
                          </div>
                        </div>
                        {formData.pricingModel !== PricingModel.CLIQUE && (
                          <div className="col-span-4 flex justify-end">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Subtotal: <span className="text-slate-700 text-sm">{formatCurrency(formData.pricingModel === PricingModel.VENDA ? (item.unitValue || 0) * item.quantity : (item.monthlyValue || 0) * item.quantity)}</span></span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative mb-4">
                    <button onClick={() => removeItem(idx)} className="absolute top-4 right-4 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Hardware</label>
                        <select className="w-full p-3 bg-white rounded-xl font-bold text-sm" value={item.equipmentId} onChange={e => updateItem(idx, { equipmentId: e.target.value })}>
                          {equipments.map(e => <option key={e.id} value={e.id}>{e.brand} {e.model}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase">Qtd</label>
                        <input type="number" className="w-full p-3 bg-white rounded-xl font-bold text-sm" value={item.quantity} onChange={e => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })} />
                      </div>

                      <div className="col-span-4 grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-slate-200">
                        {formData.pricingModel === PricingModel.VENDA && (
                          <div className="col-span-2">
                            <label className="text-[9px] font-black text-blue-600 uppercase">Preço Unitário de Venda (R$)</label>
                            <input type="number" className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl font-black text-blue-800" value={item.unitValue} onChange={e => updateItem(idx, { unitValue: parseFloat(e.target.value) || 0 })} />
                          </div>
                        )}
                        {formData.pricingModel === PricingModel.OUTSOURCING && (
                          <>
                            <div className="col-span-2">
                              <label className="text-[9px] font-black text-blue-600 uppercase">Valor Mensal / Locação (R$)</label>
                              <input type="number" className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl font-black text-blue-800" value={item.monthlyValue} onChange={e => updateItem(idx, { monthlyValue: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div className="space-y-2">
                              <p className="text-[9px] font-black text-slate-400 uppercase">Franquia Mono</p>
                              <input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs" value={item.monoFranchise} onChange={e => updateItem(idx, { monoFranchise: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="space-y-2">
                              <p className="text-[9px] font-black text-slate-400 uppercase">Excedente Mono</p>
                              <input type="number" step="0.001" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs" value={item.monoExcess} onChange={e => updateItem(idx, { monoExcess: parseFloat(e.target.value) || 0 })} />
                            </div>
                          </>
                        )}
                        {formData.pricingModel === PricingModel.CLIQUE && (
                          <>
                            <div className="col-span-2">
                              <label className="text-[9px] font-black text-emerald-600 uppercase">Valor de Gestão/Mensal (R$)</label>
                              <input type="number" className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-xl font-black text-emerald-800" value={item.monthlyValue} onChange={e => updateItem(idx, { monthlyValue: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div className="col-span-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase">Preço por Página Produzida (P&B)</label>
                              <input type="number" step="0.001" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs" value={item.monoClickPrice} onChange={e => updateItem(idx, { monoClickPrice: parseFloat(e.target.value) || 0 })} />
                            </div>
                            {isColor && (
                              <div className="col-span-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase">Preço por Página Produzida (Color)</label>
                                <input type="number" step="0.001" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs" value={item.colorClickPrice} onChange={e => updateItem(idx, { colorClickPrice: parseFloat(e.target.value) || 0 })} />
                              </div>
                            )}
                          </>
                        )}
                        <div className="col-span-4">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Observação / Texto do Ítem (opcional)</label>
                          <textarea rows={2} placeholder="Texto descritivo para aparecer na proposta..." className="w-full p-3 bg-white border border-slate-200 rounded-xl font-medium text-sm resize-none" value={item.itemNote || ''} onChange={e => updateItem(idx, { itemNote: e.target.value })} />
                        </div>
                      </div>

                      {formData.pricingModel !== PricingModel.CLIQUE && (
                        <div className="col-span-4 flex justify-end mt-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Subtotal: <span className="text-slate-700 text-sm">{formatCurrency(formData.pricingModel === PricingModel.VENDA ? (item.unitValue || 0) * item.quantity : (item.monthlyValue || 0) * item.quantity)}</span></span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {formData.items.length > 0 && totalLabel && (
                <div className="bg-slate-900 rounded-2xl p-5 flex justify-between items-center mt-4">
                  <span className="text-[10px] font-black uppercase text-blue-400">{totalLabel}</span>
                  <span className="text-2xl font-black text-white">{formatCurrency(formData.totalValue)}</span>
                </div>
              )}
              {formData.items.length > 0 && !totalLabel && (
                <div className="bg-emerald-900 rounded-2xl p-5 flex items-center justify-center mt-4">
                  <span className="text-[10px] font-black uppercase text-emerald-300">Contrato de Clique — cobrança por página produzida</span>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in">
              {totalLabel ? (
                <div className="bg-slate-900 p-8 rounded-[24px] text-white flex justify-between items-center shadow-2xl">
                  <div>
                    <p className="text-[9px] font-black uppercase text-blue-400 mb-1">{totalLabel}</p>
                    <h3 className="text-5xl font-black">{formatCurrency(formData.totalValue)}</h3>
                  </div>
                  <div className="bg-white/10 p-4 rounded-xl text-right">
                    <p className="text-[9px] font-black uppercase text-slate-300">Modelo Ativo</p>
                    <p className="font-black text-blue-300">{formData.pricingModel}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-900 p-8 rounded-[24px] text-white flex justify-between items-center shadow-2xl">
                  <div>
                    <p className="text-[9px] font-black uppercase text-emerald-400 mb-1">Modelo Ativo</p>
                    <h3 className="text-2xl font-black text-emerald-200">{formData.pricingModel}</h3>
                    <p className="text-[10px] text-emerald-400 mt-1">Cobrança por clique — sem valor total fixo</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-xl text-right">
                    <p className="text-[9px] font-black uppercase text-slate-300">{formData.items.length} ítens</p>
                    <p className="font-black text-emerald-300">na proposta</p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Resumo dos Ítens</label>
                <div className="space-y-2">
                  {formData.items.map((item, idx) => {
                    const eq = equipments.find(e => e.id === item.equipmentId);
                    const isExtra = item.isExtra;
                    const label = isExtra ? (item.extraDescription || 'Ítem Extra') : (eq ? `${eq.brand} ${eq.model}` : 'Equipamento');
                    const subtotal = formData.pricingModel === PricingModel.VENDA
                      ? (item.unitValue || 0) * item.quantity
                      : (item.monthlyValue || 0) * item.quantity;
                    return (
                      <div key={idx} className={`flex justify-between items-center p-3 rounded-xl text-sm ${isExtra ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50'}`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {isExtra && <Star size={12} className="text-amber-500 flex-shrink-0" />}
                          <span className="font-bold text-slate-700 truncate">{item.quantity}x {label}</span>
                          {item.itemNote && <span className="text-[10px] text-slate-400 italic ml-1 truncate">— {item.itemNote}</span>}
                        </div>
                        {formData.pricingModel !== PricingModel.CLIQUE && (
                          <span className="font-black text-slate-800 ml-4 flex-shrink-0">{formatCurrency(subtotal)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400">Condições Comerciais</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-4 border-2 border-slate-50 rounded-2xl">
                  {masterData.commercialConditions.map(c => {
                    const isSelected = formData.selectedConditions?.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          const current = formData.selectedConditions || [];
                          const next = isSelected ? current.filter(cid => cid !== c.id) : [...current, c.id];
                          setFormData({ ...formData, selectedConditions: next });
                        }}
                        className={`p-3 rounded-xl text-left text-[10px] font-bold border-2 transition-all ${isSelected ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-50 text-slate-400 hover:border-slate-200'}`}
                      >
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

        <div className="bg-slate-50 p-6 flex justify-between border-t border-slate-100">
          <button onClick={() => step > 1 ? setStep(step - 1) : navigate('/proposals')} className="px-6 font-black text-slate-400 uppercase text-[10px] tracking-widest">
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </button>
          <button
            onClick={() => step < 3 ? setStep(step + 1) : handleSave()}
            disabled={isSaving}
            className="bg-blue-600 text-white px-10 py-4 rounded-xl font-black hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-100 uppercase text-[10px] tracking-widest"
          >
            {isSaving ? 'Gravando...' : step < 3 ? 'Próximo Passo' : 'Gerar Proposta Final'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProposalEditor;

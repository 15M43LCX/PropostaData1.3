import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Save, Plus, Trash2, Check, Printer, Info, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { storage } from '../services/storage';
import { User, Proposal, PricingModel, OutsourcingSubtype, ProposalStatus, ProposalItem, Customer, Equipment } from '../types';

const ProposalEditor: React.FC<{ user: User }> = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const customers = storage.getVisibleCustomers(user);
  const equipments = storage.getEquipments();
  const masterData = storage.getMasterData();

  // Função para gerar o código no novo padrão: ANO + SEQUÊNCIA (iniciando em 049)
  const generateInitialCode = () => {
    const year = new Date().getFullYear();
    const existingCount = storage.getProposals().length;
    const sequence = (existingCount + 49).toString().padStart(3, '0');
    return `${year}${sequence}`;
  };

  const [formData, setFormData] = useState<Proposal>({
    id: id || Math.random().toString(36).substr(2, 9),
    code: id ? '' : generateInitialCode(),
    date: new Date().toLocaleDateString('pt-BR'),
    sellerId: user.id,
    customerId: '',
    title: '',
    pricingModel: PricingModel.OUTSOURCING,
    outsourcingSubtype: OutsourcingSubtype.FRANCHISE_EXCESS,
    items: [],
    paymentMethod: masterData.paymentMethods[0] || '',
    validity: masterData.validities[0] || '',
    deliveryTime: masterData.deliveryTimes[0] || '',
    slaTime: masterData.slaTimes[0] || '',
    contractTerm: masterData.contractTerms[0] || '',
    selectedConditions: [], // Garantir inicialização como array vazio
    status: ProposalStatus.ABERTO,
    totalValue: 0
  });

  const [conditionSearch, setConditionSearch] = useState('');

  useEffect(() => {
    if (id) {
      const existing = storage.getProposals().find(p => p.id === id);
      if (existing) {
        setFormData({
          ...existing,
          selectedConditions: existing.selectedConditions || [] // Proteção contra dados antigos nulos
        });
      }
    }
  }, [id]);

  useEffect(() => {
    let total = 0;
    if (formData.pricingModel === PricingModel.VENDA) {
      total = formData.items.reduce((acc, curr) => acc + ((curr.unitValue || 0) * curr.quantity), 0);
    } else {
      total = formData.items.reduce((acc, curr) => acc + (curr.monthlyValue * curr.quantity), 0);
    }
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
      colorClickPrice: 0
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

  const validate = () => {
    if (!formData.customerId) return "Selecione um cliente.";
    if (!formData.title) return "Defina o título da solução.";
    if (formData.items.length === 0) return "Adicione equipamentos ao projeto.";
    return null;
  };

  const handleSave = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsSaving(true);
    storage.saveProposal(formData);
    setTimeout(() => {
      setIsSaving(false);
      navigate('/proposals');
    }, 500);
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 font-montserrat tracking-tight uppercase">
            {id ? 'Editar Proposta' : 'Nova Proposta'}
          </h2>
          <p className="text-slate-500 font-medium">Configure os parâmetros técnicos do projeto.</p>
        </div>
        <div className="flex gap-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all duration-500 border-2 ${step === s ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : step > s ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-200 border-slate-100'}`}>
                {step > s ? <Check size={24} /> : s}
              </div>
            ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-xl flex items-center gap-3 animate-bounce">
            <AlertCircle className="text-red-500" />
            <p className="text-red-800 font-bold">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-[500px]">
          {step === 1 && (
            <div className="p-10 space-y-10 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente *</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.customerId}
                    onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solução *</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    {masterData.solutionTitles.map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
                  </select>
                </div>
                
                <div className="md:col-span-2 space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Modelo de Precificação</label>
                  <div className="grid grid-cols-3 gap-4">
                     {Object.values(PricingModel).map(m => (
                       <button
                         key={m}
                         onClick={() => setFormData({...formData, pricingModel: m})}
                         className={`p-6 rounded-3xl border-2 font-black transition-all flex flex-col items-center gap-2 ${formData.pricingModel === m ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-lg' : 'border-slate-50 text-slate-300 bg-white'}`}
                       >
                         <span className="text-[10px] uppercase tracking-widest">{m}</span>
                       </button>
                     ))}
                  </div>
                </div>

                {formData.pricingModel === PricingModel.OUTSOURCING && (
                  <div className="md:col-span-2 p-8 bg-blue-50/50 rounded-3xl border border-blue-100">
                    <label className="block text-[10px] font-black text-blue-800 uppercase tracking-widest mb-4">Modalidade de Contrato</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.values(OutsourcingSubtype).map(sub => (
                        <button
                          key={sub}
                          onClick={() => setFormData({...formData, outsourcingSubtype: sub})}
                          className={`p-4 rounded-xl border-2 font-black text-[10px] transition-all uppercase ${formData.outsourcingSubtype === sub ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-100'}`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-10 space-y-8 animate-in slide-in-from-right-4 duration-300">
               <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                 <h3 className="text-xl font-black text-slate-800">Itens do Parque</h3>
                 <button onClick={handleAddItem} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-100">
                   <Plus size={18} /> Adicionar Item
                 </button>
               </div>
               
               <div className="space-y-6">
                 {formData.items.map((item, idx) => {
                   const eq = equipments.find(e => e.id === item.equipmentId);
                   const isColor = eq?.isColor || false;

                   return (
                     <div key={idx} className="bg-slate-50 p-8 rounded-3xl border border-slate-100 relative group">
                        <button onClick={() => removeItem(idx)} className="absolute -top-2 -right-2 bg-white text-red-500 p-2 rounded-xl shadow-md border border-slate-100 hover:bg-red-500 hover:text-white transition">
                          <Trash2 size={16} />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="md:col-span-3 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hardware</label>
                            <select 
                              className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold"
                              value={item.equipmentId}
                              onChange={(e) => updateItem(idx, { equipmentId: e.target.value })}
                            >
                              {equipments.map(e => <option key={e.id} value={e.id}>{e.brand} {e.model}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qtd</label>
                            <input 
                              type="number" 
                              className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-center"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                            />
                          </div>
                          
                          <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-200">
                            {formData.pricingModel === PricingModel.VENDA ? (
                              <div className="md:col-span-2">
                                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Preço de Venda Unitário</label>
                                <input type="number" className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl font-black text-blue-800" value={item.unitValue} onChange={e => updateItem(idx, { unitValue: parseFloat(e.target.value) || 0 })} />
                              </div>
                            ) : (
                              <>
                                <div className="space-y-4">
                                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b pb-1">Configurações P&B (Mono)</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                      <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Valor Mensal (por UN)</label>
                                      <input type="number" className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl font-black text-blue-800" value={item.monthlyValue} onChange={e => updateItem(idx, { monthlyValue: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Franquia Mono</label>
                                      <input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-xl" value={item.monoFranchise} onChange={e => updateItem(idx, { monoFranchise: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Excedente Mono</label>
                                      <input type="number" step="0.001" className="w-full p-3 bg-white border border-slate-200 rounded-xl" value={item.monoExcess} onChange={e => updateItem(idx, { monoExcess: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    {(formData.pricingModel === PricingModel.CLIQUE || formData.outsourcingSubtype === OutsourcingSubtype.FIXED_PRODUCED || formData.outsourcingSubtype === OutsourcingSubtype.FRANCHISE_EXCESS_PRODUCED) && (
                                      <div className="md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço por Clique Mono</label>
                                        <input type="number" step="0.001" className="w-full p-3 bg-white border border-slate-200 rounded-xl" value={item.monoClickPrice} onChange={e => updateItem(idx, { monoClickPrice: parseFloat(e.target.value) || 0 })} />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {isColor ? (
                                  <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-1">Configurações Coloridas</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Franquia Color</label>
                                        <input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-xl" value={item.colorFranchise} onChange={e => updateItem(idx, { colorFranchise: parseInt(e.target.value) || 0 })} />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Excedente Color</label>
                                        <input type="number" step="0.001" className="w-full p-3 bg-white border border-slate-200 rounded-xl" value={item.colorExcess} onChange={e => updateItem(idx, { colorExcess: parseFloat(e.target.value) || 0 })} />
                                      </div>
                                      {(formData.pricingModel === PricingModel.CLIQUE || formData.outsourcingSubtype === OutsourcingSubtype.FIXED_PRODUCED || formData.outsourcingSubtype === OutsourcingSubtype.FRANCHISE_EXCESS_PRODUCED) && (
                                        <div className="md:col-span-2">
                                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço por Clique Color</label>
                                          <input type="number" step="0.001" className="w-full p-3 bg-white border border-slate-200 rounded-xl" value={item.colorClickPrice} onChange={e => updateItem(idx, { colorClickPrice: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center border border-dashed border-slate-200 rounded-3xl opacity-50 bg-slate-100/30">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center px-4">Hardware Monocromático: Campos Coloridos Desabilitados</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                     </div>
                   )
                 })}
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-10 space-y-8 animate-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-black text-slate-800 border-b border-slate-50 pb-6 mb-8">Finalização</h3>
              
              <div className="grid grid-cols-1 gap-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Atual do Negócio</label>
                    <select 
                      className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl font-black text-blue-600 appearance-none outline-none focus:ring-4 focus:ring-blue-100"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as ProposalStatus})}
                    >
                      {Object.values(ProposalStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
              </div>

              {/* SELEÇÃO DE CONDIÇÕES COMERCIAIS */}
              <div className="space-y-6 pt-8 border-t border-slate-50">
                 <div className="flex items-center justify-between">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Condições Comerciais Selecionadas</label>
                   <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                     {formData.selectedConditions?.length || 0} selecionadas
                   </span>
                 </div>

                 <div className="relative">
                   <input 
                     type="text" 
                     placeholder="Filtrar condições comerciais..." 
                     className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                     value={conditionSearch}
                     onChange={(e) => setConditionSearch(e.target.value)}
                   />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-2 border border-slate-50 rounded-3xl">
                   {masterData.commercialConditions
                     .filter(c => (c.condition || "").toLowerCase().includes(conditionSearch.toLowerCase()))
                     .map(c => {
                       const isSelected = formData.selectedConditions?.includes(c.id);
                       return (
                         <button
                           key={c.id}
                           onClick={() => {
                             const current = formData.selectedConditions || [];
                             const next = isSelected 
                               ? current.filter(id => id !== c.id)
                               : [...current, c.id];
                             setFormData({...formData, selectedConditions: next});
                           }}
                           className={`flex items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left ${isSelected ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-slate-50 bg-white hover:border-slate-200'}`}
                         >
                           <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200'}`}>
                             {isSelected && <Check size={14} />}
                           </div>
                           <span className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-slate-600'}`}>{c.condition}</span>
                         </button>
                       );
                     })}
                 </div>
              </div>

              <div className="mt-12 p-12 bg-slate-900 rounded-[40px] text-white flex items-center justify-between shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                 <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 mb-2">Total Consolidado</p>
                    <h3 className="text-6xl font-black font-montserrat tracking-tighter">R$ {formData.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                 </div>
                 <CheckCircle2 size={64} className="text-blue-500 relative z-10" />
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-8 flex justify-between border-t border-slate-100">
           <button onClick={() => step > 1 ? setStep(step - 1) : navigate('/proposals')} className="px-10 py-4 font-black text-slate-400 hover:text-slate-800 transition uppercase text-xs tracking-widest">
             {step === 1 ? 'Cancelar' : 'Anterior'}
           </button>
           <button 
             onClick={() => step < 3 ? setStep(step + 1) : handleSave()}
             disabled={isSaving}
             className="bg-blue-600 text-white px-14 py-4 rounded-2xl font-black hover:bg-blue-700 transition flex items-center gap-2 shadow-xl shadow-blue-100 uppercase text-xs tracking-widest"
           >
             {isSaving ? <RefreshCw className="animate-spin" /> : step < 3 ? 'Continuar' : 'Gravar Proposta'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default ProposalEditor;

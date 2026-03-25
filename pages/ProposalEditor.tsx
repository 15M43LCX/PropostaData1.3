import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Save, Plus, Trash2, Check, Printer, Info, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { storage } from '../services/storage';
import { User, Proposal, PricingModel, OutsourcingSubtype, ProposalStatus, ProposalItem, Customer, Equipment, MasterData } from '../types';
import { INITIAL_MASTER_DATA } from '../constants';

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
  const [conditionSearch, setConditionSearch] = useState('');

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

  // Carregamento de dados inicial
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

  // Cálculo automático do Total (Corrigido para evitar o erro de comparação)
  useEffect(() => {
    let total = 0;
    const isVenda = formData.pricingModel === PricingModel.VENDA;

    if (isVenda) {
      total = formData.items.reduce((acc, curr) => acc + ((curr.unitValue || 0) * curr.quantity), 0);
    } else {
      total = formData.items.reduce((acc, curr) => acc + ((curr.monthlyValue || 0) * curr.quantity), 0);
    }
    setFormData(prev => ({ ...prev, totalValue: total }));
  }, [formData.items, formData.pricingModel]);

  // Filtro de condições comerciais baseado no modelo
  const filteredConditions = useMemo(() => {
    return masterData.commercialConditions.filter(c => {
      const matchesSearch = (c.condition || '').toLowerCase().includes(conditionSearch.toLowerCase());
      
      // Se for modelo VENDA, você pode filtrar condições específicas aqui se tiver essa flag no seu MasterData
      // Por enquanto, apenas o filtro de texto
      return matchesSearch;
    });
  }, [masterData.commercialConditions, conditionSearch, formData.pricingModel]);

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

  const handleSave = async () => {
    if (!formData.customerId || !formData.title || formData.items.length === 0) {
      setError('Preencha os campos obrigatórios e adicione ao menos um item.');
      return;
    }
    setIsSaving(true);
    try {
      await storage.saveProposal(formData);
      navigate('/proposals');
    } catch (err) {
      setError('Erro ao salvar.');
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-20 text-center font-black">CARREGANDO...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Cabeçalho e Steps */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black uppercase text-slate-800 tracking-tight">
          {id ? 'Editar Proposta' : 'Nova Proposta'}
        </h2>
        <div className="flex gap-4">
          {[1, 2, 3].map(s => (
            <div key={s} className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${step === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {s}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-10">
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Cliente</label>
                  <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})}>
                    <option value="">Selecione...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Título da Solução</label>
                  <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}>
                    <option value="">Selecione...</option>
                    {masterData.solutionTitles.map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 block text-center">Modelo de Negócio</label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.values(PricingModel).map(m => (
                    <button
                      key={m}
                      onClick={() => setFormData({ ...formData, pricingModel: m })}
                      className={`p-6 rounded-2xl border-2 font-black transition-all ${formData.pricingModel === m ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-50 text-slate-300'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-slate-800">Itens do Projeto</h3>
                <button onClick={handleAddItem} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-black text-xs">+ ADICIONAR</button>
              </div>

              {formData.items.map((item, idx) => {
                const eq = equipments.find(e => e.id === item.equipmentId);
                const isVenda = formData.pricingModel === PricingModel.VENDA;

                return (
                  <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative">
                    <button onClick={() => removeItem(idx)} className="absolute top-4 right-4 text-red-400 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Equipamento</label>
                        <select className="w-full p-3 bg-white rounded-xl font-bold" value={item.equipmentId} onChange={e => updateItem(idx, { equipmentId: e.target.value })}>
                          {equipments.map(e => <option key={e.id} value={e.id}>{e.brand} {e.model}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase">Qtd</label>
                        <input type="number" className="w-full p-3 bg-white rounded-xl font-bold" value={item.quantity} onChange={e => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })} />
                      </div>

                      {/* Campos Dinâmicos baseados no Modelo */}
                      <div className="col-span-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
                        {isVenda ? (
                          <div className="col-span-2">
                            <label className="text-[9px] font-black text-blue-600 uppercase">Valor de Venda Unitário (R$)</label>
                            <input type="number" className="w-full p-3 bg-blue-50 rounded-xl font-black" value={item.unitValue} onChange={e => updateItem(idx, { unitValue: parseFloat(e.target.value) || 0 })} />
                          </div>
                        ) : (
                          <>
                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase">Locação Mensal Unitária</label>
                              <input type="number" className="w-full p-3 bg-white rounded-xl font-bold" value={item.monthlyValue} onChange={e => updateItem(idx, { monthlyValue: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase">Franquia</label>
                                <input type="number" className="w-full p-3 bg-white rounded-xl font-bold" value={item.monoFranchise} onChange={e => updateItem(idx, { monoFranchise: parseInt(e.target.value) || 0 })} />
                              </div>
                              <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase">Excedente</label>
                                <input type="number" step="0.001" className="w-full p-3 bg-white rounded-xl font-bold" value={item.monoExcess} onChange={e => updateItem(idx, { monoExcess: parseFloat(e.target.value) || 0 })} />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-900 p-8 rounded-3xl text-white flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black uppercase text-blue-400">Total da Proposta</p>
                  <h3 className="text-4xl font-black">R$ {formData.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400">Modelo</p>
                  <p className="font-bold">{formData.pricingModel}</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400">Condições Comerciais</label>
                <input 
                  type="text" 
                  placeholder="Pesquisar condições..." 
                  className="w-full p-3 bg-slate-50 rounded-xl text-sm"
                  value={conditionSearch}
                  onChange={e => setConditionSearch(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-2xl">
                  {filteredConditions.map(c => {
                    const isSelected = formData.selectedConditions?.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          const current = formData.selectedConditions || [];
                          const next = isSelected ? current.filter(id => id !== c.id) : [...current, c.id];
                          setFormData({ ...formData, selectedConditions: next });
                        }}
                        className={`p-3 rounded-xl text-left text-xs font-bold border-2 transition-all ${isSelected ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-50 text-slate-500'}`}
                      >
                        {c.condition}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Navegação */}
        <div className="bg-slate-50 p-6 flex justify-between border-t border-slate-100">
          <button onClick={() => step > 1 ? setStep(step - 1) : navigate('/proposals')} className="px-6 font-black text-slate-400 uppercase text-[10px]">
            {step === 1 ? 'Sair' : 'Voltar'}
          </button>
          <button
            onClick={() => step < 3 ? setStep(step + 1) : handleSave()}
            disabled={isSaving}
            className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-100 uppercase text-[10px]"
          >
            {isSaving ? 'Salvando...' : step < 3 ? 'Próximo' : 'Finalizar Proposta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProposalEditor;

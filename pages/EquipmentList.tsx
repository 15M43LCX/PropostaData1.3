import React, { useState, useEffect, useMemo } from 'react';
import { Printer, Plus, Edit, Save, X, Trash2, Camera, Lock, AlertCircle, RefreshCw, Search } from 'lucide-react';
import { storage } from '../services/storage';
import { Equipment, User, UserRole } from '../types';

const EquipmentList: React.FC<{ user: User }> = ({ user }) => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEq, setCurrentEq] = useState<Partial<Equipment>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [colorFilter, setColorFilter] = useState<'' | 'color' | 'mono'>('');

  const isAdmin = user.role === UserRole.ADMIN;

  // Remove acentos e ignora maiúsculas/minúsculas para a busca
  const normalize = (v?: string) => (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  // Marcas existentes no catálogo (para o filtro por marca), em ordem alfabética
  const availableBrands = useMemo(
    () => Array.from(new Set(equipments.map(e => (e.brand || '').trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })),
    [equipments]
  );

  // Filtra e ordena em ordem alfabética: Marca (A→Z) e, dentro da marca, Modelo (A→Z)
  const visibleEquipments = useMemo(() => {
    const q = normalize(search);
    return equipments
      .filter(e => {
        if (brandFilter && (e.brand || '').trim() !== brandFilter) return false;
        if (colorFilter === 'color' && !e.isColor) return false;
        if (colorFilter === 'mono' && e.isColor) return false;
        if (!q) return true;
        return [e.brand, e.model, e.title, e.type].some(f => normalize(f).includes(q));
      })
      .sort((a, b) =>
        (a.brand || '').localeCompare(b.brand || '', 'pt-BR', { sensitivity: 'base' }) ||
        (a.model || '').localeCompare(b.model || '', 'pt-BR', { sensitivity: 'base', numeric: true })
      );
  }, [equipments, search, brandFilter, colorFilter]);

  // Carrega a lista SEM as fotos (rápido) e depois baixa as fotos aos poucos em segundo plano.
  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await storage.getEquipments();
      setEquipments(list);
      setLoading(false);
      const pending = list.filter(e => !e.imageUrl).map(e => e.id);
      storage.loadEquipmentImages(pending, (id, imageUrl) => {
        setEquipments(prev => prev.map(e => (e.id === id ? { ...e, imageUrl } : e)));
      });
    } catch (err: any) {
      console.error('Erro ao carregar equipamentos:', err);
      setLoadError(err?.message || 'Falha ao carregar equipamentos.');
      setEquipments([]);
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleNew = () => {
    if (!isAdmin) { alert('Apenas administradores podem cadastrar equipamentos.'); return; }
    setCurrentEq({
      id: Math.random().toString(36).substr(2, 9),
      type: '', brand: '', model: '', title: '',
      monthlyVolume: 0, isColor: false, imageUrl: '', specs: ''
    });
    setIsEditing(true);
  };

  const handleEdit = async (eq: Equipment) => {
    if (!isAdmin) { alert('Apenas administradores podem editar equipamentos.'); return; }
    // Garante que a foto está carregada antes de abrir o modal de edição
    let imageUrl = eq.imageUrl;
    if (!imageUrl) {
      const imgs = await storage.getEquipmentImages([eq.id]);
      imageUrl = imgs[eq.id] || '';
    }
    setCurrentEq({ ...eq, imageUrl });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) { alert('Apenas administradores podem excluir equipamentos.'); return; }
    const eq = equipments.find(e => e.id === id);
    if (window.confirm('Tem certeza que deseja excluir este equipamento?')) {
      await storage.deleteEquipment(id);
      storage.addLog({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), userId: user.id, userName: user.name, module: 'equipamento', action: 'excluir', recordId: id, description: `Excluiu equipamento ${eq?.brand} ${eq?.model}` });
      await loadData();
    }
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    if (!currentEq.brand || !currentEq.model) {
      alert('Marca e Modelo são obrigatórios.');
      return;
    }
    const isNew = !equipments.find(e => e.id === currentEq.id);
    setSaving(true);
    try {
      await storage.saveEquipment(currentEq as Equipment);
    } catch (err: any) {
      console.error('Erro ao salvar equipamento:', err);
      alert('Erro ao salvar o equipamento: ' + (err?.message || 'tente novamente.'));
      setSaving(false);
      return;
    }
    storage.addLog({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), userId: user.id, userName: user.name, module: 'equipamento', action: isNew ? 'criar' : 'editar', recordId: currentEq.id!, description: `${isNew ? 'Cadastrou' : 'Editou'} equipamento ${currentEq.brand} ${currentEq.model}` });
    setSaving(false);
    setIsEditing(false);
    await loadData();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
        alert('Por favor, selecione uma imagem PNG ou JPEG.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        // Redimensiona (máx. 900px) e comprime em JPEG: a foto fica ~50–150 KB em vez de MBs.
        // Fotos gigantes no banco são o que fazia a lista de equipamentos dar timeout.
        const img = new Image();
        img.onload = () => {
          const MAX = 900;
          const ratio = Math.min(1, MAX / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * ratio));
          const h = Math.max(1, Math.round(img.height * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { setCurrentEq({ ...currentEq, imageUrl: reader.result as string }); return; }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          setCurrentEq({ ...currentEq, imageUrl: canvas.toDataURL('image/jpeg', 0.85) });
        };
        img.onerror = () => alert('Não foi possível ler essa imagem.');
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Catálogo de Hardware</h2>
          <p className="text-slate-500 font-medium">
            {isAdmin ? 'Gestão técnica de ativos para composição de propostas.' : 'Consulta do catálogo de equipamentos disponíveis.'}
          </p>
        </div>
        {isAdmin ? (
          <button
            onClick={handleNew}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-10 rounded-2xl flex items-center gap-3 transition shadow-xl shadow-blue-100 uppercase text-xs tracking-widest"
          >
            <Plus size={20} /> Novo Equipamento
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-xs font-bold">
            <Lock size={14} /> Somente visualização
          </div>
        )}
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl">
          <div className="flex items-center gap-3 text-sm font-bold">
            <AlertCircle size={18} />
            <span>Não foi possível carregar os equipamentos do banco de dados. ({loadError})</span>
          </div>
          <button onClick={loadData} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest px-4 py-2 rounded-xl transition">
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      )}

      {equipments.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-100 rounded-2xl font-medium text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              placeholder="Filtrar por marca, modelo ou título comercial..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600" title="Limpar busca">
                <X size={16} />
              </button>
            )}
          </div>
          <select
            value={brandFilter}
            onChange={e => setBrandFilter(e.target.value)}
            className="px-4 py-3.5 bg-white border border-slate-100 rounded-2xl font-bold text-sm text-slate-600 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="">Todas as marcas</option>
            {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select
            value={colorFilter}
            onChange={e => setColorFilter(e.target.value as '' | 'color' | 'mono')}
            className="px-4 py-3.5 bg-white border border-slate-100 rounded-2xl font-bold text-sm text-slate-600 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="">Color e Mono</option>
            <option value="color">Somente Color</option>
            <option value="mono">Somente Mono</option>
          </select>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
            {visibleEquipments.length} de {equipments.length} equipamento(s)
          </span>
        </div>
      )}

      {equipments.length > 0 && visibleEquipments.length === 0 && (
        <div className="text-center py-16 text-slate-300">
          <Search className="mx-auto mb-4 opacity-20" size={48} />
          <p className="text-sm font-medium">Nenhum equipamento encontrado para esse filtro.</p>
        </div>
      )}

      {!loadError && equipments.length === 0 && (
        <div className="text-center py-20 text-slate-300">
          <Printer className="mx-auto mb-4 opacity-20" size={56} />
          <p className="text-sm font-medium">Nenhum equipamento cadastrado ainda.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {visibleEquipments.map(eq => (
          <div key={eq.id} className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden group hover:border-blue-200 transition-all">
            <div className="aspect-square bg-slate-50 relative overflow-hidden flex items-center justify-center p-8">
              {eq.imageUrl ? (
                <img src={eq.imageUrl} alt={eq.model} className="w-full h-full object-contain group-hover:scale-110 transition duration-500" />
              ) : (
                <Printer size={64} className="text-slate-200" />
              )}
              <div className="absolute top-4 right-4 flex gap-2">
                {eq.isColor ? (
                  <span className="bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Color</span>
                ) : (
                  <span className="bg-slate-900 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Mono</span>
                )}
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-black text-slate-800 text-lg leading-tight mb-1">{eq.brand}</h3>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">{eq.model}</p>
              <p className="text-blue-600 font-black text-[10px] uppercase tracking-tighter mb-4">{eq.title || 'Sem título comercial'}</p>

              {/* Botões só para admin */}
              {isAdmin ? (
                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                  <button onClick={() => handleEdit(eq)} className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-xl transition shadow-sm" title="Editar">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(eq.id)} className="p-3 bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white rounded-xl transition shadow-sm" title="Excluir">
                    <Trash2 size={18} />
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-slate-50 flex items-center gap-2">
                  <Lock size={11} className="text-slate-300" />
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Somente visualização</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de edição — só admin chega aqui */}
      {isEditing && isAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="bg-slate-50 px-8 py-5 flex items-center justify-between border-b border-slate-100">
              <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Ficha Técnica do Hardware</h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-xl shadow-sm"><X size={20} /></button>
            </div>
            <div className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[32px] p-6 bg-slate-50 relative group aspect-square">
                  {currentEq.imageUrl ? (
                    <>
                      <img src={currentEq.imageUrl} className="w-full h-full object-contain" alt="Preview" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-[32px] flex items-center justify-center">
                        <label className="cursor-pointer bg-white text-slate-800 px-4 py-2 rounded-xl font-bold text-xs shadow-xl uppercase tracking-widest">
                          Alterar Foto
                          <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleImageUpload} />
                        </label>
                      </div>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-2">
                      <div className="p-4 bg-white rounded-2xl shadow-sm text-blue-600"><Camera size={32} /></div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Foto</p>
                      <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fabricante</label>
                    <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" value={currentEq.brand} onChange={e => setCurrentEq({ ...currentEq, brand: e.target.value })} placeholder="Ex: Kyocera" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Modelo / Série</label>
                    <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" value={currentEq.model} onChange={e => setCurrentEq({ ...currentEq, model: e.target.value })} placeholder="Ex: M3655idn" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5">Título Comercial</label>
                    <input className="w-full p-3.5 bg-white border border-blue-200 rounded-2xl font-black focus:ring-4 focus:ring-blue-50 outline-none transition-all" value={currentEq.title} onChange={e => setCurrentEq({ ...currentEq, title: e.target.value })} placeholder="Ex: Multifuncional P&B de Alta Velocidade" />
                  </div>
                  <label className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl cursor-pointer border border-blue-100 select-none">
                    <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={currentEq.isColor} onChange={e => setCurrentEq({ ...currentEq, isColor: e.target.checked })} />
                    <span className="font-black text-blue-900 uppercase text-[10px] tracking-widest">Hardware Colorido</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descrição Técnica</label>
                <textarea
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-24 font-medium outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                  placeholder="Velocidade, processamento, gavetas de papel..."
                  value={currentEq.specs}
                  onChange={e => setCurrentEq({ ...currentEq, specs: e.target.value })}
                />
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex justify-end gap-4 border-t border-slate-100">
              <button onClick={() => setIsEditing(false)} className="px-8 py-3 font-black text-slate-400 hover:text-slate-800 transition uppercase text-xs tracking-widest">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-black hover:bg-blue-700 transition flex items-center gap-3 shadow-xl shadow-blue-200 uppercase text-xs tracking-widest disabled:opacity-60">
                <Save size={20} /> {saving ? 'Salvando...' : 'Efetivar Cadastro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentList;

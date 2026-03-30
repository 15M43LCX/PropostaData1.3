import React, { useState, useEffect } from 'react';
import { Printer, Plus, Edit, Save, X, Upload, Trash2, Camera } from 'lucide-react';
import { storage } from '../services/storage';
import { Equipment, User } from '../types';

const EquipmentList: React.FC<{ user: User }> = ({ user }) => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEq, setCurrentEq] = useState<Partial<Equipment>>({});

  const loadData = async () => {
    setLoading(true);
    setEquipments(await storage.getEquipments());
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleNew = () => {
    setCurrentEq({
      id: Math.random().toString(36).substr(2, 9),
      type: '',
      brand: '',
      model: '',
      title: '',
      monthlyVolume: 0,
      isColor: false,
      imageUrl: '',
      specs: ''
    });
    setIsEditing(true);
  };

  const handleEdit = (eq: Equipment) => {
    setCurrentEq(eq);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este equipamento? Ele não aparecerá mais para novas propostas.')) {
      await storage.deleteEquipment(id);
      await loadData();
    }
  };

  const handleSave = async () => {
    if (!currentEq.brand || !currentEq.model) {
      alert('Marca e Modelo são obrigatórios.');
      return;
    }
    await storage.saveEquipment(currentEq as Equipment);
    await loadData();
    setIsEditing(false);
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
        setCurrentEq({ ...currentEq, imageUrl: reader.result as string });
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
          <p className="text-slate-500 font-medium">Gestão técnica de ativos para composição de propostas.</p>
        </div>
        <button
          onClick={handleNew}
          className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-10 rounded-2xl flex items-center gap-3 transition shadow-xl shadow-blue-100 uppercase text-xs tracking-widest"
        >
          <Plus size={20} />
          Novo Equipamento
        </button>
      </div>

      {equipments.length === 0 && (
        <div className="text-center py-20 text-slate-300">
          <Printer className="mx-auto mb-4 opacity-20" size={56} />
          <p className="text-sm font-medium">Nenhum equipamento cadastrado ainda.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {equipments.map(eq => (
          <div key={eq.id} className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden group hover:border-blue-200 transition-all">
            <div className="aspect-square bg-slate-50 relative overflow-hidden flex items-center justify-center p-8">
              {eq.imageUrl ? (
                <img
                  src={eq.imageUrl}
                  alt={eq.model}
                  className="w-full h-full object-contain group-hover:scale-110 transition duration-500"
                />
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

              <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                <button
                  onClick={() => handleEdit(eq)}
                  className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-xl transition shadow-sm"
                  title="Editar"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDelete(eq.id)}
                  className="p-3 bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white rounded-xl transition shadow-sm"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isEditing && (
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
                      <div className="p-4 bg-white rounded-2xl shadow-sm text-blue-600">
                        <Camera size={32} />
                      </div>
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
                    <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5">Título do Equipamento (Comercial)</label>
                    <input className="w-full p-3.5 bg-white border border-blue-200 rounded-2xl font-black focus:ring-4 focus:ring-blue-50 outline-none transition-all" value={currentEq.title} onChange={e => setCurrentEq({ ...currentEq, title: e.target.value })} placeholder="Ex: Multifuncional P&B de Alta Velocidade" />
                  </div>
                  <label className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl cursor-pointer border border-blue-100 select-none">
                    <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={currentEq.isColor} onChange={e => setCurrentEq({ ...currentEq, isColor: e.target.checked })} />
                    <span className="font-black text-blue-900 uppercase text-[10px] tracking-widest">Hardware Colorido</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descrição Técnica Curta</label>
                <textarea
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-24 font-medium outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                  placeholder="Velocidade, processamento, gavetas de papel..."
                  value={currentEq.specs}
                  onChange={e => setCurrentEq({ ...currentEq, specs: e.target.value })}
                ></textarea>
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex justify-end gap-4 border-t border-slate-100">
              <button onClick={() => setIsEditing(false)} className="px-8 py-3 font-black text-slate-400 hover:text-slate-800 transition uppercase text-xs tracking-widest">Cancelar</button>
              <button onClick={handleSave} className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-black hover:bg-blue-700 transition flex items-center gap-3 shadow-xl shadow-blue-200 uppercase text-xs tracking-widest">
                <Save size={20} /> Efetivar Cadastro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentList;

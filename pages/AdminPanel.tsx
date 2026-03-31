import React, { useState, useEffect, useCallback } from 'react';
import {
  Save, Plus, Trash2, Target, List, Image as ImageIcon,
  Check, Upload, UserPlus, Users as UsersIcon, Edit, X, Lock, Lightbulb
} from 'lucide-react';
import { storage } from '../services/storage';
import { MasterData, User, UserRole } from '../types';
import { INITIAL_MASTER_DATA } from '../constants';

const AdminPanel: React.FC = () => {
  const [data, setData] = useState<MasterData>(INITIAL_MASTER_DATA);
  const [users, setUsers] = useState<User[]>([]);
  const [saveStatus, setSaveStatus] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User>>({
    role: UserRole.SELLER,
    name: '',
    email: '',
    phone: '',
    roleInCompany: '',
    password: ''
  });
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [newInputs, setNewInputs] = useState({
    commercialConditions: '',
    solutionTitle: '',
    solutionDesc: ''
  });

  const loadData = async () => {
    const [md, u] = await Promise.all([storage.getMasterData(), storage.getUsers()]);
    setData(md);
    setUsers(u);
  };

  useEffect(() => { loadData(); }, []);

  const persistData = useCallback(async (newData: MasterData) => {
    setData(newData);
    await storage.updateMasterData(newData);
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 2000);
  }, []);

  const handleUpdateField = <K extends keyof MasterData>(field: K, value: MasterData[K]) => {
    const newData = { ...data, [field]: value };
    persistData(newData);
  };

  const handleAddCondition = () => {
    const text = newInputs.commercialConditions.trim();
    if (!text) return;
    const newCondition = { id: crypto.randomUUID(), condition: text };
    const updatedList = [...(data.commercialConditions || []), newCondition];
    handleUpdateField('commercialConditions', updatedList);
    setNewInputs(prev => ({ ...prev, commercialConditions: '' }));
  };

  const handleAddSolution = () => {
    const title = newInputs.solutionTitle.trim();
    const description = newInputs.solutionDesc.trim();
    if (!title) return;
    const newSolution = { id: crypto.randomUUID(), title, description };
    const updatedList = [...(data.solutionTitles || []), newSolution];
    handleUpdateField('solutionTitles', updatedList);
    setNewInputs(prev => ({ ...prev, solutionTitle: '', solutionDesc: '' }));
  };

  const handleDeleteSolution = (id: string) => {
    const updatedList = data.solutionTitles.filter(s => s.id !== id);
    handleUpdateField('solutionTitles', updatedList);
  };

  const handleImageUpload = (type: keyof MasterData['layoutImages'], e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem é muito grande. Use arquivos de até 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      // Redimensiona e comprime a imagem para A4 (794x1123) antes de salvar
      const img = new Image();
      img.onload = () => {
        const MAX_W = 794;
        const MAX_H = 1123;
        const canvas = document.createElement('canvas');
        canvas.width = MAX_W;
        canvas.height = MAX_H;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, MAX_W, MAX_H);
        // Mantém proporção e centraliza
        const ratio = Math.min(MAX_W / img.width, MAX_H / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        ctx.drawImage(img, (MAX_W - w) / 2, (MAX_H - h) / 2, w, h);
        // Salva como JPEG 0.80 — boa qualidade, ~10x menor que PNG original
        const compressed = canvas.toDataURL('image/jpeg', 0.80);
        const newData = {
          ...data,
          layoutImages: { ...data.layoutImages, [type]: compressed }
        };
        persistData(newData);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = (type: keyof MasterData['layoutImages']) => {
    const newData = {
      ...data,
      layoutImages: { ...data.layoutImages, [type]: '' }
    };
    persistData(newData);
  };

  const handleSaveUser = async () => {
    if (!currentUser.name || !currentUser.email || !currentUser.password) {
      alert('Nome, E-mail e Senha são obrigatórios para o acesso.');
      return;
    }
    const userToSave = { ...currentUser, id: currentUser.id || crypto.randomUUID() } as User;
    await storage.saveUser(userToSave);
    setUsers(await storage.getUsers());
    setIsUserModalOpen(false);
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 2000);
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Remover este usuário definitivamente?')) {
      await storage.deleteUser(id);
      setUsers(await storage.getUsers());
    }
  };

  const handleOpenResetPassword = (userId: string) => {
    setResetPasswordUserId(userId);
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      setResetError('A senha deve ter pelo menos 4 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('As senhas não coincidem.');
      return;
    }
    const userToUpdate = users.find(u => u.id === resetPasswordUserId);
    if (!userToUpdate) return;
    await storage.saveUser({ ...userToUpdate, password: newPassword });
    setUsers(await storage.getUsers());
    setResetPasswordUserId(null);
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Painel Administrativo</h2>
          <p className="text-slate-500 font-medium">Controle de sistema e ativos.</p>
        </div>
        {saveStatus && (
          <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
            <Check size={18} /> Alterações Salvas
          </div>
        )}
      </div>

      {/* SEÇÃO USUÁRIOS */}
      <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <UsersIcon className="text-blue-600" size={24} />
            <h3 className="text-xl font-black text-slate-800">Vendedores & Administradores</h3>
          </div>
          <button
            onClick={() => {
              setCurrentUser({ role: UserRole.SELLER, name: '', email: '', phone: '', roleInCompany: '', password: '' });
              setIsUserModalOpen(true);
            }}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-blue-700 transition flex items-center gap-2"
          >
            <UserPlus size={18} /> Novo Usuário
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {users.map(u => (
            <div key={u.id} className="p-5 bg-slate-50 border border-slate-100 rounded-3xl flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{u.name}</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{u.roleInCompany || 'Vendedor'} • {u.role}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{u.email}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleOpenResetPassword(u.id)} className="p-2 text-slate-400 hover:text-amber-500 transition" title="Resetar Senha"><Lock size={14} /></button>
                <button onClick={() => { setCurrentUser(u); setIsUserModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 transition" title="Editar Usuário"><Edit size={14} /></button>
                <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-slate-400 hover:text-red-500 transition" title="Excluir Usuário"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <ImageIcon className="text-blue-600" size={24} />
            <h3 className="text-lg font-bold text-slate-800">Layout das Páginas (PNG)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ImageBox
              title="Pág 1: Capa"
              description="Background da Capa"
              value={data.layoutImages.cover}
              onUpload={(e) => handleImageUpload('cover', e)}
              onClear={() => handleClearImage('cover')}
            />
            <ImageBox
              title="Pág 2: Contra-Capa"
              description="Apresentação Institucional"
              value={data.layoutImages.intro}
              onUpload={(e) => handleImageUpload('intro', e)}
              onClear={() => handleClearImage('intro')}
            />
            <ImageBox
              title="Pág 3+: Demais"
              description="Papel Timbrado Padrão"
              value={data.layoutImages.background}
              onUpload={(e) => handleImageUpload('background', e)}
              onClear={() => handleClearImage('background')}
            />
          </div>
        </section>

        <section className="bg-slate-900 p-8 rounded-[32px] shadow-xl text-white flex flex-col justify-between border border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Target className="text-blue-400" size={24} />
              <h3 className="text-lg font-bold">Meta de Vendas</h3>
            </div>
            <div className="relative mt-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-700 pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-2xl text-white"
                value={data.salesGoal}
                onChange={(e) => handleUpdateField('salesGoal', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </section>
      </div>

      {/* SEÇÃO SOLUÇÕES */}
      <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <Lightbulb className="text-blue-600" size={24} />
          <h3 className="text-xl font-black text-slate-800">Soluções / Títulos de Proposta</h3>
        </div>
        <div className="flex flex-col gap-3 mb-6">
          <input
            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold"
            placeholder="Título da solução (ex: Outsourcing de Impressão)"
            value={newInputs.solutionTitle}
            onChange={(e) => setNewInputs(prev => ({ ...prev, solutionTitle: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSolution()}
          />
          <div className="flex gap-2">
            <input
              className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
              placeholder="Descrição breve (opcional)"
              value={newInputs.solutionDesc}
              onChange={(e) => setNewInputs(prev => ({ ...prev, solutionDesc: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSolution()}
            />
            <button onClick={handleAddSolution} className="bg-slate-900 text-white px-6 rounded-xl font-bold hover:bg-black transition flex items-center gap-2">
              <Plus size={20} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {(data.solutionTitles || []).map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-800">{item.title}</p>
                {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
              </div>
              <button onClick={() => handleDeleteSolution(item.id)} className="text-slate-300 hover:text-red-500 ml-4 flex-shrink-0"><Trash2 size={16} /></button>
            </div>
          ))}
          {(data.solutionTitles || []).length === 0 && (
            <p className="text-sm text-slate-400 col-span-2 text-center py-4">Nenhuma solução cadastrada ainda.</p>
          )}
        </div>
      </section>

      {/* SEÇÃO CONDIÇÕES COMERCIAIS */}
      <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <List className="text-blue-600" size={24} />
          <h3 className="text-xl font-black text-slate-800">Condições Comerciais</h3>
        </div>
        <div className="flex gap-2 mb-6">
          <input
            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            placeholder="Ex: Pagamento em até 10x sem juros"
            value={newInputs.commercialConditions}
            onChange={(e) => setNewInputs(prev => ({ ...prev, commercialConditions: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCondition()}
          />
          <button onClick={handleAddCondition} className="bg-slate-900 text-white px-6 rounded-xl font-bold hover:bg-black transition"><Plus size={20} /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {data.commercialConditions.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs font-medium text-slate-600">{typeof item === 'object' ? item.condition : item}</span>
              <button onClick={() => handleUpdateField('commercialConditions', data.commercialConditions.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </section>

      {/* MODAL DE USUÁRIO */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Ficha Técnica do Usuário</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-xl shadow-sm transition"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Nome Completo</label>
                <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" value={currentUser.name} onChange={e => setCurrentUser({ ...currentUser, name: e.target.value })} placeholder="João Silva" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Cargo</label>
                  <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" value={currentUser.roleInCompany} onChange={e => setCurrentUser({ ...currentUser, roleInCompany: e.target.value })} placeholder="Ex: Gerente" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Celular / WhatsApp</label>
                  <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" value={currentUser.phone} onChange={e => setCurrentUser({ ...currentUser, phone: e.target.value })} placeholder="(21) 99999-9999" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">E-mail (Login)</label>
                <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" value={currentUser.email} onChange={e => setCurrentUser({ ...currentUser, email: e.target.value })} placeholder="email@daticopy.com.br" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-blue-600 uppercase ml-1 tracking-widest">Senha de Acesso</label>
                <input type="password" className="w-full p-3.5 bg-blue-50/30 border border-blue-100 rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" value={currentUser.password} onChange={e => setCurrentUser({ ...currentUser, password: e.target.value })} placeholder="••••••••" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Nível de Permissão</label>
                <select className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-700 focus:ring-4 focus:ring-blue-100 outline-none transition-all appearance-none cursor-pointer" value={currentUser.role} onChange={e => setCurrentUser({ ...currentUser, role: e.target.value as UserRole })}>
                  <option value={UserRole.SELLER}>Vendedor (Acesso restrito)</option>
                  <option value={UserRole.ADMIN}>Administrador (Acesso total)</option>
                </select>
              </div>

              <button onClick={handleSaveUser} className="w-full bg-blue-600 text-white p-4 rounded-[20px] font-black hover:bg-blue-700 transition-all mt-6 shadow-xl shadow-blue-100 uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                <Save size={18} /> Salvar Dados do Usuário
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL RESET DE SENHA */}
      {resetPasswordUserId && (() => {
        const targetUser = users.find(u => u.id === resetPasswordUserId);
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
              <div className="px-8 py-6 border-b flex justify-between items-center bg-amber-50/50">
                <div className="flex items-center gap-2">
                  <Lock size={18} className="text-amber-500" />
                  <h3 className="font-black text-slate-800 text-sm">Resetar Senha</h3>
                </div>
                <button onClick={() => setResetPasswordUserId(null)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-xl shadow-sm transition"><X size={18} /></button>
              </div>
              <div className="p-8 space-y-4">
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Usuário</p>
                  <p className="font-bold text-slate-800">{targetUser?.name}</p>
                  <p className="text-xs text-slate-400">{targetUser?.email}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">Nova Senha</label>
                  <input
                    type="password"
                    className="w-full p-3.5 bg-amber-50/30 border border-amber-100 rounded-2xl font-bold focus:ring-4 focus:ring-amber-100 outline-none transition-all"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setResetError(''); }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    className="w-full p-3.5 bg-amber-50/30 border border-amber-100 rounded-2xl font-bold focus:ring-4 focus:ring-amber-100 outline-none transition-all"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setResetError(''); }}
                  />
                </div>
                {resetError && (
                  <p className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded-xl">{resetError}</p>
                )}
                <button
                  onClick={handleResetPassword}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white p-4 rounded-[20px] font-black transition-all shadow-lg shadow-amber-100 uppercase text-xs tracking-widest flex items-center justify-center gap-2 mt-2"
                >
                  <Lock size={16} /> Confirmar Reset de Senha
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

const ImageBox: React.FC<{
  title: string;
  description: string;
  value: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}> = ({ title, description, value, onUpload, onClear }) => (
  <div className="flex flex-col gap-3">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
    <div className={`aspect-[3/4.2] rounded-3xl border-2 border-dashed relative overflow-hidden transition-all ${value ? 'border-blue-500 bg-blue-50 shadow-inner' : 'border-slate-200 bg-slate-50 hover:border-blue-300'}`}>
      {value ? (
        <>
          <img src={value} className="w-full h-full object-cover" alt={title} />
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <button onClick={onClear} className="p-3 bg-red-500 text-white rounded-2xl shadow-xl hover:bg-red-600 transition"><Trash2 size={24} /></button>
          </div>
        </>
      ) : (
        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-6 text-center">
          <div className="p-4 bg-white rounded-2xl shadow-sm mb-4"><Upload className="text-blue-500" size={32} /></div>
          <p className="text-[11px] font-black text-slate-800 uppercase leading-tight mb-1">Upload PNG</p>
          <input type="file" className="hidden" accept="image/png" onChange={onUpload} />
        </label>
      )}
    </div>
  </div>
);

export default AdminPanel;

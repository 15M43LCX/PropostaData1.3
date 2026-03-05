import React, { useState, useCallback } from 'react';
import { 
  Save, Plus, Trash2, Target, List, ShieldCheck, 
  Image as ImageIcon, Check, Upload, UserPlus, 
  Users as UsersIcon, Edit, X, Phone, Briefcase, Mail, Lock 
} from 'lucide-react';
import { storage } from '../services/storage';
import { MasterData, User, UserRole } from '../types';

const AdminPanel: React.FC = () => {
  // ==========================================
  // ESTADOS
  // ==========================================
  const [data, setData] = useState<MasterData>(storage.getMasterData());
  const [users, setUsers] = useState<User[]>(storage.getUsers());
  const [saveStatus, setSaveStatus] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  
  // Estado inicial do usuário com todos os campos necessários
  const [currentUser, setCurrentUser] = useState<Partial<User>>({ 
    role: UserRole.SELLER,
    name: '',
    email: '',
    phone: '',
    roleInCompany: '',
    password: ''
  });
  
  const [newInputs, setNewInputs] = useState({
    commercialConditions: '',
    solutionTitle: '',
    solutionDesc: ''
  });

  // ==========================================
  // LOGICA DE ATUALIZAÇÃO
  // ==========================================
  
  const persistData = useCallback((newData: MasterData) => {
    setData(newData);
    storage.updateMasterData(newData);
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

    const newCondition = {
      id: crypto.randomUUID(),
      condition: text
    };

    const updatedList = [...(data.commercialConditions || []), newCondition];
    handleUpdateField('commercialConditions', updatedList);
    setNewInputs(prev => ({ ...prev, commercialConditions: '' }));
  };

  const handleImageUpload = (type: keyof MasterData['layoutImages'], e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("A imagem é muito grande. Use arquivos PNG de até 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const newData = {
          ...data,
          layoutImages: {
            ...data.layoutImages,
            [type]: base64String
          }
        };
        persistData(newData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImage = (type: keyof MasterData['layoutImages']) => {
    const newData = {
      ...data,
      layoutImages: {
        ...data.layoutImages,
        [type]: ''
      }
    };
    persistData(newData);
  };

  // Gerenciamento de Usuários
  const handleSaveUser = () => {
    if (!currentUser.name || !currentUser.email || !currentUser.password) {
      alert("Nome, E-mail e Senha são obrigatórios para o acesso.");
      return;
    }
    
    const userToSave = {
      ...currentUser,
      id: currentUser.id || crypto.randomUUID()
    } as User;

    storage.saveUser(userToSave);
    setUsers(storage.getUsers());
    setIsUserModalOpen(false);
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 2000);
  };

  const handleDeleteUser = (id: string) => {
    if (window.confirm("Remover este usuário definitivamente?")) {
      storage.deleteUser(id);
      setUsers(storage.getUsers());
    }
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
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setCurrentUser(u); setIsUserModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600"><Edit size={14} /></button>
                <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
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

      {/* SEÇÃO CONDIÇÕES COMERCIAIS */}
      <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
           <List className="text-blue-600" size={24} />
           <h3 className="text-xl font-black text-slate-800">Condições Comerciais</h3>
        </div>
        <div className="flex gap-2 mb-6">
           <input className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Ex: Pagamento em até 10x sem juros" value={newInputs.commercialConditions} onChange={(e) => setNewInputs(prev => ({...prev, commercialConditions: e.target.value}))} />
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

      {/* MODAL DE USUÁRIO - CAMPOS RESTAURADOS E AMPLIADOS */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100">
             <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50">
               <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Ficha Técnica do Usuário</h3>
               <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-xl shadow-sm transition"><X size={20} /></button>
             </div>
             <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* NOME */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Nome Completo</label>
                  <div className="relative">
                    <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" value={currentUser.name} onChange={e => setCurrentUser({...currentUser, name: e.target.value})} placeholder="João Silva" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* CARGO */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Cargo</label>
                    <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" value={currentUser.roleInCompany} onChange={e => setCurrentUser({...currentUser, roleInCompany: e.target.value})} placeholder="Ex: Gerente" />
                  </div>
                  {/* CELULAR */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Celular / WhatsApp</label>
                    <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" value={currentUser.phone} onChange={e => setCurrentUser({...currentUser, phone: e.target.value})} placeholder="(21) 99999-9999" />
                  </div>
                </div>

                {/* EMAIL */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">E-mail (Login)</label>
                  <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" value={currentUser.email} onChange={e => setCurrentUser({...currentUser, email: e.target.value})} placeholder="email@daticopy.com.br" />
                </div>

                {/* SENHA */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-blue-600 uppercase ml-1 tracking-widest">Senha de Acesso</label>
                  <input type="password" className="w-full p-3.5 bg-blue-50/30 border border-blue-100 rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" value={currentUser.password} onChange={e => setCurrentUser({...currentUser, password: e.target.value})} placeholder="••••••••" />
                </div>

                {/* NÍVEL DE ACESSO */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Nível de Permissão</label>
                  <select className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-700 focus:ring-4 focus:ring-blue-100 outline-none transition-all appearance-none cursor-pointer" value={currentUser.role} onChange={e => setCurrentUser({...currentUser, role: e.target.value as UserRole})}>
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
    </div>
  );
};

const ImageBox: React.FC<{ title: string; description: string; value: string; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void; }> = ({ title, description, value, onUpload, onClear }) => (
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

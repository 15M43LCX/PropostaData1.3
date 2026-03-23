import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Phone, Mail, MapPin, X, Save, Trash2, User as UserIcon } from 'lucide-react';
import { storage } from '../services/storage';
import { User, Customer, UserRole } from '../types';

const CustomerList: React.FC<{ user: User }> = ({ user }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Partial<Customer>>({});

  const loadData = async () => {
    setLoading(true);
    setCustomers(await storage.getVisibleCustomers(user));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const handleNew = () => {
    setCurrentCustomer({
      id: Math.random().toString(36).substr(2, 9),
      sellerId: user.id,
      companyName: '',
      tradeName: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
      number: '',
      neighborhood: '',
      city: '',
      state: ''
    });
    setIsEditing(true);
  };

  const handleEdit = (c: Customer) => {
    setCurrentCustomer(c);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este cliente? Isso removerá o vínculo com futuras propostas.')) {
      await storage.deleteCustomer(id);
      await loadData();
    }
  };

  const handleSave = async () => {
    if (!currentCustomer.companyName) {
      alert('A Razão Social é obrigatória.');
      return;
    }
    await storage.saveCustomer(currentCustomer as Customer);
    await loadData();
    setIsEditing(false);
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
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Carteira de Clientes</h2>
          <p className="text-slate-500 font-medium">Gestão de contatos e empresas para prospecção.</p>
        </div>
        <button
          onClick={handleNew}
          className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-10 rounded-2xl flex items-center gap-3 transition shadow-xl shadow-blue-100 uppercase text-xs tracking-widest"
        >
          <Plus size={20} /> Novo Cliente
        </button>
      </div>

      {customers.length === 0 && (
        <div className="text-center py-20 text-slate-300">
          <Users className="mx-auto mb-4 opacity-20" size={56} />
          <p className="text-sm font-medium">Nenhum cliente cadastrado ainda.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map(c => (
          <div key={c.id} className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 hover:shadow-md transition group relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xl shadow-inner uppercase">
                {c.companyName.charAt(0)}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(c)} className="p-2.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-xl transition shadow-sm"><Edit size={18} /></button>
                <button onClick={() => handleDelete(c.id)} className="p-2.5 text-slate-400 hover:text-red-500 bg-slate-50 rounded-xl transition shadow-sm"><Trash2 size={18} /></button>
              </div>
            </div>

            <h3 className="font-black text-slate-800 text-lg leading-tight truncate mb-1">{c.companyName}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">{c.tradeName || 'S/ NOME FANTASIA'}</p>

            <div className="space-y-3 text-sm font-medium text-slate-600">
              <div className="flex items-center gap-3"><UserIcon size={14} className="text-blue-500" /> <span className="font-bold text-slate-800">{c.contactName || 'Não informado'}</span></div>
              <div className="flex items-center gap-3"><Phone size={14} className="text-blue-500" /> <span>{c.phone}</span></div>
              <div className="flex items-center gap-3"><Mail size={14} className="text-blue-500" /> <span className="truncate">{c.email}</span></div>
              <div className="flex items-center gap-3"><MapPin size={14} className="text-blue-500" /> <span className="truncate">{c.city} - {c.state}</span></div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Código Ref: {c.id.slice(0, 5)}</span>
            </div>
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="bg-slate-50 px-8 py-5 flex items-center justify-between border-b">
              <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Dados Cadastrais</h3>
              <button onClick={() => setIsEditing(false)} className="bg-white p-2 rounded-xl text-slate-400 shadow-sm"><X size={20} /></button>
            </div>
            <div className="p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Razão Social *</label>
                  <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" value={currentCustomer.companyName} onChange={e => setCurrentCustomer({ ...currentCustomer, companyName: e.target.value })} placeholder="Ex: Nome da Empresa LTDA" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome Fantasia</label>
                  <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" value={currentCustomer.tradeName} onChange={e => setCurrentCustomer({ ...currentCustomer, tradeName: e.target.value })} placeholder="Ex: Nome Curto" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Responsável (Contato Principal) *</label>
                  <input className="w-full p-4 bg-blue-50/30 border border-blue-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" value={currentCustomer.contactName} onChange={e => setCurrentCustomer({ ...currentCustomer, contactName: e.target.value })} placeholder="Ex: João da Silva" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</label>
                  <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" value={currentCustomer.phone} onChange={e => setCurrentCustomer({ ...currentCustomer, phone: e.target.value })} placeholder="(21) 0000-0000" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail Corporativo</label>
                  <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" value={currentCustomer.email} onChange={e => setCurrentCustomer({ ...currentCustomer, email: e.target.value })} placeholder="exemplo@empresa.com" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cidade</label>
                    <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" value={currentCustomer.city} onChange={e => setCurrentCustomer({ ...currentCustomer, city: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UF</label>
                    <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 uppercase" maxLength={2} value={currentCustomer.state} onChange={e => setCurrentCustomer({ ...currentCustomer, state: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex justify-end gap-4 border-t">
              <button onClick={() => setIsEditing(false)} className="px-8 py-3 font-black text-slate-400 hover:text-slate-800 transition uppercase text-xs tracking-widest">Descartar</button>
              <button onClick={handleSave} className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-black hover:bg-blue-700 transition flex items-center gap-2 shadow-xl shadow-blue-100 uppercase text-xs tracking-widest">
                <Save size={18} /> Gravar Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerList;

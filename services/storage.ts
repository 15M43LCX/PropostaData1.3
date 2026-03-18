import { Customer, Equipment, MasterData, Proposal, User, UserRole } from '../types';
import { INITIAL_MASTER_DATA, MOCK_CUSTOMERS, MOCK_EQUIPMENTS, MOCK_USERS } from '../constants';
import { supabase } from './supabase';

const CURRENT_USER_KEY = 'pp_current_user';

const handleResponse = <T>(data: T | null, error: any, fallback: T): T => {
  if (error) { console.error('Supabase error:', error.message); return fallback; }
  return data ?? fallback;
};

export const storage = {

  // ─── USUÁRIOS ───────────────────────────────────────────────
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('usuarios').select('*');
    return handleResponse(data, error, MOCK_USERS);
  },
  saveUser: async (user: User) => {
    const { error } = await supabase.from('usuarios').upsert(user);
    if (error) throw error;
  },
  deleteUser: async (id: string) => {
    const { error } = await supabase.from('usuarios').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── CLIENTES ────────────────────────────────────────────────
  getCustomers: async (): Promise<Customer[]> => {
    const { data, error } = await supabase.from('clientes').select('*');
    return handleResponse(data, error, MOCK_CUSTOMERS);
  },
  saveCustomer: async (customer: Customer) => {
    const { error } = await supabase.from('clientes').upsert(customer);
    if (error) throw error;
  },
  deleteCustomer: async (id: string) => {
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) throw error;
  },
  getVisibleCustomers: async (user: User): Promise<Customer[]> => {
    const all = await storage.getCustomers();
    return user.role === UserRole.ADMIN ? all : all.filter(c => c.sellerId === user.id);
  },

  // ─── EQUIPAMENTOS ────────────────────────────────────────────
  getEquipments: async (): Promise<Equipment[]> => {
    const { data, error } = await supabase.from('equipamentos').select('*');
    return handleResponse(data, error, MOCK_EQUIPMENTS);
  },
  saveEquipment: async (eq: Equipment) => {
    const { error } = await supabase.from('equipamentos').upsert(eq);
    if (error) throw error;
  },
  deleteEquipment: async (id: string) => {
    const { error } = await supabase.from('equipamentos').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── PROPOSTAS ───────────────────────────────────────────────
  getProposals: async (): Promise<Proposal[]> => {
    const { data, error } = await supabase
      .from('propostas').select('*').order('createdAt', { ascending: false });
    return handleResponse(data, error, []);
  },
  saveProposal: async (prop: Proposal) => {
    const { error } = await supabase.from('propostas').upsert(prop);
    if (error) throw error;
  },
  deleteProposal: async (id: string) => {
    const { error } = await supabase.from('propostas').delete().eq('id', id);
    if (error) throw error;
  },
  getVisibleProposals: async (user: User): Promise<Proposal[]> => {
    const all = await storage.getProposals();
    return user.role === UserRole.ADMIN ? all : all.filter(p => p.sellerId === user.id);
  },

  // ─── MASTER DATA (agora no Supabase) ─────────────────────────
  getMasterData: async (): Promise<MasterData> => {
    const { data, error } = await supabase
      .from('master_data').select('*').eq('key', 'config').maybeSingle();
    if (error || !data) return INITIAL_MASTER_DATA;
    return data.value as MasterData;
  },
  updateMasterData: async (md: MasterData) => {
    const { error } = await supabase
      .from('master_data').upsert({ key: 'config', value: md });
    if (error) throw error;
  },

  // ─── SESSÃO (localStorage — ok para sessão local) ─────────────
  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  },
  setCurrentUser: (user: User | null) => {
    if (user) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(CURRENT_USER_KEY);
  },
};

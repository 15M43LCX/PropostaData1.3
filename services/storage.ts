import { Customer, Equipment, MasterData, Proposal, User, UserRole } from '../types';
import { INITIAL_MASTER_DATA, MOCK_CUSTOMERS, MOCK_EQUIPMENTS, MOCK_USERS } from '../constants';
import { supabase } from './supabase';

const KEYS = {
  CURRENT_USER: 'pp_current_user'
};

// Auxiliar para lidar com erros e retorno de dados
const handleResponse = (data: any, error: any) => {
  if (error) {
    console.error('Erro no Supabase:', error.message);
    return null;
  }
  return data;
};

export const storage = {
  // --- USUÁRIOS ---
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('usuarios').select('*');
    return handleResponse(data, error) || MOCK_USERS;
  },
  saveUser: async (user: User) => {
    const { error } = await supabase.from('usuarios').upsert(user);
    if (error) console.error('Erro ao salvar usuário:', error);
  },
  deleteUser: async (id: string) => {
    await supabase.from('usuarios').delete().eq('id', id);
  },

  // --- CLIENTES ---
  getCustomers: async (): Promise<Customer[]> => {
    const { data, error } = await supabase.from('clientes').select('*');
    return handleResponse(data, error) || MOCK_CUSTOMERS;
  },
  saveCustomer: async (customer: Customer) => {
    const { error } = await supabase.from('clientes').upsert(customer);
    if (error) console.error('Erro ao salvar cliente:', error);
  },
  deleteCustomer: async (id: string) => {
    await supabase.from('clientes').delete().eq('id', id);
  },
  getVisibleCustomers: async (user: User): Promise<Customer[]> => {
    const all = await storage.getCustomers();
    if (user.role === UserRole.ADMIN) return all;
    return all.filter(c => c.sellerId === user.id);
  },

  // --- EQUIPAMENTOS ---
  getEquipments: async (): Promise<Equipment[]> => {
    const { data, error } = await supabase.from('equipamentos').select('*');
    return handleResponse(data, error) || MOCK_EQUIPMENTS;
  },
  saveEquipment: async (eq: Equipment) => {
    const { error } = await supabase.from('equipamentos').upsert(eq);
    if (error) console.error('Erro ao salvar equipamento:', error);
  },
  deleteEquipment: async (id: string) => {
    await supabase.from('equipamentos').delete().eq('id', id);
  },

  // --- PROPOSTAS ---
  getProposals: async (): Promise<Proposal[]> => {
    const { data, error } = await supabase.from('propostas').select('*').order('createdAt', { ascending: false });
    return handleResponse(data, error) || [];
  },
  saveProposal: async (prop: Proposal) => {
    const { error } = await supabase.from('propostas').upsert(prop);
    if (error) console.error('Erro ao salvar proposta:', error);
  },
  deleteProposal: async (id: string) => {
    await supabase.from('propostas').delete().eq('id', id);
  },
  getVisibleProposals: async (user: User): Promise<Proposal[]> => {
    const all = await storage.getProposals();
    if (user.role === UserRole.ADMIN) return all;
    return all.filter(p => p.sellerId === user.id);
  },

  // --- CONFIGURAÇÕES E LOGIN (Mantidos locais por segurança/sessão) ---
  getMasterData: (): MasterData => {
    const data = localStorage.getItem('pp_master_data');
    return data ? JSON.parse(data) : INITIAL_MASTER_DATA;
  },
  updateMasterData: (data: MasterData) => {
    localStorage.setItem('pp_master_data', JSON.stringify(data));
  },
  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },
  setCurrentUser: (user: User | null) => localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user))
};

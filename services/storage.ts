
import { Customer, Equipment, MasterData, Proposal, User, UserRole } from '../types';
import { INITIAL_MASTER_DATA, MOCK_CUSTOMERS, MOCK_EQUIPMENTS, MOCK_USERS } from '../constants';

const KEYS = {
  USERS: 'pp_users',
  CUSTOMERS: 'pp_customers',
  EQUIPMENTS: 'pp_equipments',
  PROPOSALS: 'pp_proposals',
  MASTER_DATA: 'pp_master_data',
  CURRENT_USER: 'pp_current_user'
};

const getFromStorage = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    const parsed = JSON.parse(data);
    
    // Se for um array de objetos com ID, vamos mesclar novos itens do mock
    if (Array.isArray(parsed) && Array.isArray(defaultValue)) {
      const merged = [...parsed];
      let changed = false;
      
      defaultValue.forEach(defItem => {
        if (defItem && typeof defItem === 'object' && 'id' in defItem) {
          if (!merged.find(m => m.id === (defItem as any).id)) {
            merged.push(defItem);
            changed = true;
          }
        }
      });
      
      if (changed) {
        localStorage.setItem(key, JSON.stringify(merged));
        return merged as unknown as T;
      }
    }
    
    return parsed;
  } catch {
    return defaultValue;
  }
};

export const storage = {
  getUsers: (): User[] => {
    const users = getFromStorage(KEYS.USERS, MOCK_USERS);
    // Correção de emergência para o e-mail do administrador
    const admin = users.find(u => u.id === 'u1');
    if (admin && admin.email !== 'admin@empresa.com') {
      admin.email = 'admin@empresa.com';
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    }
    return users;
  },
  saveUser: (user: User) => {
    const list = storage.getUsers();
    const index = list.findIndex(u => u.id === user.id);
    if (index >= 0) list[index] = user;
    else list.push(user);
    localStorage.setItem(KEYS.USERS, JSON.stringify(list));
  },
  deleteUser: (id: string) => {
    const list = storage.getUsers().filter(u => u.id !== id);
    localStorage.setItem(KEYS.USERS, JSON.stringify(list));
  },

  getCustomers: (): Customer[] => getFromStorage(KEYS.CUSTOMERS, MOCK_CUSTOMERS),
  saveCustomer: (customer: Customer) => {
    const list = storage.getCustomers();
    const index = list.findIndex(c => c.id === customer.id);
    if (index >= 0) list[index] = customer;
    else list.push(customer);
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(list));
  },
  deleteCustomer: (id: string) => {
    const list = storage.getCustomers().filter(c => c.id !== id);
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(list));
  },
  getVisibleCustomers: (user: User): Customer[] => {
    const all = storage.getCustomers();
    if (user.role === UserRole.ADMIN) return all;
    return all.filter(c => c.sellerId === user.id);
  },

  getEquipments: (): Equipment[] => getFromStorage(KEYS.EQUIPMENTS, MOCK_EQUIPMENTS),
  saveEquipment: (eq: Equipment) => {
    const list = storage.getEquipments();
    const index = list.findIndex(e => e.id === eq.id);
    if (index >= 0) list[index] = eq;
    else list.push(eq);
    localStorage.setItem(KEYS.EQUIPMENTS, JSON.stringify(list));
  },
  deleteEquipment: (id: string) => {
    const list = storage.getEquipments().filter(e => e.id !== id);
    localStorage.setItem(KEYS.EQUIPMENTS, JSON.stringify(list));
  },

  getProposals: (): Proposal[] => getFromStorage(KEYS.PROPOSALS, []),
  saveProposal: (prop: Proposal) => {
    const list = storage.getProposals();
    const index = list.findIndex(p => p.id === prop.id);
    if (index >= 0) list[index] = prop;
    else list.push(prop);
    localStorage.setItem(KEYS.PROPOSALS, JSON.stringify(list));
  },
  deleteProposal: (id: string) => {
    const list = storage.getProposals().filter(p => p.id !== id);
    localStorage.setItem(KEYS.PROPOSALS, JSON.stringify(list));
  },
  getVisibleProposals: (user: User): Proposal[] => {
    const all = storage.getProposals();
    if (user.role === UserRole.ADMIN) return all;
    return all.filter(p => p.sellerId === user.id);
  },

  getMasterData: (): MasterData => {
    const data = getFromStorage(KEYS.MASTER_DATA, INITIAL_MASTER_DATA);
    return { ...INITIAL_MASTER_DATA, ...data };
  },
  updateMasterData: (data: MasterData) => {
    localStorage.setItem(KEYS.MASTER_DATA, JSON.stringify(data));
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },
  setCurrentUser: (user: User | null) => localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user))
};

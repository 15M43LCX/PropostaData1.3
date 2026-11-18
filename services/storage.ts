import { AuditLog, Customer, Equipment, MasterData, Proposal, User, UserRole } from '../types';
import { INITIAL_MASTER_DATA, MOCK_CUSTOMERS, MOCK_USERS } from '../constants';
import { supabase } from './supabase';

const CURRENT_USER_KEY = 'pp_current_user';

// Colunas do equipamento SEM a foto (imageUrl é pesada — base64).
const EQUIPMENT_LIGHT_COLUMNS = 'id,type,brand,model,title,monthlyVolume,isColor,specs';

// Cache em memória das fotos já baixadas (id -> data URL). Vale enquanto a aba estiver aberta.
const imageCache = new Map<string, string>();

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
  // IMPORTANTE: a coluna "imageUrl" guarda a foto em base64 (pode ter MBs por linha).
  // Um select('*') traz TODAS as fotos de uma vez e estoura o statement_timeout da API
  // do Supabase (erro 500 "canceling statement due to statement timeout").
  // Por isso a lista é carregada SEM a foto, e as fotos vêm depois, uma a uma (lazy).
  getEquipments: async (): Promise<Equipment[]> => {
    // 1ª tentativa: lista leve (sem imageUrl). Tenta até 2 vezes.
    let lastError: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await supabase.from('equipamentos').select(EQUIPMENT_LIGHT_COLUMNS);
      if (!error) {
        return ((data as any[]) || []).map(row => ({ ...row, imageUrl: imageCache.get(row.id) || '' })) as Equipment[];
      }
      lastError = error;
      console.error(`Supabase error (equipamentos, tentativa ${attempt + 1}):`, error.message);
    }

    // Último recurso: select('*') (caso os nomes das colunas sejam diferentes do esperado).
    const { data, error } = await supabase.from('equipamentos').select('*');
    if (!error) {
      return ((data as any[]) || []).map(row => {
        if (row.imageUrl) imageCache.set(row.id, row.imageUrl);
        return row;
      }) as Equipment[];
    }

    // NÃO usa mais MOCK_EQUIPMENTS como fallback: isso fazia aparecer só 2 equipamentos
    // falsos (ids e1/e2) e propostas eram salvas apontando para equipamentos inexistentes.
    console.error('Supabase error (equipamentos, fallback *):', error.message);
    throw new Error(lastError?.message || error.message || 'Falha ao carregar equipamentos');
  },

  // Busca as fotos de uma lista de equipamentos, uma por requisição, com poucas em paralelo.
  // onImage é chamado a cada foto que chega (para atualizar a tela aos poucos).
  loadEquipmentImages: async (
    ids: string[],
    onImage?: (id: string, imageUrl: string) => void,
    concurrency = 4
  ): Promise<void> => {
    const queue = ids.filter(id => id);
    const worker = async () => {
      while (queue.length > 0) {
        const id = queue.shift()!;
        if (imageCache.has(id)) { onImage?.(id, imageCache.get(id)!); continue; }
        for (let attempt = 0; attempt < 2; attempt++) {
          const { data, error } = await supabase
            .from('equipamentos').select('id,imageUrl').eq('id', id).maybeSingle();
          if (!error) {
            const url = (data as any)?.imageUrl || '';
            imageCache.set(id, url);
            if (url) onImage?.(id, url);
            break;
          }
          console.warn(`Foto do equipamento ${id} não carregou (tentativa ${attempt + 1}):`, error.message);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  },

  // Versão que espera tudo terminar e devolve { id: imageUrl } — usada no PDF e na edição.
  getEquipmentImages: async (ids: string[]): Promise<Record<string, string>> => {
    const unique = Array.from(new Set(ids.filter(id => id)));
    await storage.loadEquipmentImages(unique);
    const result: Record<string, string> = {};
    unique.forEach(id => { result[id] = imageCache.get(id) || ''; });
    return result;
  },

  saveEquipment: async (eq: Equipment) => {
    // Se a foto está vazia, NÃO envia a coluna imageUrl — assim um equipamento cuja foto
    // ainda não foi carregada nunca tem a foto apagada por engano no banco.
    const { imageUrl, ...rest } = eq;
    const payload = imageUrl ? eq : rest;
    const { error } = await supabase.from('equipamentos').upsert(payload);
    if (error) throw error;
    if (imageUrl) imageCache.set(eq.id, imageUrl);
  },
  deleteEquipment: async (id: string) => {
    const { error } = await supabase.from('equipamentos').delete().eq('id', id);
    if (error) throw error;
    imageCache.delete(id);
  },

  // ─── PROPOSTAS ───────────────────────────────────────────────
  getProposals: async (): Promise<Proposal[]> => {
    const { data, error } = await supabase
      .from('propostas').select('*').order('createdAt', { ascending: false });
    return handleResponse(data, error, []);
  },
  // Próximo código sequencial: ANO + sequência de 3 dígitos (ex.: 2026057).
  // Usa o MAIOR número já existente no ano (e não a contagem), então nunca repete
  // código mesmo que alguma proposta tenha sido excluída ou o vendedor só enxergue as dele.
  getNextProposalCode: async (): Promise<string> => {
    const year = new Date().getFullYear();
    const { data, error } = await supabase.from('propostas').select('code');
    if (error) throw error;
    let max = 0;
    ((data as any[]) || []).forEach(row => {
      const m = /^(\d{4})(\d+)$/.exec(String(row.code || '').trim());
      if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2]));
    });
    return `${year}${String(max + 1).padStart(3, '0')}`;
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

  // ─── MASTER DATA ─────────────────────────────────────────────
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

  // ─── AUDIT LOG ───────────────────────────────────────────────
  getLogs: async (): Promise<AuditLog[]> => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(500);
    return handleResponse(data, error, []);
  },
  addLog: async (log: AuditLog): Promise<void> => {
    // fire-and-forget — nunca bloqueia a operação principal
    // ATENÇÃO: para funcionar, a tabela 'audit_logs' deve existir no Supabase
    // e ter uma Row Level Security policy que permita INSERT para usuários autenticados
    // ou ser acessível via service role. Verifique: Supabase → Table Editor → audit_logs → Policies.
    supabase.from('audit_logs').insert(log).then(({ error }) => {
      if (error) {
        console.warn('⚠️ Audit log NÃO registrado:', error.message);
        console.warn('Verifique se a tabela audit_logs existe e se a RLS policy permite INSERT.');
      }
    });
  },

  // ─── SESSÃO ──────────────────────────────────────────────────
  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  },
  setCurrentUser: (user: User | null) => {
    if (user) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(CURRENT_USER_KEY);
  },
};


export enum UserRole {
  ADMIN = 'ADMIN',
  SELLER = 'SELLER'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  title: string;
  phone: string;
  mobile: string;
  password?: string;
  roleInCompany?: string;
}

export interface Customer {
  id: string;
  sellerId: string;
  companyName: string;
  tradeName: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface Equipment {
  id: string;
  type: string;
  brand: string;
  model: string;
  title: string; 
  monthlyVolume: number;
  isColor: boolean;
  imageUrl: string;
  specs: string;
}

export enum PricingModel {
  VENDA = 'Venda',
  OUTSOURCING = 'Outsourcing',
  CLIQUE = 'Contrato de Clique'
}

export enum OutsourcingSubtype {
  FRANCHISE_EXCESS_PRODUCED = 'Franquia + Excedente + Cliques',
  FRANCHISE_EXCESS = 'Franquia + Excedente',
  FIXED_PRODUCED = 'Fixo + Cliques'
}

export enum ProposalStatus {
  ABERTO = 'Aberto',
  EM_NEGOCIACAO = 'Em Negociação',
  FECHADO = 'Fechado',
  PERDIDO = 'Perdido'
}

export interface ProposalItem {
  equipmentId: string;
  quantity: number;
  unitValue?: number;
  monthlyValue: number;
  monoFranchise: number;
  monoExcess: number;
  monoClickPrice?: number;
  colorFranchise?: number;
  colorExcess?: number;
  colorClickPrice?: number;
  // Campos adicionais
  itemNote?: string;       // Texto descritivo do item
  isExtra?: boolean;       // Se é um "Ítem Extra"
  extraDescription?: string; // Descrição do ítem extra
}

export interface Proposal {
  id: string;
  code: string;
  date: string;
  sellerId: string;
  customerId: string;
  title: string;
  pricingModel: PricingModel;
  outsourcingSubtype?: OutsourcingSubtype;
  items: ProposalItem[];
  paymentMethod: string;
  validity: string;
  deliveryTime: string;
  slaTime: string;
  contractTerm?: string; // Novo campo para vigência
  selectedConditions?: string[]; // IDs das condições comerciais selecionadas
  status: ProposalStatus;
  totalValue: number;
}

export interface MasterData {
  solutionTitles: { id: string; title: string; description: string }[];
  paymentMethods: string[];
  validities: string[];
  deliveryTimes: string[];
  slaTimes: string[];
  contractTerms: string[]; // Nova lista de vigências
  commercialConditions: { id: string; condition: string }[];
  salesGoal: number;
  layoutImages: {
    cover: string;       
    intro: string;       
    background: string;  
  };
  conversionResetMonth?: string; // Formato "YYYY-MM" — mês em que a taxa foi zerada
}

export type AuditModule = 'proposta' | 'cliente' | 'equipamento' | 'usuario';
export type AuditAction = 'criar' | 'editar' | 'excluir';

export interface AuditLog {
  id: string;
  timestamp: string;       // ISO string
  userId: string;
  userName: string;
  module: AuditModule;
  action: AuditAction;
  recordId: string;
  description: string;     // ex: "Editou proposta 2026012 - Teste"
}

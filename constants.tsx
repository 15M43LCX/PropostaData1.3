
import { User, UserRole, Customer, Equipment, MasterData, Proposal, ProposalStatus, PricingModel } from './types';

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Administrador Sistema',
    role: UserRole.ADMIN,
    email: 'admin@empresa.com',
    title: 'Diretor Comercial',
    phone: '(11) 4004-0001',
    mobile: '(11) 99999-0001'
  },
  {
    id: 'u2',
    name: 'João Vendedor',
    role: UserRole.SELLER,
    email: 'joao@empresa.com',
    title: 'Consultor de Vendas',
    phone: '(11) 4004-0002',
    mobile: '(11) 99999-0002'
  },
  {
    id: 'u3',
    name: 'Junior Pacheco',
    role: UserRole.SELLER,
    email: 'junior@daticopy.com.br',
    title: 'Gerente de Contas',
    phone: '(21) 2582-2739',
    mobile: '(21) 98844-3317'
  }
];

export const INITIAL_MASTER_DATA: MasterData = {
  solutionTitles: [
    { id: '1', title: 'Gestão de Documentos Inteligente', description: 'Solução completa para digitalização e armazenamento.' },
    { id: '2', title: 'Outsourcing de Impressão', description: 'Multifuncional COR, formato até A3, contemplando suporte técnico, contrato de prestação de serviços e suprimentos.' }
  ],
  // Fixed syntax: added missing opening quote for the first item and removed duplicated entry
  paymentMethods: ['Boleto Bancário 10 dias após leitura', 'Cartão de Crédito', 'PIX Antecipado'],
  validities: ['7 dias', '15 dias', '30 dias'],
  deliveryTimes: ['Imediato', '5 dias úteis', '10 dias úteis'],
  slaTimes: ['24 horas úteis', '8 horas úteis', '48 horas úteis'],
  contractTerms: ['15 meses','12 meses', '24 meses', '36 meses', '48 meses', '60 meses'],
  commercialConditions: [
    { id: '1', condition: 'Pagamento em até 10x sem juros' },
    { id: '2', condition: 'Instalação inclusa' }
  ],
  salesGoal: 50000,
  layoutImages: {
    cover: '',
    intro: '',
    background: ''
  }
};

export const MOCK_EQUIPMENTS: Equipment[] = [
  {
    id: 'e1',
    type: 'Multifuncional PB',
    brand: 'Pantum',
    model: 'BM5100FDW',
    title: 'Equipamento Multifuncional PB, Marca Pantum, modelo BM5100FDW, 33ppm e capacidade mensal para até 100.000 páginas A4.',
    monthlyVolume: 10000,
    isColor: false,
    imageUrl: 'https://via.placeholder.com/400x300?text=Pantum+BM5100FDW',
    specs: 'A velocidade de impressão A4 é de 33 páginas por minuto, e suporta impressão duplex automática, que pode facilmente melhorar a eficiência do trabalho. Através de Wi-Fi de banda dupla (2.4G e 5G), conexão de toque NFC e outros métodos, a impressão sem fio pode ser facilmente realizada e o estilo de trabalho de escritório gratuito dos usuários na nova era pode ser apreciado. O driver pode ser instalado em uma etapa sem procedimento complexo, ajudando o usuário a desfrutar de operações sem preocupações.'
  },
  {
    id: 'e2',
    type: 'Multifuncional Color',
    brand: 'KONICA MINOLTA',
    model: 'BIZHUB C258 MULTIFUNCIONAL COLORIDA',
    title: 'Multifuncional colorida A3 Marca Konica Minolta, modelo Bizhub C258,25 ppm, capacidade mensal para até 80.000 páginas A3',
    monthlyVolume: 80000,
    isColor: true,
    imageUrl: 'https://via.placeholder.com/400x300?text=Konica+Minolta+Bizhub+C258',
    // Fixed multiline string using backticks (template literals)
    specs: `Multifuncional robusta: Impressão, cópia, digitalização e fax em um único equipamento, com suporte para volumes médios de escritório.
Qualidade profissional: Resolução de até 1200 x 1200 dpi, garantindo textos nítidos e imagens coloridas de alta definição.
Produtividade: Velocidade de até 25 páginas por minuto em cores e preto, com ciclo mensal de até 80.000 impressões. 
Conectividade moderna: Compatível com impressão móvel, Wi-Fi opcional e integração com sistemas em nuvem, otimizando fluxos de trabalho empresariais.`
  }
];

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    sellerId: 'u2',
    companyName: 'RIWA INCORPORAÇÕES',
    tradeName: '',
    contactName: 'SRA. JULIANA',
    phone: '',
    email: '',
    address: 'Rua Almirante Ari',
    number: '',
    neighborhood: '',
    city: '',
    state: ''
  },
  {
    id: 'c2',
    sellerId: 'u3',
    companyName: 'Daticopy',
    tradeName: '',
    contactName: 'SRA. Cristiane',
    phone: '',
    email: '',
    address: 'Rua Almirante Ari Parreira, 355',
    number: '',
    neighborhood: '',
    city: '',
    state: ''
  }
];

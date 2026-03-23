import { createClient } from '@supabase/supabase-js'

// No Vite, usamos import.meta.env para acessar variáveis .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Erro: Variáveis de ambiente do Supabase não encontradas. Verifique o painel da Vercel ou o arquivo .env')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

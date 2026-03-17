import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: Variáveis do Supabase não encontradas!")
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '')

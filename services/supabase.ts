import { createClient } from '@supabase/supabase-js'

// Estas são as suas credenciais que vi nas imagens anteriores
const supabaseUrl = 'https://zmbhuxvfreityqlimzlg.supabase.co'
const supabaseKey = 'sb_publishable_9xE2FLbRdpc7od9YuQwitQ_beiDGfhw'

export const supabase = createClient(supabaseUrl, supabaseKey)

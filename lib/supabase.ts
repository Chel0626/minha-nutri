import { createClient } from '@supabase/supabase-js';

// Validar se as variáveis de ambiente estão definidas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis de ambiente Supabase não encontradas. ' +
    'Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão definidas no arquivo .env.local'
  );
}

// Inicializar o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

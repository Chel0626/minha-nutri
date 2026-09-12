import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const termo = searchParams.get('busca');

  if (!termo) return NextResponse.json({ resultados: [] });

  const { data, error } = await supabase
    .from('alimentos')
    .select('*')
    .ilike('nome_exibicao', `%${termo}%`)
    .order('nome_exibicao', { ascending: true })
    .limit(15);

  if (error) {
    console.error("Erro na busca:", error);
    return NextResponse.json({ resultados: [] });
  }

  return NextResponse.json({ resultados: data });
}
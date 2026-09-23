import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const busca = searchParams.get('busca');

    if (!busca) {
      return NextResponse.json({ resultados: [] });
    }

    // Busca apenas na coluna que REALMENTE existe na sua tabela
    const { data, error } = await supabase
      .from('alimentos')
      .select('*')
      .ilike('nome_exibicao', `%${busca}%`)
      .limit(50);

    if (error) {
      console.error("[API Alimentos] Erro Supabase:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ resultados: data || [] });

  } catch (err: any) {
    console.error("[API Alimentos] Erro Interno:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
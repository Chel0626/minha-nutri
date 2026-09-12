import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import tacoData from '@/data/taco.json'; // Ajuste o caminho conforme configuramos antes

export async function GET() {
  try {
    const alimentosFormatados = tacoData.map((item: any) => ({
      id: String(item.id || Math.random().toString(36).substr(2, 9)),
      nome_exibicao: item.description || "",
      cho: Number(parseFloat(item.carbohydrate_g || "0").toFixed(1)),
      ptn: Number(parseFloat(item.protein_g || "0").toFixed(1)),
      lip: Number(parseFloat(item.lipid_g || "0").toFixed(1)),
      kcal: Number(parseFloat(item.energy_kcal || "0").toFixed(1))
    }));

    // O Supabase permite inserir arrays gigantes de uma vez só
    const { error } = await supabase.from('alimentos').insert(alimentosFormatados);

    if (error) throw error;

    return NextResponse.json({ sucesso: true, mensagem: `${alimentosFormatados.length} alimentos importados!` });
  } catch (err) {
    return NextResponse.json({ erro: err });
  }
}
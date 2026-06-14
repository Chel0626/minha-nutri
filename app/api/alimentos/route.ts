import { NextResponse } from 'next/server';
// Ajuste o caminho abaixo se a sua pasta data não estiver na raiz do src
import tacoData from '@/data/taco.json'; 

export async function GET(request: Request) {
  // Pega o termo de busca da URL (ex: /api/alimentos?busca=frango)
  const { searchParams } = new URL(request.url);
  const termo = searchParams.get('busca');

  if (!termo) {
    return NextResponse.json({ resultados: [] });
  }

  const termoMinusculo = termo.toLowerCase();
  const resultados = [];

  // Faz a busca direto na memória (Instantâneo)
  for (const item of tacoData as any[]) {
    const nomeBusca = item.description || "";

    if (nomeBusca.toLowerCase().includes(termoMinusculo)) {
      const cho = parseFloat(item.carbohydrate_g) || 0;
      const ptn = parseFloat(item.protein_g) || 0;
      const lip = parseFloat(item.lipid_g) || 0;
      const kcal = parseFloat(item.energy_kcal) || 0;

      resultados.push({
        id: String(item.id || resultados.length),
        nome_exibicao: nomeBusca,
        cho: Number(cho.toFixed(1)),
        ptn: Number(ptn.toFixed(1)),
        lip: Number(lip.toFixed(1)),
        kcal: Number(kcal.toFixed(1))
      });

      // Limita a 15 resultados para o dropdown não ficar gigante (igual no Python)
      if (resultados.length >= 15) {
        break;
      }
    }
  }

  return NextResponse.json({ resultados });
}
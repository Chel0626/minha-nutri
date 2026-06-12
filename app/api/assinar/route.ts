import { NextResponse } from 'next/server';
import signer from 'node-signpdf';
import { plainAddPlaceholder } from 'node-signpdf/dist/helpers';

// No App Router do Next.js, a função TEM que se chamar POST (em maiúsculas)
export async function POST(request: Request) {
  try {
    const { pdfBase64, certBase64, password } = await request.json();

    if (!pdfBase64 || !certBase64 || !password) {
      return NextResponse.json(
        { error: 'Faltam dados obrigatórios (PDF, Certificado ou Senha)' }, 
        { status: 400 }
      );
    }

    // Transforma as strings Base64 em Buffers (formato que a criptografia entende)
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const certBuffer = Buffer.from(certBase64, 'base64');

    // 1. Prepara o PDF criando um "espaço vazio" invisível para a assinatura
    const pdfWithPlaceholder = plainAddPlaceholder({
      pdfBuffer: pdfBuffer,
      reason: 'Assinatura Digital - Prescrição Dietética',
      signatureLength: 16128,
    });

    // 2. Aplica a assinatura usando o certificado e a senha da Carolina
    const signedPdf = signer.sign(pdfWithPlaceholder, certBuffer, {
      passphrase: password,
    });

    // Devolve o PDF assinado em formato Base64 para a tela baixar
    return NextResponse.json({ signedPdf: signedPdf.toString('base64') });

  } catch (error: any) {
    console.error('Erro na assinatura:', error);
    
    if (error.message && (error.message.includes('mac verify failure') || error.message.includes('password'))) {
      return NextResponse.json({ error: 'Senha do certificado incorreta.' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Falha ao processar a assinatura digital.' }, { status: 500 });
  }
}
import { NextApiRequest, NextApiResponse } from 'next';
import signer from 'node-signpdf';
import { plainAddPlaceholder } from 'node-signpdf/dist/helpers';

// A MÁGICA PARA RESOLVER O ERRO 413 ESTÁ AQUI:
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb', // Aumenta o limite do servidor para 15 Megabytes
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { pdfBase64, certBase64, password } = req.body;

    if (!pdfBase64 || !certBase64 || !password) {
      return res.status(400).json({ error: 'Faltam dados obrigatórios' });
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const certBuffer = Buffer.from(certBase64, 'base64');

    const pdfWithPlaceholder = plainAddPlaceholder({
      pdfBuffer: pdfBuffer,
      reason: 'Assinatura Digital - Prescrição Dietética',
      signatureLength: 16128,
    });

    const signedPdf = signer.sign(pdfWithPlaceholder, certBuffer, {
      passphrase: password,
    });

    return res.status(200).json({ signedPdf: signedPdf.toString('base64') });

  } catch (error: any) {
    console.error('Erro na assinatura:', error);
    if (error.message && (error.message.includes('mac verify failure') || error.message.includes('password'))) {
      return res.status(401).json({ error: 'Senha do certificado incorreta.' });
    }
    return res.status(500).json({ error: 'Falha ao processar a assinatura digital.' });
  }
}
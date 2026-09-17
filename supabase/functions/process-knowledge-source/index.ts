import { json, preflight, currentUser, admin } from '../_shared/utils.ts';

// ============================================================================
// Processamento de fontes de conhecimento do agente (ao salvar — admin)
// Recebe { type, url } e retorna { extracted_content, metadata }.
// Limite de ~50.000 caracteres por fonte.
// ============================================================================

const MAX_CHARS = 50000;

const truncate = (text: string) =>
  text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + '\n[...truncado]' : text;

// --- Helpers ---

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/v\/([A-Za-z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// --- Site: fetch HTML + extrai texto principal ---

async function processSite(url: string): Promise<{ extracted_content: string; metadata: any }> {
  const res = await fetchWithTimeout(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TheotokosBot/1.0)' }
  });
  if (!res.ok) throw new Error(`Falha ao buscar site (HTTP ${res.status})`);
  const html = await res.text();

  // Remove scripts, estilos, comentários e tags
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '');

  // Extrai título
  const titleMatch = text.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Extrai meta description
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const description = descMatch ? descMatch[1].trim() : '';

  // Converte HTML para texto
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&atilde;/g, 'ã')
    .replace(/&otilde;/g, 'õ');

  // Limpa whitespace excessivo
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const cleanText = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  if (!cleanText) throw new Error('Não foi possível extrair texto da página.');

  const content = `Título: ${title}\n${description ? `Descrição: ${description}\n` : ''}\nConteúdo:\n${cleanText}`;
  return { extracted_content: truncate(content), metadata: { title, description } };
}

// --- YouTube: extrai ID + busca transcrição ---

async function processYouTube(url: string): Promise<{ extracted_content: string; metadata: any }> {
  const videoId = extractYouTubeId(url);
  if (!videoId) throw new Error('URL do YouTube inválida. Use o formato https://www.youtube.com/watch?v=...');

  // Busca metadados via oEmbed (sem chave)
  let metadata: any = { video_id: videoId };
  try {
    const oembedRes = await fetchWithTimeout(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      metadata.title = oembed.title;
      metadata.author = oembed.author_name;
      metadata.thumbnail = oembed.thumbnail_url;
    }
  } catch { /* ignora */ }

  // Busca transcrição via timedtext (legendas automáticas)
  let transcript = '';
  try {
    // Tenta buscar a lista de legendas disponíveis
    const listRes = await fetchWithTimeout(`https://www.youtube.com/api/timedtext?v=${videoId}&type=list`);
    if (listRes.ok) {
      const listXml = await listRes.text();
      // Extrai primeiro track com lang code pt ou en
      const trackMatch = listXml.match(/<track[^>]*lang_code=["']([^"']+)["'][^>]*kind=["']asr["']/i)
        || listXml.match(/<track[^>]*lang_code=["']([^"']+)["']/i);
      if (trackMatch) {
        const langCode = trackMatch[1];
        const captionRes = await fetchWithTimeout(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=${langCode}&kind=asr`);
        if (captionRes.ok) {
          const captionXml = await captionRes.text();
          // Extrai texto das tags <text>
          const texts = [...captionXml.matchAll(/<text[^>]*>([^<]*)<\/text>/gi)].map(m =>
            m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
          );
          transcript = texts.join(' ');
        }
      }
    }
  } catch { /* ignora — pode não ter transcrição */ }

  if (!transcript) {
    // Sem transcrição: usa metadados
    if (!metadata.title) throw new Error('Não foi possível extrair transcrição nem metadados do vídeo.');
    return {
      extracted_content: truncate(`Vídeo do YouTube: ${metadata.title}\nCanal: ${metadata.author || 'N/A'}\n\n[Transcrição não disponível para este vídeo]`),
      metadata
    };
  }

  const content = `Vídeo do YouTube: ${metadata.title || 'Sem título'}\nCanal: ${metadata.author || 'N/A'}\n\nTranscrição:\n${transcript}`;
  return { extracted_content: truncate(content), metadata };
}

// --- Instagram: fetch da página + extrai legenda ---

async function processInstagram(url: string): Promise<{ extracted_content: string; metadata: any }> {
  const cleanUrl = url.split('?')[0].replace(/\/$/, '');
  const metadata: any = { url: cleanUrl };

  // Tenta oEmbed (Facebook/Instagram) — sem chave, pode falhar
  try {
    const oembedRes = await fetchWithTimeout(
      `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(cleanUrl)}&fields=caption,author_name,thumbnail_url&access_token=${Deno.env.get('INSTAGRAM_APP_TOKEN') || ''}`,
      {}, 10000
    );
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      metadata.caption = oembed.caption;
      metadata.author = oembed.author_name;
      metadata.thumbnail = oembed.thumbnail_url;
      if (oembed.caption) {
        return { extracted_content: truncate(`Post do Instagram de ${oembed.author_name || 'N/A'}\n\nLegenda:\n${oembed.caption}`), metadata };
      }
    }
  } catch { /* ignora */ }

  // Fallback: scraping da página (meta tags)
  try {
    const res = await fetchWithTimeout(cleanUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TheotokosBot/1.0)' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const descMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    const caption = descMatch ? descMatch[1].trim() : '';
    const title = titleMatch ? titleMatch[1].trim() : '';

    if (!caption) throw new Error('Não foi possível extrair a legenda do post (pode ser privado).');

    metadata.title = title;
    return { extracted_content: truncate(`Post do Instagram\n${title ? `Título: ${title}\n` : ''}Legenda:\n${caption}`), metadata };
  } catch (e) {
    throw new Error('Não foi possível acessar o post do Instagram. Verifique se a URL é pública.');
  }
}

// --- Áudio: download + transcrição via OpenAI Whisper ---

async function processAudio(url: string): Promise<{ extracted_content: string; metadata: any }> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada para transcrição de áudio.');

  // Baixa o arquivo de áudio
  const audioRes = await fetchWithTimeout(url, {}, 60000);
  if (!audioRes.ok) throw new Error(`Falha ao baixar áudio (HTTP ${audioRes.status})`);
  const audioBlob = await audioRes.blob();

  // Verifica tamanho (máx 25MB no Whisper)
  const sizeMB = audioBlob.size / (1024 * 1024);
  if (sizeMB > 25) throw new Error(`Áudio muito grande (${sizeMB.toFixed(1)}MB). Máximo: 25MB.`);

  // Determina extensão
  const contentType = audioRes.headers.get('content-type') || 'audio/mpeg';
  const ext = contentType.includes('mp4') ? 'mp4' : contentType.includes('wav') ? 'wav' : contentType.includes('ogg') ? 'ogg' : 'mp3';

  const formData = new FormData();
  formData.append('file', audioBlob, `audio.${ext}`);
  formData.append('model', 'whisper-1');
  formData.append('language', 'pt');

  const whisperRes = await fetchWithTimeout('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData
  }, 120000);

  if (!whisperRes.ok) {
    const err = await whisperRes.json().catch(() => ({}));
    throw new Error(`Falha na transcrição: ${err.error?.message || whisperRes.status}`);
  }

  const data = await whisperRes.json();
  const transcript = data.text || '';
  if (!transcript) throw new Error('Transcrição retornou texto vazio.');

  return { extracted_content: truncate(`Transcrição de áudio:\n${transcript}`), metadata: { duration_mb: sizeMB.toFixed(1) } };
}

// --- Handler ---

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user || user.role !== 'admin') return json({ error: 'Forbidden' }, 403);

    const { type, url } = await req.json();
    if (!type || !url) return json({ error: 'type e url são obrigatórios' }, 400);

    let result: { extracted_content: string; metadata: any };
    switch (type) {
      case 'site': result = await processSite(url); break;
      case 'youtube': result = await processYouTube(url); break;
      case 'instagram': result = await processInstagram(url); break;
      case 'audio': result = await processAudio(url); break;
      default: return json({ error: 'Tipo inválido. Use: site, youtube, instagram ou audio.' }, 400);
    }

    return json({ ok: true, extracted_content: result.extracted_content, metadata: result.metadata });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
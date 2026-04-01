# Video Stealth Processor

Ferramenta avançada para processamento de vídeos com foco em privacidade, bypass de algoritmos sociais e proteção de marca.

## Detalhes Técnicos (O que o bot faz)

Para quem deseja entender a lógica por trás do processamento:

1. **Alteração de Hash (Hash Alteration)**:
   - Aplica um zoom randômico entre 1% e 3% em cada vídeo.
   - Isso altera cada pixel do arquivo, gerando uma assinatura digital (hash) completamente nova, impedindo que plataformas identifiquem o vídeo como um "repost" de um arquivo já existente.

2. **Mudança de Duração (Duration Shift)**:
   - Adiciona um padding de 0.5 segundos de tela preta no início e no fim do vídeo.
   - Isso altera o tempo total do arquivo, outra métrica usada por algoritmos para identificar conteúdo duplicado.

3. **Limpeza de Metadados (Metadata Scrub)**:
   - Remove todas as tags EXIF, XMP e IPTC.
   - Elimina rastros de GPS, modelo da câmera, software de edição e data de criação original.

4. **Marca d'água Dinâmica (Motion Watermark)**:
   - A marca d'água não fica estática. Ela muda de posição (canto) periodicamente.
   - Isso dificulta a remoção por ferramentas de IA que buscam padrões fixos em vídeos.

5. **Re-encoding H.264**:
   - O vídeo é re-codificado usando o codec libx264 com perfil High 4.0, garantindo máxima compatibilidade com Instagram, TikTok e YouTube Shorts.

## Como rodar localmente

1. Instale as dependências: `npm install`
2. Inicie o servidor: `npm run dev`
3. Acesse `http://localhost:3000`

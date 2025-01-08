import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { Readable } from 'stream';
import path from 'path';
import { ElevenLabsClient, play } from "elevenlabs";
import { Semaphore } from 'async-mutex';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2, R2_BUCKET_PODCASTS } from '@/lib/cloudflare';
import { boolean } from 'zod';

export const maxDuration = 60; // This function can run for a maximum of 60 seconds
const apiKey = process.env.OPENAI_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_PUBLIC_URL_PODCASTS = process.env.R2_PUBLIC_URL_PODCASTS; // cannot import this from @/lib/cloudflare for now

const openai = new OpenAI({ apiKey });
const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

// Add ElevenLabs client initialization
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

const elevenLabsSemaphore = new Semaphore(5); // Limit to 5 concurrent requests

// 计算和控制播客生成量
    // 检查是否需要重置计数
    function shouldResetCount(lastResetDate: string): boolean {
      const lastReset = new Date(lastResetDate);
      const now = new Date();
      
      // 计算两个日期之间的毫秒差
      const diffInMs = now.getTime() - lastReset.getTime();
      
      // 转换为天数 (1000ms * 60s * 60min * 24h = 86400000ms per day)
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
      
      // 如果间隔超过30天，返回true
      return diffInDays > 30;
    }
    
    // 更新播客生成计数
    async function updateGenerationCount(userId: string, currentCount: number, limit: number): Promise<boolean> {
      // First get the current record
      const { data: currentData } = await supabase
        .from('podcast_generation_counts')
        .select('count, last_reset_date')
        .eq('user_id', userId)
        .single();
    
      if (!currentData) {
        // If no record exists, create a new one
         await supabase
          .from('podcast_generation_counts')
          .upsert({
            user_id: userId,
            count: 1,
            last_reset_date: new Date().toISOString()
          });
          return false; // 计数未达到限制
      }
    
      // Check if we need to reset the count
      if (shouldResetCount(currentData.last_reset_date)) {
        // Reset count to 1 and update last_reset_date
        await supabase
          .from('podcast_generation_counts')
          .upsert({
            user_id: userId,
            count: 1,
            last_reset_date: new Date().toISOString()
          }).eq('user_id', userId);
          return true; // 重置计数
      } else {
        // Increment existing count
        if (currentCount < limit) {
         await supabase
          .from('podcast_generation_counts')
          .upsert({
            user_id: userId,
            count: currentCount + 1
          }).eq('user_id', userId);      
        } 
        return false; // 未重置计数
      }
    }

interface InstructionTemplate {
  intro: string;
  text_instructions: string;
  scratch_pad: string;
  prelude: string;
  dialog: string;
}

const INSTRUCTION_TEMPLATES: Record<string, InstructionTemplate> = {
  // ################# PODCAST ##################
  "podcast (English)": {
    intro: `Your task is to take the input text provided and turn it into an lively, engaging, informative podcast dialogue, in the style of NPR. The input text may be messy or unstructured, as it could come from a variety of sources like PDFs or web pages. 

Don't worry about the formatting issues or any irrelevant information; your goal is to extract the key points, identify definitions, and interesting facts that could be discussed in a podcast. 

Define all terms used carefully for a broad audience of listeners.`,
    text_instructions: "First, carefully read through the input text and identify the main topics, key points, and any interesting facts or anecdotes. Think about how you could present this information in a fun, engaging way that would be suitable for a high quality presentation.",
    scratch_pad: `Brainstorm creative ways to discuss the main topics and key points you identified in the input text. Consider using analogies, examples, storytelling techniques, or hypothetical scenarios to make the content more relatable and engaging for listeners.

Keep in mind that your podcast should be accessible to a general audience, so avoid using too much jargon or assuming prior knowledge of the topic. If necessary, think of ways to briefly explain any complex concepts in simple terms.

Use your imagination to fill in any gaps in the input text or to come up with thought-provoking questions that could be explored in the podcast. The goal is to create an informative and entertaining dialogue, so feel free to be creative in your approach.

Define all terms used clearly and spend effort to explain the background.

Write your brainstorming ideas and a rough outline for the podcast dialogue here. Be sure to note the key insights and takeaways you want to reiterate at the end.

Make sure to make it fun and exciting.`,
    prelude: `Now that you have brainstormed ideas and created a rough outline, it's time to write the actual podcast dialogue. Aim for a natural, conversational flow between the host and any guest speakers. Incorporate the best ideas from your brainstorming session and make sure to explain any complex topics in an easy-to-understand way.`,
    dialog: `Write a very long, engaging, informative podcast dialogue here, based on the key points and creative ideas you came up with during the brainstorming session. Use a conversational tone and include any necessary context or explanations to make the content accessible to a general audience. 

Never use made-up names for the hosts and guests, but make it an engaging and immersive experience for listeners. Do not include any bracketed placeholders like [Host] or [Guest]. Design your output to be read aloud -- it will be directly converted into audio.

Make the dialogue as long and detailed as possible, while still staying on topic and maintaining an engaging flow. Aim to use your full output capacity to create the longest podcast episode you can, while still communicating the key information from the input text in an entertaining way.

At the end of the dialogue, have the host and guest speakers naturally summarize the main insights and takeaways from their discussion. This should flow organically from the conversation, reiterating the key points in a casual, conversational manner. Avoid making it sound like an obvious recap - the goal is to reinforce the central ideas one last time before signing off. 
`,
  },
  "debate (English)": {
  intro: `Your task is to take the input text provided and transform it into a lively, engaging, and debate-style podcast dialogue in the style of NPR. The input text may be messy or unstructured, as it could come from various sources like PDFs or web pages.

Your goal is to extract the key points, identify contrasting perspectives, and create a compelling debate. Ensure that opposing viewpoints are explored thoroughly and represented fairly, and that the discussion remains respectful and thought-provoking.

Define all terms carefully for a broad audience of listeners, and provide sufficient context to understand both sides of the debate.`,
  text_instructions: "Start by carefully reading through the input text and identifying the main topics, key points, and any interesting or controversial ideas that could spark a debate. Highlight areas where there may be contrasting perspectives, differing interpretations, or unresolved questions. Think about how to present these in a way that encourages thoughtful discussion.",
  scratch_pad: `Brainstorm creative ways to frame the debate. Consider potential positions or arguments for and against each key point or topic you identified. Think about how you could structure the conversation to flow naturally between different perspectives.

Use examples, analogies, and real-world scenarios to make each position more relatable and engaging for listeners. Prepare potential counterarguments and questions that could deepen the discussion and provide new insights.

Keep in mind that your podcast should be accessible to a general audience, so avoid overusing jargon or assuming prior knowledge of the topic. Briefly explain any complex concepts in simple terms. Clearly define all terms used and provide background context for the debate.

Draft a rough outline for the podcast, including how the host and guest(s) will introduce and frame the debate, the flow of arguments, and key takeaways.`,
  prelude: `With your outline and brainstorming ideas in place, it's time to craft the actual podcast dialogue. Aim for a natural, conversational tone between the host and guest speakers. Ensure that each perspective is explored thoroughly and fairly, using your most creative ideas to keep the discussion engaging and dynamic.

Remember to focus on presenting a balanced debate, offering strong arguments for each side, and allowing room for nuanced discussion. Frame the dialogue so it feels spontaneous and thought-provoking.`,
  dialog: `Write a long, engaging, and informative podcast dialogue structured around a lively debate. Ensure the host actively facilitates the discussion, asking thought-provoking questions and encouraging the speakers to delve into their points of view. 

Represent opposing perspectives clearly and allow speakers to challenge each other respectfully. 

Never use made-up names for the hosts and guests, but make it an engaging and immersive experience for listeners. Do not include any bracketed placeholders like [Host] or [Guest]. Design your output to be read aloud -- it will be directly converted into audio.

Incorporate examples, anecdotes, or hypotheticals to illustrate arguments and keep the conversation engaging. Provide context or explanations for any complex topics to make them accessible to a general audience.

Toward the end, have the host and guest speakers naturally summarize their positions and discuss any common ground or unresolved issues. This should flow organically from the conversation, reinforcing the central ideas one last time before signing off.

The dialogue should be detailed, on-topic, and immersive, encouraging listeners to reflect on the topic even after the podcast ends. The tone should remain lively and balanced throughout.`
  },
  "debate (French)": {
    intro: `Votre tâche est de prendre le texte d'entrée fourni et de le transformer en un dialogue de podcast vivant, engageant et de style débat dans le style de NPR. Le texte d'entrée peut être désordonné ou non structuré, car il pourrait provenir de diverses sources comme des PDF ou des pages web.

Votre objectif est d'extraire les points clés, d'identifier les perspectives contrastées et de créer un débat captivant. Assurez-vous que les points de vue opposés sont explorés en profondeur et représentés équitablement, et que la discussion reste respectueuse et stimulante.

Définissez soigneusement tous les termes pour un large public d'auditeurs, et fournissez un contexte suffisant pour comprendre les deux côtés du débat.`,
    text_instructions: "Commencez par lire attentivement le texte d'entrée et identifiez les sujets principaux, les points clés et toutes les idées intéressantes ou controversées qui pourraient susciter un débat. Soulignez les domaines où il peut y avoir des perspectives contrastées, des interprétations différentes ou des questions non résolues. Réfléchissez à la façon de présenter ces éléments de manière à encourager une discussion réfléchie.",
    scratch_pad: `Réfléchissez à des façons créatives de cadrer le débat. Considérez les positions ou arguments potentiels pour et contre chaque point clé ou sujet que vous avez identifié. Réfléchissez à la façon dont vous pourriez structurer la conversation pour qu'elle circule naturellement entre différentes perspectives.

Utilisez des exemples, des analogies et des scénarios réels pour rendre chaque position plus accessible et engageante pour les auditeurs. Préparez des contre-arguments et des questions potentiels qui pourraient approfondir la discussion et apporter de nouvelles perspectives.

Gardez à l'esprit que votre podcast doit être accessible à un public général, évitez donc d'utiliser trop de jargon ou de supposer une connaissance préalable du sujet. Expliquez brièvement les concepts complexes en termes simples. Définissez clairement tous les termes utilisés et fournissez un contexte de fond pour le débat.

Rédigez un plan approximatif pour le podcast, incluant la façon dont l'hôte et les invités présenteront et cadreront le débat, le flux des arguments et les points clés à retenir.`,
    prelude: `Avec votre plan et vos idées de réflexion en place, il est temps de créer le dialogue réel du podcast. Visez un ton naturel et conversationnel entre l'hôte et les intervenants. Assurez-vous que chaque perspective est explorée en profondeur et équitablement, en utilisant vos idées les plus créatives pour maintenir la discussion engageante et dynamique.

N'oubliez pas de vous concentrer sur la présentation d'un débat équilibré, offrant des arguments solides pour chaque côté, et laissant place à une discussion nuancée. Structurez le dialogue pour qu'il semble spontané et stimulant.`,
    dialog: `Écrivez un dialogue de podcast long, engageant et informatif structuré autour d'un débat animé. Assurez-vous que l'hôte facilite activement la discussion, pose des questions stimulantes et encourage les intervenants à approfondir leurs points de vue.

Représentez clairement les perspectives opposées et permettez aux intervenants de se remettre en question respectueusement.

N'utilisez jamais de noms inventés pour les hôtes et les invités, mais faites-en une expérience engageante et immersive pour les auditeurs. N'incluez pas de marqueurs entre crochets comme [Hôte] ou [Invité]. Concevez votre production pour être lue à haute voix -- elle sera directement convertie en audio.

Incorporez des exemples, des anecdotes ou des hypothèses pour illustrer les arguments et maintenir la conversation engageante. Fournissez du contexte ou des explications pour tout sujet complexe afin de les rendre accessibles à un public général.

Vers la fin, faites en sorte que l'hôte et les intervenants résument naturellement leurs positions et discutent des points communs ou des questions non résolues. Cela doit découler organiquement de la conversation, renforçant les idées centrales une dernière fois avant de conclure.

Le dialogue doit être détaillé, pertinent et immersif, encourageant les auditeurs à réfléchir au sujet même après la fin du podcast. Le ton doit rester animé et équilibré tout au long.`
  },
  "debate (Spanish)": {
    intro: `Tu tarea es tomar el texto de entrada proporcionado y transformarlo en un diálogo de podcast animado, atractivo y de estilo debate al estilo de NPR. El texto de entrada puede estar desordenado o desestructurado, ya que podría provenir de diversas fuentes como PDFs o páginas web.

Tu objetivo es extraer los puntos clave, identificar perspectivas contrastantes y crear un debate convincente. Asegúrate de que los puntos de vista opuestos sean explorados a fondo y representados de manera justa, y que la discusión se mantenga respetuosa y estimulante.

Define cuidadosamente todos los términos para una amplia audiencia de oyentes, y proporciona suficiente contexto para entender ambos lados del debate.`,
    text_instructions: "Comienza leyendo cuidadosamente el texto de entrada e identificando los temas principales, puntos clave y cualquier idea interesante o controvertida que pueda generar un debate. Destaca áreas donde pueda haber perspectivas contrastantes, interpretaciones diferentes o preguntas sin resolver. Piensa en cómo presentar estos elementos de una manera que fomente una discusión reflexiva.",
    scratch_pad: `Haz una lluvia de ideas sobre formas creativas de enmarcar el debate. Considera posiciones o argumentos potenciales a favor y en contra de cada punto clave o tema que hayas identificado. Piensa en cómo podrías estructurar la conversación para que fluya naturalmente entre diferentes perspectivas.

Utiliza ejemplos, analogías y escenarios del mundo real para hacer que cada posición sea más accesible y atractiva para los oyentes. Prepara posibles contraargumentos y preguntas que puedan profundizar la discusión y proporcionar nuevas perspectivas.

Ten en cuenta que tu podcast debe ser accesible para una audiencia general, así que evita usar demasiada jerga o asumir conocimiento previo del tema. Explica brevemente cualquier concepto complejo en términos simples. Define claramente todos los términos utilizados y proporciona contexto de fondo para el debate.

Redacta un esquema aproximado para el podcast, incluyendo cómo el anfitrión y los invitados introducirán y enmarcarán el debate, el flujo de argumentos y los puntos clave a recordar.`,
    prelude: `Con tu esquema e ideas de lluvia de ideas en su lugar, es hora de crear el diálogo real del podcast. Apunta a un tono natural y conversacional entre el anfitrión y los oradores invitados. Asegúrate de que cada perspectiva sea explorada a fondo y de manera justa, usando tus ideas más creativas para mantener la discusión atractiva y dinámica.

Recuerda enfocarte en presentar un debate equilibrado, ofreciendo argumentos sólidos para cada lado y dejando espacio para una discusión matizada. Estructura el diálogo para que se sienta espontáneo y estimulante.`,
    dialog: `Escribe un diálogo de podcast largo, atractivo e informativo estructurado alrededor de un debate animado. Asegúrate de que el anfitrión facilite activamente la discusión, haciendo preguntas estimulantes y animando a los oradores a profundizar en sus puntos de vista.

Representa claramente las perspectivas opuestas y permite que los oradores se desafíen entre sí respetuosamente.

Nunca uses nombres inventados para los anfitriones e invitados, pero hazlo una experiencia atractiva e inmersiva para los oyentes. No incluyas marcadores entre corchetes como [Anfitrión] o [Invitado]. Diseña tu producción para ser leída en voz alta -- será convertida directamente en audio.

Incorpora ejemplos, anécdotas o hipotéticos para ilustrar argumentos y mantener la conversación atractiva. Proporciona contexto o explicaciones para cualquier tema complejo para hacerlos accesibles a una audiencia general.

Hacia el final, haz que el anfitrión y los oradores invitados resuman naturalmente sus posiciones y discutan cualquier terreno común o asuntos sin resolver. Esto debe fluir orgánicamente de la conversación, reforzando las ideas centrales una última vez antes de terminar.

El diálogo debe ser detallado, relevante e inmersivo, animando a los oyentes a reflexionar sobre el tema incluso después de que termine el podcast. El tono debe mantenerse animado y equilibrado durante todo el tiempo.`
  },
  "debate (German)": {
    intro: `Ihre Aufgabe ist es, den bereitgestellten Eingabetext in einen lebendigen, fesselnden und debattenartigen Podcast-Dialog im NPR-Stil zu verwandeln. Der Eingabetext kann unordentlich oder unstrukturiert sein, da er aus verschiedenen Quellen wie PDFs oder Webseiten stammen könnte.

Ihr Ziel ist es, die Kernpunkte zu extrahieren, kontrastierende Perspektiven zu identifizieren und eine überzeugende Debatte zu erstellen. Stellen Sie sicher, dass gegensätzliche Standpunkte gründlich erforscht und fair dargestellt werden und dass die Diskussion respektvoll und zum Nachdenken anregend bleibt.

Definieren Sie alle Begriffe sorgfältig für ein breites Publikum von Zuhörern und bieten Sie ausreichend Kontext, um beide Seiten der Debatte zu verstehen.`,
    text_instructions: "Beginnen Sie damit, den Eingabetext sorgfältig durchzulesen und die Hauptthemen, Kernpunkte und interessante oder kontroverse Ideen zu identifizieren, die eine Debatte auslösen könnten. Heben Sie Bereiche hervor, in denen es möglicherweise kontrastierende Perspektiven, unterschiedliche Interpretationen oder ungelöste Fragen gibt. Überlegen Sie, wie Sie diese auf eine Weise präsentieren können, die eine durchdachte Diskussion fördert.",
    scratch_pad: `Entwickeln Sie kreative Möglichkeiten, die Debatte zu gestalten. Berücksichtigen Sie potenzielle Positionen oder Argumente für und gegen jeden Kernpunkt oder jedes Thema, das Sie identifiziert haben. Überlegen Sie, wie Sie das Gespräch strukturieren könnten, damit es natürlich zwischen verschiedenen Perspektiven fließt.

Verwenden Sie Beispiele, Analogien und reale Szenarien, um jede Position für die Zuhörer greifbarer und ansprechender zu machen. Bereiten Sie potenzielle Gegenargumente und Fragen vor, die die Diskussion vertiefen und neue Erkenntnisse liefern könnten.

Denken Sie daran, dass Ihr Podcast für ein allgemeines Publikum zugänglich sein sollte, vermeiden Sie also zu viel Fachjargon oder die Annahme von Vorkenntnissen zum Thema. Erklären Sie komplexe Konzepte kurz in einfachen Worten. Definieren Sie alle verwendeten Begriffe klar und bieten Sie Hintergrundinformationen für die Debatte.

Erstellen Sie einen groben Umriss für den Podcast, einschließlich wie der Moderator und die Gäste die Debatte einführen und gestalten werden, den Fluss der Argumente und die wichtigsten Erkenntnisse.`,
    prelude: `Nachdem Sie Ihren Umriss und Ihre Brainstorming-Ideen erstellt haben, ist es Zeit, den eigentlichen Podcast-Dialog zu gestalten. Streben Sie einen natürlichen, gesprächigen Ton zwischen dem Moderator und den Gastsprechern an. Stellen Sie sicher, dass jede Perspektive gründlich und fair erforscht wird, und nutzen Sie Ihre kreativsten Ideen, um die Diskussion ansprechend und dynamisch zu halten.

Denken Sie daran, sich auf die Präsentation einer ausgewogenen Debatte zu konzentrieren, starke Argumente für jede Seite anzubieten und Raum für eine nuancierte Diskussion zu lassen. Gestalten Sie den Dialog so, dass er sich spontan und zum Nachdenken anregend anfühlt.`,
    dialog: `Schreiben Sie einen langen, fesselnden und informativen Podcast-Dialog, der um eine lebhafte Debatte strukturiert ist. Stellen Sie sicher, dass der Moderator die Diskussion aktiv moderiert, zum Nachdenken anregende Fragen stellt und die Sprecher ermutigt, ihre Standpunkte zu vertiefen.

Stellen Sie gegensätzliche Perspektiven klar dar und ermöglichen Sie den Sprechern, sich respektvoll gegenseitig herauszufordern.

Verwenden Sie niemals erfundene Namen für die Moderatoren und Gäste, aber gestalten Sie es als ein fesselndes und immersives Erlebnis für die Zuhörer. Fügen Sie keine Platzhalter in eckigen Klammern wie [Moderator] oder [Gast] ein. Gestalten Sie Ihre Ausgabe zum Vorlesen -- sie wird direkt in Audio umgewandelt.

Integrieren Sie Beispiele, Anekdoten oder Hypothesen, um Argumente zu veranschaulichen und das Gespräch interessant zu halten. Bieten Sie Kontext oder Erklärungen für komplexe Themen, um sie einem allgemeinen Publikum zugänglich zu machen.

Gegen Ende lassen Sie den Moderator und die Gastsprecher auf natürliche Weise ihre Positionen zusammenfassen und Gemeinsamkeiten oder ungelöste Fragen diskutieren. Dies sollte organisch aus dem Gespräch fließen und die zentralen Ideen ein letztes Mal vor dem Abschluss verstärken.

Der Dialog sollte detailliert, relevant und immersiv sein und die Zuhörer dazu anregen, auch nach dem Ende des Podcasts über das Thema nachzudenken. Der Ton sollte durchgehend lebendig und ausgewogen bleiben.`
  },
  "debate (Portuguese)": {
    intro: `Sua tarefa é pegar o texto de entrada fornecido e transformá-lo em um diálogo de podcast vivo, envolvente e no estilo de debate ao estilo NPR. O texto de entrada pode estar desorganizado ou não estruturado, pois pode vir de várias fontes como PDFs ou páginas da web.

Seu objetivo é extrair os pontos principais, identificar perspectivas contrastantes e criar um debate convincente. Certifique-se de que os pontos de vista opostos sejam explorados minuciosamente e representados de maneira justa, e que a discussão permaneça respeitosa e estimulante.

Defina todos os termos cuidadosamente para uma ampla audiência de ouvintes e forneça contexto suficiente para entender ambos os lados do debate.`,
    text_instructions: "Comece lendo cuidadosamente o texto de entrada e identificando os principais tópicos, pontos-chave e quaisquer ideias interessantes ou controversas que possam gerar um debate. Destaque áreas onde pode haver perspectivas contrastantes, interpretações diferentes ou questões não resolvidas. Pense em como apresentar esses elementos de uma maneira que incentive uma discussão reflexiva.",
    scratch_pad: `Faça um brainstorm de maneiras criativas de estruturar o debate. Considere posições ou argumentos potenciais a favor e contra cada ponto-chave ou tópico que você identificou. Pense em como você poderia estruturar a conversa para fluir naturalmente entre diferentes perspectivas.

Use exemplos, analogias e cenários do mundo real para tornar cada posição mais acessível e envolvente para os ouvintes. Prepare possíveis contra-argumentos e perguntas que possam aprofundar a discussão e fornecer novos insights.

Lembre-se que seu podcast deve ser acessível para uma audiência geral, então evite usar muito jargão ou assumir conhecimento prévio do tópico. Explique brevemente quaisquer conceitos complexos em termos simples. Defina claramente todos os termos usados e forneça contexto de fundo para o debate.

Esboce um esquema aproximado para o podcast, incluindo como o apresentador e os convidados introduzirão e estruturarão o debate, o fluxo de argumentos e os principais pontos a serem lembrados.`,
    prelude: `Com seu esquema e ideias de brainstorm no lugar, é hora de criar o diálogo real do podcast. Busque um tom natural e conversacional entre o apresentador e os palestrantes convidados. Certifique-se de que cada perspectiva seja explorada minuciosamente e de maneira justa, usando suas ideias mais criativas para manter a discussão envolvente e dinâmica.

Lembre-se de focar na apresentação de um debate equilibrado, oferecendo argumentos fortes para cada lado e deixando espaço para uma discussão matizada. Estruture o diálogo para que pareça espontâneo e estimulante.`,
    dialog: `Escreva um diálogo de podcast longo, envolvente e informativo estruturado em torno de um debate animado. Certifique-se de que o apresentador facilite ativamente a discussão, fazendo perguntas estimulantes e encorajando os palestrantes a aprofundarem seus pontos de vista.

Represente claramente as perspectivas opostas e permita que os palestrantes se desafiem respeitosamente.

Nunca use nomes inventados para os apresentadores e convidados, mas torne uma experiência envolvente e imersiva para os ouvintes. Não inclua marcadores entre colchetes como [Apresentador] ou [Convidado]. Projete sua saída para ser lida em voz alta -- ela será convertida diretamente em áudio.

Incorpore exemplos, anedotas ou hipóteses para ilustrar argumentos e manter a conversa envolvente. Forneça contexto ou explicações para quaisquer tópicos complexos para torná-los acessíveis a uma audiência geral.

Perto do final, faça com que o apresentador e os palestrantes convidados resumam naturalmente suas posições e discutam quaisquer pontos em comum ou questões não resolvidas. Isso deve fluir organicamente da conversa, reforçando as ideias centrais uma última vez antes de encerrar.

O diálogo deve ser detalhado, relevante e imersivo, incentivando os ouvintes a refletirem sobre o tópico mesmo depois que o podcast terminar. O tom deve permanecer animado e equilibrado ao longo de todo o tempo.`
  },
  "SciAgents material discovery summary": {
    intro: `Your task is to take the input text provided and turn it into a lively, engaging conversation between a professor and a student in a panel discussion that describes a new material. The professor acts like Richard Feynman, but you never mention the name.

The input text is the result of a design developed by SciAgents, an AI tool for scientific discovery that has come up with a detailed materials design.

Don't worry about the formatting issues or any irrelevant information; your goal is to extract the key points, identify definitions, and interesting facts that could be discussed in a podcast.

Define all terms used carefully for a broad audience of listeners.
`,
    text_instructions: "First, carefully read through the input text and identify the main topics, key points, and any interesting facts or anecdotes. Think about how you could present this information in a fun, engaging way that would be suitable for a high quality presentation.",
    scratch_pad: `Brainstorm creative ways to discuss the main topics and key points you identified in the material design summary, especially paying attention to design features developed by SciAgents. Consider using analogies, examples, storytelling techniques, or hypothetical scenarios to make the content more relatable and engaging for listeners.

Keep in mind that your description should be accessible to a general audience, so avoid using too much jargon or assuming prior knowledge of the topic. If necessary, think of ways to briefly explain any complex concepts in simple terms.

Use your imagination to fill in any gaps in the input text or to come up with thought-provoking questions that could be explored in the podcast. The goal is to create an informative and entertaining dialogue, so feel free to be creative in your approach.

Define all terms used clearly and spend effort to explain the background.

Write your brainstorming ideas and a rough outline for the podcast dialogue here. Be sure to note the key insights and takeaways you want to reiterate at the end.

Make sure to make it fun and exciting. You never refer to the podcast, you just discuss the discovery and you focus on the new material design only.
`,
    prelude: `Now that you have brainstormed ideas and created a rough outline, it's time to write the actual podcast dialogue. Aim for a natural, conversational flow between the host and any guest speakers. Incorporate the best ideas from your brainstorming session and make sure to explain any complex topics in an easy-to-understand way.
`,
    dialog: `Write a very long, engaging, informative dialogue here, based on the key points and creative ideas you came up with during the brainstorming session. The presentation must focus on the novel aspects of the material design, behavior, and all related aspects.

Use a conversational tone and include any necessary context or explanations to make the content accessible to a general audience, but make it detailed, logical, and technical so that it has all necessary aspects for listeners to understand the material and its unexpected properties.

Remember, this describes a design developed by SciAgents, and this must be explicitly stated for the listeners.

Never use made-up names for the hosts and guests, but make it an engaging and immersive experience for listeners. Do not include any bracketed placeholders like [Host] or [Guest]. Design your output to be read aloud -- it will be directly converted into audio.

Make the dialogue as long and detailed as possible with great scientific depth, while still staying on topic and maintaining an engaging flow. Aim to use your full output capacity to create the longest podcast episode you can, while still communicating the key information from the input text in an entertaining way.

At the end of the dialogue, have the host and guest speakers naturally summarize the main insights and takeaways from their discussion. This should flow organically from the conversation, reiterating the key points in a casual, conversational manner. Avoid making it sound like an obvious recap - the goal is to reinforce the central ideas one last time before signing off.

`
  },
  
  lecture: {
    intro: `You are Professor Richard Feynman. Your task is to develop a script for a lecture. You never mention your name.

The material covered in the lecture is based on the provided text. 

Don't worry about the formatting issues or any irrelevant information; your goal is to extract the key points, identify definitions, and interesting facts that need to be covered in the lecture. 

Define all terms used carefully for a broad audience of students.
`,
    text_instructions: "First, carefully read through the input text and identify the main topics, key points, and any interesting facts or anecdotes. Think about how you could present this information in a fun, engaging way that would be suitable for a high quality presentation.",
    scratch_pad: `
Brainstorm creative ways to discuss the main topics and key points you identified in the input text. Consider using analogies, examples, storytelling techniques, or hypothetical scenarios to make the content more relatable and engaging for listeners.

Keep in mind that your lecture should be accessible to a general audience, so avoid using too much jargon or assuming prior knowledge of the topic. If necessary, think of ways to briefly explain any complex concepts in simple terms.

Use your imagination to fill in any gaps in the input text or to come up with thought-provoking questions that could be explored in the podcast. The goal is to create an informative and entertaining dialogue, so feel free to be creative in your approach.

Define all terms used clearly and spend effort to explain the background.

Write your brainstorming ideas and a rough outline for the lecture here. Be sure to note the key insights and takeaways you want to reiterate at the end.

Make sure to make it fun and exciting. 
`,
    prelude: `Now that you have brainstormed ideas and created a rough outline, it's time to write the actual podcast dialogue. Aim for a natural, conversational flow between the host and any guest speakers. Incorporate the best ideas from your brainstorming session and make sure to explain any complex topics in an easy-to-understand way.
`,
    dialog: `Write a very long, engaging, informative script here, based on the key points and creative ideas you came up with during the brainstorming session. Use a conversational tone and include any necessary context or explanations to make the content accessible to the students.

Include clear definitions and terms, and examples. 

Do not include any bracketed placeholders like [Host] or [Guest]. Design your output to be read aloud -- it will be directly converted into audio.

There is only one speaker, you, the professor. Stay on topic and maintaining an engaging flow. Aim to use your full output capacity to create the longest lecture you can, while still communicating the key information from the input text in an engaging way.

At the end of the lecture, naturally summarize the main insights and takeaways from the lecture. This should flow organically from the conversation, reiterating the key points in a casual, conversational manner. 

Avoid making it sound like an obvious recap - the goal is to reinforce the central ideas covered in this lecture one last time before class is over. 

`
  },

  "philosophical mode": {
    intro: `Your task is to develop a philosophical dialogue exploring deep questions and ideas. You are a philosopher engaging in Socratic dialogue.

Focus on critical analysis, logical reasoning, and exploring different perspectives on fundamental questions raised by the text.

Aim to challenge assumptions and encourage deeper thinking about the core concepts.`,
    text_instructions: "First, identify the key philosophical questions, ethical implications, and underlying assumptions in the text. Consider how these connect to broader philosophical debates and human understanding.",
    scratch_pad: `Outline the main philosophical arguments and counterarguments you want to explore. Consider:

- What fundamental questions about knowledge, reality, ethics etc. does this raise?
- What assumptions need to be examined?
- How do different philosophical frameworks approach these issues?
- What thought experiments could illuminate the key points?

Plan how to guide listeners through careful reasoning while keeping them engaged.`,
    prelude: `Now craft a philosophical dialogue that deeply examines the ideas while remaining accessible. Use the Socratic method to gradually build understanding through questions and examples.`,
    dialog: `Write an extended philosophical exploration that:
- Starts by clearly framing the key questions and concepts
- Uses examples and thought experiments to examine assumptions
- Considers multiple perspectives and potential objections
- Guides listeners through careful logical analysis
- Connects specific points to broader philosophical themes
- Concludes by synthesizing the key insights while acknowledging remaining questions

Never use made-up names for the hosts and guests, but make it an engaging and immersive experience for listeners. Do not include any bracketed placeholders like [Host] or [Guest]. Design your output to be read aloud -- it will be directly converted into audio.

Aim for a tone that is both intellectually rigorous and engaging. Focus on deep understanding rather than definitive answers.

The dialogue should flow naturally while systematically developing the philosophical analysis.`
  },

  "academic mode": {
    intro: `Your task is to create an academic research discussion examining the evidence, methodology and implications of the material. You are a panel of researchers discussing recent findings.

Focus on rigorous analysis of the research, methodology, and evidence while maintaining scholarly standards.`,
    text_instructions: "First, analyze the research methodology, evidence quality, and theoretical frameworks. Consider how this connects to existing literature and potential future research directions.", 
    scratch_pad: `Outline the key academic points to examine:

- Research methodology and design
- Quality and interpretation of evidence
- Theoretical frameworks and assumptions
- Connection to existing literature
- Limitations and future directions
- Broader implications for the field

Plan how to maintain academic rigor while keeping the discussion engaging.`,
    prelude: `Now craft an academic dialogue that thoroughly examines the research while remaining clear and compelling. Balance technical precision with accessibility.`,
    dialog: `Write an extended academic discussion that:
- Clearly presents the research context and methodology
- Critically examines the evidence and analysis
- Considers alternative interpretations and approaches
- Connects to broader theoretical frameworks
- Identifies limitations and future directions
- Concludes by synthesizing key findings and implications

Never use made-up names for the hosts and guests, but make it an engaging and immersive experience for listeners. Do not include any bracketed placeholders like [Host] or [Guest]. Design your output to be read aloud -- it will be directly converted into audio.

Maintain scholarly standards while making complex ideas accessible.

The dialogue should systematically develop the academic analysis while remaining engaging.`
  },

  "therapeutic mode": {
    intro: `Your task is to create a therapeutic dialogue exploring psychological and emotional aspects of the material. You are a counselor helping process and understand these issues.

Focus on emotional intelligence, self-reflection, and practical coping strategies while maintaining appropriate therapeutic boundaries.`,
    text_instructions: "First, identify the key psychological themes, emotional patterns, and potential therapeutic approaches relevant to processing this material.",
    scratch_pad: `Outline the therapeutic elements to explore:

- Emotional responses and patterns
- Cognitive frameworks and beliefs
- Coping strategies and resources
- Personal growth opportunities
- Practical applications
- Support systems and boundaries

Plan how to create a supportive space for processing while maintaining professionalism.`,
    prelude: `Now craft a therapeutic dialogue that explores psychological themes while remaining grounded and constructive. Balance emotional processing with practical insights.`,
    dialog: `Write an extended therapeutic discussion that:
- Creates a supportive, reflective space
- Explores emotional responses and patterns
- Examines underlying beliefs and assumptions
- Offers practical coping strategies
- Identifies sources of support and growth
- Concludes by integrating insights into daily life

Never use made-up names for the hosts and guests, but make it an engaging and immersive experience for listeners. Do not include any bracketed placeholders like [Host] or [Guest]. Design your output to be read aloud -- it will be directly converted into audio.

Maintain appropriate therapeutic boundaries while offering genuine support and insight.

The dialogue should naturally explore psychological themes while remaining constructive and solution-focused.`
  },
  
  summary: {
    intro: `Your task is to develop a summary of a paper. You never mention your name.

Don't worry about the formatting issues or any irrelevant information; your goal is to extract the key points, identify definitions, and interesting facts that need to be summarized.

Define all terms used carefully for a broad audience.
`,
    text_instructions: "First, carefully read through the input text and identify the main topics, key points, and key facts. Think about how you could present this information in an accurate summary.",
    scratch_pad: `Brainstorm creative ways to present the main topics and key points you identified in the input text. Consider using analogies, examples, or hypothetical scenarios to make the content more relatable and engaging for listeners.

Keep in mind that your summary should be accessible to a general audience, so avoid using too much jargon or assuming prior knowledge of the topic. If necessary, think of ways to briefly explain any complex concepts in simple terms. Define all terms used clearly and spend effort to explain the background.

Write your brainstorming ideas and a rough outline for the summary here. Be sure to note the key insights and takeaways you want to reiterate at the end.

Make sure to make it engaging and exciting. 
`,
    prelude: `Now that you have brainstormed ideas and created a rough outline, it is time to write the actual summary. Aim for a natural, conversational flow between the host and any guest speakers. Incorporate the best ideas from your brainstorming session and make sure to explain any complex topics in an easy-to-understand way.
`,
    dialog: `Write a a script here, based on the key points and creative ideas you came up with during the brainstorming session. Use a conversational tone and include any necessary context or explanations to make the content accessible to the the audience.

Start your script by stating that this is a summary, referencing the title or headings in the input text. If the input text has no title, come up with a succinct summary of what is covered to open.

Include clear definitions and terms, and examples, of all key issues. 

Do not include any bracketed placeholders like [Host] or [Guest]. Design your output to be read aloud -- it will be directly converted into audio.

There is only one speaker, you. Stay on topic and maintaining an engaging flow. 

Naturally summarize the main insights and takeaways from the summary. This should flow organically from the conversation, reiterating the key points in a casual, conversational manner. 

The summary should have around 1024 words.
`
  },
  
  "short summary": {
    intro: `Your task is to develop a summary of a paper. You never mention your name.

Don't worry about the formatting issues or any irrelevant information; your goal is to extract the key points, identify definitions, and interesting facts that need to be summarized.

Define all terms used carefully for a broad audience.
`,
    text_instructions: "First, carefully read through the input text and identify the main topics, key points, and key facts. Think about how you could present this information in an accurate summary.",
    scratch_pad: `Brainstorm creative ways to present the main topics and key points you identified in the input text. Consider using analogies, examples, or hypothetical scenarios to make the content more relatable and engaging for listeners.

Keep in mind that your summary should be accessible to a general audience, so avoid using too much jargon or assuming prior knowledge of the topic. If necessary, think of ways to briefly explain any complex concepts in simple terms. Define all terms used clearly and spend effort to explain the background.

Write your brainstorming ideas and a rough outline for the summary here. Be sure to note the key insights and takeaways you want to reiterate at the end.

Make sure to make it engaging and exciting. 
`,
    prelude: `Now that you have brainstormed ideas and created a rough outline, it is time to write the actual summary. Aim for a natural, conversational flow between the host and any guest speakers. Incorporate the best ideas from your brainstorming session and make sure to explain any complex topics in an easy-to-understand way.
`,
    dialog: `Write a a script here, based on the key points and creative ideas you came up with during the brainstorming session. Keep it concise, and use a conversational tone and include any necessary context or explanations to make the content accessible to the the audience.

Start your script by stating that this is a summary, referencing the title or headings in the input text. If the input text has no title, come up with a succinct summary of what is covered to open.

Include clear definitions and terms, and examples, of all key issues. 

Do not include any bracketed placeholders like [Host] or [Guest]. Design your output to be read aloud -- it will be directly converted into audio.

There is only one speaker, you. Stay on topic and maintaining an engaging flow. 

Naturally summarize the main insights and takeaways from the short summary. This should flow organically from the conversation, reiterating the key points in a casual, conversational manner. 

The summary should have around 256 words.
`
  },
  
  "podcast (French)": {
    intro: `Votre tâche consiste à prendre le texte fourni et à le transformer en un dialogue de podcast vivant, engageant et informatif, dans le style de NPR. Le texte d'entrée peut être désorganisé ou non structuré, car il peut provenir de diverses sources telles que des fichiers PDF ou des pages web.

Ne vous inquiétez pas des problèmes de formatage ou des informations non pertinentes ; votre objectif est d'extraire les points clés, d'identifier les définitions et les faits intéressants qui pourraient être discutés dans un podcast.

Définissez soigneusement tous les termes utilisés pour un public large.
`,
    text_instructions: "Tout d'abord, lisez attentivement le texte d'entrée et identifiez les principaux sujets, points clés et faits ou anecdotes intéressants. Réfléchissez à la manière dont vous pourriez présenter ces informations de manière amusante et engageante, convenant à une présentation de haute qualité.",
    scratch_pad: `Réfléchissez à des moyens créatifs pour discuter des principaux sujets et points clés que vous avez identifiés dans le texte d'entrée. Envisagez d'utiliser des analogies, des exemples, des techniques de narration ou des scénarios hypothétiques pour rendre le contenu plus accessible et attrayant pour les auditeurs.

Gardez à l'esprit que votre podcast doit être accessible à un large public, donc évitez d'utiliser trop de jargon ou de supposer une connaissance préalable du sujet. Si nécessaire, trouvez des moyens d'expliquer brièvement les concepts complexes en termes simples.

Utilisez votre imagination pour combler les lacunes du texte d'entrée ou pour poser des questions stimulantes qui pourraient être explorées dans le podcast. L'objectif est de créer un dialogue informatif et divertissant, donc n'hésitez pas à faire preuve de créativité dans votre approche.

Définissez clairement tous les termes utilisés et prenez le temps d'expliquer le contexte.

Écrivez ici vos idées de brainstorming et une esquisse générale pour le dialogue du podcast. Assurez-vous de noter les principaux points et enseignements que vous souhaitez réitérer à la fin.

Faites en sorte que ce soit amusant et captivant.
`,
    prelude: `Maintenant que vous avez réfléchi à des idées et créé une esquisse générale, il est temps d'écrire le dialogue réel du podcast. Visez un flux naturel et conversationnel entre l'hôte et tout invité. Intégrez les meilleures idées de votre session de brainstorming et assurez-vous d'expliquer tous les sujets complexes de manière compréhensible.
`,
    dialog: `Écrivez ici un dialogue de podcast très long, captivant et informatif, basé sur les points clés et les idées créatives que vous avez développés lors de la session de brainstorming. Utilisez un ton conversationnel et incluez tout contexte ou explication nécessaire pour rendre le contenu accessible à un public général.

Ne créez jamais de noms fictifs pour les hôtes et les invités, mais rendez cela engageant et immersif pour les auditeurs. N'incluez pas de marqueurs entre crochets comme [Hôte] ou [Invité]. Conceptionnez votre sortie pour être lue à haute voix – elle sera directement convertie en audio.

Faites en sorte que le dialogue soit aussi long et détaillé que possible, tout en restant sur le sujet et en maintenant un flux engageant. Utilisez toute votre capacité de production pour créer l'épisode de podcast le plus long possible, tout en communiquant les informations clés du texte d'entrée de manière divertissante.

À la fin du dialogue, l'hôte et les invités doivent naturellement résumer les principales idées et enseignements de leur discussion. Cela doit découler naturellement de la conversation, en réitérant les points clés de manière informelle et conversationnelle. Évitez de donner l'impression qu'il s'agit d'un récapitulatif évident – l'objectif est de renforcer les idées centrales une dernière fois avant de conclure.

`
  },
  
  "podcast (German)": {
    intro: `Deine Aufgabe ist es, den bereitgestellten Text in einen lebendigen, fesselnden und informativen Podcast-Dialog im Stil von NPR zu verwandeln. Der Eingabetext kann unstrukturiert oder chaotisch sein, da er aus verschiedenen Quellen wie PDFs oder Webseiten stammen kann.

Mach dir keine Sorgen über Formatierungsprobleme oder irrelevante Informationen; dein Ziel ist es, die wichtigsten Punkte zu extrahieren, Definitionen und interessante Fakten zu identifizieren, die in einem Podcast besprochen werden könnten.

Definiere alle verwendeten Begriffe sorgfältig für ein breites Publikum.
`,
    text_instructions: "Lies zuerst den Eingabetext sorgfältig durch und identifiziere die Hauptthemen, Schlüsselpunkte und interessante Fakten oder Anekdoten. Überlege, wie du diese Informationen auf unterhaltsame und ansprechende Weise präsentieren könntest, sodass sie für eine hochwertige Präsentation geeignet sind.",
    scratch_pad: `Denke kreativ darüber nach, wie du die Hauptthemen und Schlüsselpunkte, die du im Eingabetext identifiziert hast, diskutieren könntest. Verwende Analogien, Beispiele, Erzähltechniken oder hypothetische Szenarien, um den Inhalt für die Zuhörer nachvollziehbarer und ansprechender zu gestalten.

Behalte im Hinterkopf, dass dein Podcast einem breiten Publikum zugänglich sein sollte, daher vermeide zu viel Fachjargon oder die Annahme von Vorwissen über das Thema. Falls nötig, überlege dir Möglichkeiten, um komplexe Konzepte kurz und einfach zu erklären.

Nutze deine Fantasie, um Lücken im Eingabetext zu füllen oder um nachdenklich stimmende Fragen zu formulieren, die im Podcast erforscht werden könnten. Das Ziel ist es, einen informativen und unterhaltsamen Dialog zu schaffen, daher kannst du bei deinem Ansatz kreativ sein.

Definiere alle verwendeten Begriffe klar und nimm dir die Zeit, den Hintergrund zu erläutern.

Schreibe deine Brainstorming-Ideen und eine grobe Gliederung für den Podcast-Dialog hier auf. Achte darauf, die wichtigsten Erkenntnisse und Aussagen, die du am Ende wiederholen möchtest, zu notieren.

Sorge dafür, dass es unterhaltsam und spannend ist.
`,
    prelude: `Nun, da du Ideen gesammelt und eine grobe Gliederung erstellt hast, ist es an der Zeit, den eigentlichen Podcast-Dialog zu schreiben. Strebe einen natürlichen, konversationellen Fluss zwischen dem Moderator und etwaigen Gästen an. Nutze die besten Ideen aus deiner Brainstorming-Sitzung und erkläre alle komplexen Themen auf eine leicht verständliche Weise.
`,
    dialog: `Schreibe hier einen sehr langen, fesselnden und informativen Podcast-Dialog, basierend auf den wichtigsten Punkten und kreativen Ideen, die du während der Brainstorming-Sitzung erarbeitet hast. Verwende einen konversationellen Ton und füge alle notwendigen Kontexte oder Erklärungen hinzu, um den Inhalt für ein allgemeines Publikum zugänglich zu machen.

Verwende niemals erfundene Namen für die Moderatoren und Gäste, aber gestalte es zu einem fesselnden und immersiven Erlebnis für die Zuhörer. Verwende keine Platzhalter wie [Moderator] oder [Gast]. Dein Output wird direkt in Audio umgewandelt, daher entwerfe den Dialog so, dass er laut vorgelesen werden kann.

Gestalte den Dialog so lang und detailliert wie möglich, bleibe dabei jedoch immer beim Thema und erhalte einen flüssigen, ansprechenden Verlauf. Verwende deine volle Output-Kapazität, um die längste mögliche Podcast-Episode zu erstellen, während du die wichtigsten Informationen aus dem Eingabetext auf unterhaltsame Weise vermittelst.

Am Ende des Dialogs sollen der Moderator und die Gäste die wichtigsten Erkenntnisse und Aussagen ihres Gesprächs auf natürliche Weise zusammenfassen. Dies sollte organisch aus der Konversation hervorgehen und die wichtigsten Punkte in einem lockeren, gesprächigen Stil wiederholen. Vermeide es, wie eine offensichtliche Zusammenfassung zu klingen – das Ziel ist es, die zentralen Ideen ein letztes Mal zu verstärken, bevor der Podcast endet.


`
  },
  
  "podcast (Spanish)": {
    intro: `Tu tarea es tomar el texto de entrada proporcionado y convertirlo en un diálogo de podcast animado, atractivo e informativo, al estilo de NPR. El texto de entrada puede estar desordenado o poco estructurado, ya que podría provenir de diversas fuentes como archivos PDF o páginas web.

No te preocupes por los problemas de formato o por la información irrelevante; tu objetivo es extraer los puntos clave, identificar definiciones y hechos interesantes que podrían discutirse en un podcast.

Define cuidadosamente todos los términos utilizados para una audiencia amplia.
`,
    text_instructions: "Primero, lee detenidamente el texto de entrada e identifica los temas principales, los puntos clave y cualquier hecho o anécdota interesante. Piensa en cómo podrías presentar esta información de una manera divertida y atractiva, adecuada para una presentación de alta calidad.",
    scratch_pad: `Piensa de manera creativa sobre cómo discutir los temas principales y los puntos clave que has identificado en el texto de entrada. Considera usar analogías, ejemplos, técnicas narrativas o escenarios hipotéticos para hacer que el contenido sea más comprensible y atractivo para los oyentes.

Ten en cuenta que tu podcast debe ser accesible para una audiencia general, así que evita usar demasiado jerga técnica o asumir que la audiencia tiene conocimientos previos del tema. Si es necesario, piensa en formas de explicar brevemente cualquier concepto complejo en términos sencillos.

Usa tu imaginación para llenar los vacíos en el texto de entrada o para formular preguntas provocadoras que podrían explorarse en el podcast. El objetivo es crear un diálogo informativo y entretenido, por lo que puedes ser creativo en tu enfoque.

Define claramente todos los términos utilizados y asegúrate de explicar el trasfondo.

Escribe tus ideas de brainstorming y un esquema general del diálogo del podcast aquí. Asegúrate de anotar los puntos clave y las conclusiones que deseas reiterar al final.

Asegúrate de que sea divertido y emocionante.
`,
    prelude: `Ahora que has realizado una lluvia de ideas y has creado un esquema general, es hora de escribir el diálogo real del podcast. Apunta a un flujo natural y conversacional entre el presentador y cualquier invitado. Incorpora las mejores ideas de tu sesión de lluvia de ideas y asegúrate de explicar cualquier tema complejo de una manera fácil de entender.
`,
    dialog: `Escribe aquí un diálogo de podcast muy largo, atractivo e informativo, basado en los puntos clave y las ideas creativas que se te ocurrieron durante la sesión de brainstorming. Usa un tono conversacional e incluye el contexto o las explicaciones necesarias para que el contenido sea accesible a una audiencia general.

Nunca uses nombres inventados para los presentadores e invitados, pero haz que sea una experiencia atractiva e inmersiva para los oyentes. No incluyas ningún marcador de posición entre corchetes como [Presentador] o [Invitado]. Diseña tu salida para que sea leída en voz alta, ya que se convertirá directamente en audio.

Haz el diálogo lo más largo y detallado posible, manteniéndote en el tema y asegurando un flujo atractivo. Apunta a utilizar toda tu capacidad de salida para crear el episodio de podcast más largo posible, mientras comunicas la información clave del texto de entrada de una manera entretenida.

Al final del diálogo, el presentador y los invitados deben resumir naturalmente las principales ideas y conclusiones de su conversación. Esto debe fluir orgánicamente desde la conversación, reiterando los puntos clave de manera casual y conversacional. Evita que suene como un resumen obvio: el objetivo es reforzar las ideas centrales una última vez antes de finalizar.


`
  },
  
  "podcast (Portuguese)": {
    intro: `Sua tarefa é pegar o texto de entrada fornecido e transformá-lo em um diálogo de podcast animado, envolvente e informativo, no estilo da NPR. O texto de entrada pode ser desorganizado ou não estruturado, pois pode vir de várias fontes, como PDFs ou páginas da web.

Não se preocupe com problemas de formatação ou informações irrelevantes; seu objetivo é extrair os pontos principais, identificar definições e fatos interessantes que possam ser discutidos em um podcast.

Defina cuidadosamente todos os termos usados para um público amplo.
`,
    text_instructions: "Primeiro, leia atentamente o texto de entrada e identifique os principais tópicos, pontos-chave e quaisquer fatos ou anedotas interessantes. Pense em como você poderia apresentar essas informações de maneira divertida e envolvente, adequada para uma apresentação de alta qualidade.",
    scratch_pad: `Pense de maneira criativa sobre como discutir os principais tópicos e pontos-chave que você identificou no texto de entrada. Considere usar analogias, exemplos, técnicas de narrativa ou cenários hipotéticos para tornar o conteúdo mais acessível e interessante para os ouvintes.

Tenha em mente que seu podcast deve ser acessível a um público geral, por isso, evite usar jargões técnicos ou presumir que o público tem conhecimento prévio do assunto. Se necessário, pense em maneiras de explicar brevemente qualquer conceito complexo em termos simples.

Use sua imaginação para preencher quaisquer lacunas no texto de entrada ou para criar perguntas instigantes que possam ser exploradas no podcast. O objetivo é criar um diálogo informativo e divertido, então sinta-se à vontade para ser criativo em sua abordagem.

Defina claramente todos os termos utilizados e faça um esforço para explicar o contexto.

Escreva suas ideias de brainstorming e um esboço para o diálogo do podcast aqui. Certifique-se de anotar os principais insights e pontos que deseja reiterar no final.

Certifique-se de que seja divertido e empolgante.
`,
    prelude: `Agora que você já fez um brainstorming de ideias e criou um esboço, é hora de escrever o diálogo real do podcast. Busque um fluxo natural e conversacional entre o apresentador e qualquer convidado. Incorpore as melhores ideias de sua sessão de brainstorming e certifique-se de explicar qualquer tópico complexo de maneira fácil de entender.
`,
    dialog: `Escreva aqui um diálogo de podcast muito longo, envolvente e informativo, com base nos pontos-chave e nas ideias criativas que você criou durante a sessão de brainstorming. Use um tom conversacional e inclua o contexto ou explicações necessárias para tornar o conteúdo acessível a um público geral.

Nunca use nomes inventados para os apresentadores e convidados, mas faça com que seja uma experiência envolvente e imersiva para os ouvintes. Não inclua marcadores de posição como [Apresentador] ou [Convidado]. Desenvolva sua saída de forma que ela seja lida em voz alta – ela será diretamente convertida em áudio.

Faça o diálogo o mais longo e detalhado possível, mantendo-se no tema e garantindo um fluxo envolvente. Use sua capacidade total de produção para criar o episódio de podcast mais longo possível, enquanto comunica as informações principais do texto de entrada de maneira divertida.

No final do diálogo, o apresentador e os convidados devem resumir naturalmente as principais ideias e insights de sua conversa. Isso deve fluir organicamente a partir da conversa, reiterando os pontos-chave de maneira casual e conversacional. Evite soar como um resumo óbvio – o objetivo é reforçar as ideias centrais uma última vez antes de finalizar.


`
  },
  "podcast (Romanian)": {
    intro: `Sarcina ta este să transformi textul de intrare furnizat într-un dialog de podcast vibrant, captivant și informativ, în stilul NPR. Textul de intrare poate fi dezorganizat sau nestructurat, deoarece poate proveni din diverse surse precum PDF-uri sau pagini web.

Nu te îngrijora de problemele de formatare sau de informațiile irelevante; scopul tău este să extragi punctele principale, să identifici definițiile și faptele interesante care ar putea fi discutate într-un podcast.

Definește cu atenție toți termenii folosiți pentru un public larg.
`,
    text_instructions: "Mai întâi, citește cu atenție textul de intrare și identifică subiectele principale, punctele cheie și orice fapte sau anecdote interesante. Gândește-te cum ai putea prezenta aceste informații într-un mod distractiv și captivant, potrivit pentru o prezentare de înaltă calitate.",
    scratch_pad: `Gândește-te creativ la modalități de a discuta subiectele principale și punctele cheie pe care le-ai identificat în textul de intrare. Ia în considerare utilizarea analogiilor, exemplelor, tehnicilor de povestire sau a scenariilor ipotetice pentru a face conținutul mai relevant și mai captivant pentru ascultători.

Ține minte că podcastul tău ar trebui să fie accesibil pentru un public general, așa că evită să folosești prea mult jargon sau să presupui că există cunoștințe anterioare despre subiect. Dacă este necesar, gândește-te la modalități de a explica pe scurt orice concept complex în termeni simpli.

Folosește-ți imaginația pentru a umple orice goluri din textul de intrare sau pentru a veni cu întrebări provocatoare care ar putea fi explorate în podcast. Scopul este de a crea un dialog informativ și distractiv, așa că nu ezita să fii creativ în abordare.

Definește clar toți termenii utilizați și acordă timp pentru a explica contextul.

Scrie aici ideile tale și o schiță pentru dialogul podcastului. Asigură-te că notezi principalele perspective și puncte pe care dorești să le reiterezi la final.

Asigură-te că este distractiv și captivant.
`,
    prelude: `Acum că ai făcut brainstorming și ai creat o schiță generală, este timpul să scrii dialogul efectiv al podcastului. Urmărește un flux natural, conversațional între gazdă și orice invitat. Încorporează cele mai bune idei din sesiunea ta de brainstorming și asigură-te că explici orice subiect complex într-un mod ușor de înțeles.
`,
    dialog: `Scrie aici un dialog de podcast foarte lung, captivant și informativ, bazat pe punctele cheie și ideile creative pe care le-ai generat în timpul sesiunii de brainstorming. Folosește un ton conversațional și include orice context sau explicații necesare pentru a face conținutul accesibil pentru un public general.

Nu folosi niciodată nume inventate pentru gazde și invitați, dar fă-l o experiență captivantă și imersivă pentru ascultători. Nu include marcaje între paranteze pătrate precum [Gazdă] sau [Invitat]. Proiectează-ți output-ul pentru a fi citit cu voce tare - va fi convertit direct în audio.

Fă dialogul cât mai lung și detaliat posibil, menținând totuși tema și asigurând un flux captivant. Țintește să folosești întreaga ta capacitate de output pentru a crea cel mai lung episod de podcast posibil, în timp ce comunici informațiile cheie din textul de intrare într-un mod distractiv.

La sfârșitul dialogului, gazda și invitații ar trebui să rezume în mod natural principalele idei și perspective din conversația lor. Acest lucru ar trebui să curgă organic din conversație, reiterând punctele cheie într-un mod casual și conversațional. Evită să sune ca un rezumat evident - scopul este de a întări ideile centrale o ultimă dată înainte de final.


`
  },
  
  "podcast (Hindi)": {
    intro: `आपका कार्य दिए गए इनपुट टेक्स्ट को लेकर उसे एक जीवंत, आकर्षक और जानकारीपूर्ण पॉडकास्ट वार्तालाप में बदलना है, NPR की शैली में। इनपुट टेक्स्ट असंगठित या अव्यवस्थित हो सकता है, क्योंकि यह विभिन्न स्रोतों जैसे PDFs या वेब पेजों से आ सकता है।

फ़ॉर्मेटिंग समस्याओं या अप्रासंगिक जानकारी की चिंता न करें; आपका उद्देश्य मुख्य बिंदुओं को निकालना, परिभाषाओं और दिलचस्प तथ्यों को पहचानना है जिन्हें पॉडकास्ट में चर्चा की जा सकती है।

सभी उपयोग किए गए शब्दों को सावधानीपूर्वक व्यापक दर्शकों के लिए परिभाषित करें।
`,
    text_instructions: "सबसे पहले, इनपुट टेक्स्ट को ध्यान से पढ़ें और मुख्य विषयों, प्रमुख बिंदुओं और किसी भी दिलचस्प तथ्य या उपाख्यानों त करने के बारे में सोचें कि आप इसे एक मज़ेदार, आकर्षक तरीके से कैसे प्रस्तुत कर सकते हैं जो उच्च गुणवत्ता वाली प्रस्तुति के लिए उपयुक्त हो।",
    scratch_pad: `मुख्य विषयों और प्रमुख बिंदुओं पर चर्चा करने के रचनात्मक तरीकों के बारे में सोचें जिन्हें आपने इनपुट टेक्स्ट में पहचाना है। उदाहरणों, कहानियों की तकनीकों, या काल्पनिक परिदृश्यों का उपयोग करके सामग्री को श्रोताओं के लिए अधिक सम्बंधित और आकर्षक बनाने पर विचार करें।

ध्यान रखें कि आपका पॉडकास्ट एक सामान्य दर्शक के लिए सुलभ होना चाहिए, इसलिए बहुत अधिक तकनीकी शब्दजाल से बचें या यह न मानें कि विषय का पूर्व ज्ञान है। यदि आवश्यक हो, तो किसी भी जटिल अवधारणा को सरल शब्दों में संक्षेप में समझाने के तरीकों के बारे में सोचें।

अपनी कल्पना का उपयोग करके इनपुट टेक्स्ट में किसी भी अंतराल को भरें या पॉडकास्ट में खोजे जा सकने वाले विचारोत्तेजक सवालों के साथ आएं। उद्देश्य एक जानकारीपूर्ण और मनोरंजक वार्तालाप बनाना है, इसलिए अपने दृष्टिकोण में रचनात्मक होने से न डरें।

सभी उपयोग किए गए शब्दों को स्पष्ट रूप से परिभाषित करें और पृष्ठभूमि समझाने के लिए समय दें।

यहां अपने विचार-मंथन और पॉडकास्ट वार्तालाप के लिए एक मोटा खाका लिखें। सुनिश्चित करें कि आपने उन प्रमुख अंतर्दृष्टियों और निष्कर्षों को नोट किया है जिन्हें आप अंत में दोहराना चाहते हैं।

इसे मजेदार और रोमांचक बनाएं।
`,
    prelude: `अब जब आपने विचार-मंथन किया है और एक मोटा खाका तैयार कर लिया है, तो वास्तविक पॉडकास्ट वार्तालाप लिखने का समय आ गया है। होस्ट और किसी भी अतिथि वक्ता के बीच एक स्वाभाविक, संवादात्मक प्रवाह की दिशा में कार्य करें। अपने विचार-मंथन सत्र से सर्वश्रेष्ठ विचारों को शामिल करें और सुनिश्चित करें कि किसी भी जटिल विषय को आसानी से समझ में आने वाले तरीके से समझाया जाए।
`,
    dialog: `यहां एक बहुत लंबा, आकर्षक और जानकारीपूर्ण पॉडकास्ट वार्तालाप लिखें, जो उन प्रमुख बिंदुओं और रचनात्मक विचारों पर आधारित हो जो आपने विचार-मंथन सत्र के दौरान बनाए थे। एक संवादात्मक शैली का उपयोग करें और सामग्री को एक सामान्य दर्शक के लिए सुलभ बनाने के लिए किसी भी आवश्यक संदर्भ या व्याख्याएं शामिल करें।

होस्ट और अतिथि वक्ताओं के लिए कभी भी काल्पनिक नामों का उपयोग न करें, बल्कि श्रोताओं के लिए इसे एक आकर्षक और immersive अनुभव बनाएं। किसी भी प्रकार के ब्रैकेटेड प्लेसहोल्डर्स जैसे [होस्ट] या [अतिथि] को शामिल न करें। अपनी आउटपुट को इस तरह डिज़ाइन करें कि इसे ज़ोर से पढ़ा जा सके – इसे सीधे ऑडियो में परिवर्तित किया जाएगा।

डायलॉग को यथासंभव लंबा और विस्तृत बनाएं, फिर भी विषय पर बने रहें और प्रवाह को आकर्षक बनाए रखें। अपनी पूरी आउटपुट क्षमता का उपयोग करते हुए यथासंभव लंबे पॉडकास्ट एपिसोड को बनाएं, जबकि फिर भी इनपुट टेक्स्ट से प्रमुख जानकारी को मनोरंजक तरीके से संप्रेषित करें।

वार्तालाप के अंत में, होस्ट और अतिथि वक्ता अपने चर्चा से स्वाभाविक रूप से मुख्य अंतर्दृष्टियों और निष्कर्षों को संक्षेप में प्रस्तुत करें। यह वार्तालाप से स्वाभाविक रूप से प्रवाहित होना चाहिए, अनौपचारिक, संवादात्मक तरीके से प्रमुख बिंदुओं को फिर से स्पष्ट करें। इसे स्पष्ट पुनरावृत्ति की तरह न बनाएं – उद्देश्य केंद्रीय विचारों को एक आखिरी बार सुदृढ़ करना है, इससे पहले कि वार्तालाप समाप्त हो जाए।


`
  },
  
  "podcast (Simplified Chinese)": {
    intro: `你的任务是将提供的输入文本转变为一个生动、有趣、信息丰富的播客对话，风格类似NPR。输入文本可能是凌乱的或未结构化的，因为它可能来自PDF或网页等各种来源。

不要担心格式问题或任何无关的信息；你的目标是提取关键点，识别定义和可能在播客中讨论的有趣事实。

为广泛的听众仔细定义所有使用的术语。
`,
    text_instructions: "首先，仔细阅读输入文本，识别主要话题、关键点和任何有趣的事实或轶事。思考如何以一种有趣且引人入胜的方式呈现这些信息，适合高质量的呈现。",
    scratch_pad: `集思广益，想出一些讨论你在输入文本中识别到的主要话题和关键点的创意方式。考虑使用类比、例子、讲故事的技巧或假设场景，让内容对听众更具相关性和吸引力。

请记住，你的播客应面向普通大众，因此避免使用过多的行话或假设听众对该主题有预先的了解。如有必要，考虑简要解释任何复杂概念，用简单的术语进行说明。

利用你的想象力填补输入文本中的任何空白，或提出一些值得探索的发人深省的问题。目标是创造一个信息丰富且有趣的对话，因此可以在方法上大胆创新。

明确地定义所有使用的术语，并花时间解释背景。

在这里写下你的头脑风暴想法和播客对话的粗略大纲。务必记录你想在结尾重复的关键见解和收获。

确保让它有趣且令人兴奋。
`,
    prelude: `现在你已经进行了头脑风暴并创建了一个粗略大纲，是时候编写实际的播客对话了。目标是主持人与嘉宾之间的自然对话流。结合你头脑风暴中的最佳想法，并确保以简单易懂的方式解释任何复杂的主题。
`,
    dialog: `在这里写下一个非常长、引人入胜且信息丰富的播客对话，基于你在头脑风暴会议中提出的关键点和创意。使用对话语气，并包含任何必要的上下文或解释，使内容易于普通听众理解。

不要为主持人和嘉宾使用虚构的名字，而是让听众体验一个引人入胜且沉浸式的经历。不要包括像[主持人]或[嘉宾]这样的占位符。设计你的输出以供大声朗读——它将被直接转换为音频。

使对话尽可能长且详细，同时保持在主题上并维持引人入胜的流畅性。充分利用你的输出能力，创造尽可能长的播客节目，同时以有趣的方式传达输入文本中的关键信息。

在对话的最后，主持人和嘉宾应自然总结他们讨论的主要见解和收获。这应从对话中自然流出，以随意、对话的方式重复关键点。避免显得像是显而易见的总结——目标是在结束前最后一次加强核心思想。


`
  },
  "podcast (Traditional Chinese)": {
    intro: `您的任務是將提供的輸入文本轉變為一個生動、有趣、資訊豐富的播客對話，風格類似NPR。輸入文本可能是凌亂的或未結構化的，因為它可能來自PDF或網頁等各種來源。

不要擔心格式問題或任何無關的資訊；您的目標是提取關鍵點，識別定義和可能在播客中討論的有趣事實。

為廣泛的聽眾仔細定義所有使用的術語。`,
    text_instructions: "首先，仔細閱讀輸入文本，識別主要話題、關鍵點和任何有趣的事實或軼事。思考如何以一種有趣且引人入勝的方式呈現這些資訊，適合高品質的呈現。",
    scratch_pad: `集思廣益，想出一些討論您在輸入文本中識別到的主要話題和關鍵點的創意方式。考慮使用類比、例子、講故事的技巧或假設場景，讓內容對聽眾更具相關性和吸引力。

請記住，您的播客應面向普通大眾，因此避免使用過多的行話或假設聽眾對該主題有預先的了解。如有必要，考慮簡要解釋任何複雜概念，用簡單的術語進行說明。

利用您的想像力填補輸入文本中的任何空白，或提出一些值得探索的發人深省的問題。目標是創造一個資訊豐富且有趣的對話，因此可以在方法上大膽創新。

明確地定義所有使用的術語，並花時間解釋背景。

在這裡寫下您的頭腦風暴想法和播客對話的粗略大綱。務必記錄您想在結尾重複的關鍵見解和收穫。

確保讓它有趣且令人興奮。`,
    prelude: `現在您已經進行了頭腦風暴並創建了一個粗略大綱，是時候編寫實際的播客對話了。目標是主持人與嘉賓之間的自然對話流。結合您頭腦風暴中的最佳想法，並確保以簡單易懂的方式解釋任何複雜的主題。`,
    dialog: `在這裡寫下一個非常長、引人入勝且資訊豐富的播客對話，基於您在頭腦風暴會議中提出的關鍵點和創意。使用對話語氣，並包含任何必要的上下文或解釋，使內容易於普通聽眾理解。

不要為主持人和嘉賓使用虛構的名字，而是讓聽眾體驗一個引人入勝且沉浸式的經歷。不要包括像[主持人]或[嘉賓]這樣的佔位符。設計您的輸出以供大聲朗讀——它將被直接轉換為音頻。

使對話盡可能長且詳細，同時保持在主題上並維持引人入勝的流暢性。充分利用您的輸出能力，創造盡可能長的播客節目，同時以有趣的方式傳達輸入文本中的關鍵資訊。

在對話的最後，主持人和嘉賓應自然總結他們討論的主要見解和收穫。這應從對話中自然流出，以隨意、對話的方式重複關鍵點。避免顯得像是顯而易見的總結——目標是在結束前最後一次加強核心思想。`
  },
  "podcast (Norwegian)": {
    intro: `Din oppgave er å ta den gitte input-teksten og gjøre den om til en livlig, engasjerende og informativ podcast-dialog i NPR-stil. Input-teksten kan være rotete eller ustrukturert, da den kan komme fra ulike kilder som PDF-er eller nettsider.

Ikke bekymre deg for formateringsproblemer eller irrelevant informasjon; målet ditt er å trekke ut hovedpoengene, identifisere definisjoner og interessante fakta som kan diskuteres i en podcast.

Definer alle brukte begreper nøye for et bredt publikum av lyttere.`,
    text_instructions: "Først, les nøye gjennom input-teksten og identifiser hovedtemaene, nøkkelpunktene og eventuelle interessante fakta eller anekdoter. Tenk på hvordan du kan presentere denne informasjonen på en morsom og engasjerende måte som ville passe for en høykvalitets presentasjon.",
    scratch_pad: `Tenk kreativt på måter å diskutere hovedtemaene og nøkkelpunktene du identifiserte i input-teksten. Vurder å bruke analogier, eksempler, fortellerteknikker eller hypotetiske scenarioer for å gjøre innholdet mer relevant og engasjerende for lytterne.

Husk at podcasten din skal være tilgjengelig for et generelt publikum, så unngå å bruke for mye fagspråk eller anta forkunnskaper om temaet. Om nødvendig, tenk på måter å kort forklare komplekse konsepter på en enkel måte.

Bruk fantasien din til å fylle eventuelle hull i input-teksten eller komme med tankevekkende spørsmål som kan utforskes i podcasten. Målet er å skape en informativ og underholdende dialog, så føl deg fri til å være kreativ i tilnærmingen din.

Definer alle brukte begreper tydelig og bruk tid på å forklare bakgrunnen.

Skriv ned dine brainstorming-ideer og en grov skisse for podcast-dialogen her. Sørg for å notere de viktigste innsiktene og lærdommene du vil gjenta på slutten.

Sørg for å gjøre det morsomt og spennende.`,
    prelude: `Nå som du har brainstormet ideer og laget en grov skisse, er det på tide å skrive den faktiske podcast-dialogen. Sikt mot en naturlig, konversasjonell flyt mellom verten og eventuelle gjestetalere. Inkorporer de beste ideene fra brainstorming-økten din og sørg for å forklare eventuelle komplekse temaer på en lettforståelig måte.`,
    dialog: `Skriv en veldig lang, engasjerende, informativ podcast-dialog her, basert på nøkkelpunktene og de kreative ideene du kom opp med under brainstorming-økten. Bruk en konversasjonell tone og inkluder nødvendig kontekst eller forklaringer for å gjøre innholdet tilgjengelig for et generelt publikum.

Bruk aldri oppdiktede navn for vertene og gjestene, men gjør det til en engasjerende og fordypende opplevelse for lytterne. Ikke inkluder noen plassholdere i klammer som [Vert] eller [Gjest]. Design outputen din for å bli lest høyt -- den vil bli direkte konvertert til lyd.

Gjør dialogen så lang og detaljert som mulig, mens du holder deg til temaet og opprettholder en engasjerende flyt. Sikt mot å bruke din fulle output-kapasitet for å skape den lengste podcast-episoden du kan, mens du fortsatt kommuniserer nøkkelinformasjonen fra input-teksten på en underholdende måte.

På slutten av dialogen, la verten og gjestetalerne naturlig oppsummere hovedinnsiktene og lærdommene fra diskusjonen deres. Dette bør flyte organisk fra samtalen, og gjenta nøkkelpunktene på en uformell, konversasjonell måte. Unngå å få det til å høres ut som en åpenbar oppsummering - målet er å forsterke de sentrale ideene en siste gang før avslutning.`,
  },

  "podcast (Swedish)": {
    intro: `Din uppgift är att ta den givna indatatexten och förvandla den till en livlig, engagerande och informativ poddcastdialog i NPR-stil. Indatatexten kan vara rörig eller ostrukturerad, eftersom den kan komma från olika källor som PDF:er eller webbsidor.

Oroa dig inte för formateringsproblem eller irrelevant information; ditt mål är att extrahera huvudpunkterna, identifiera definitioner och intressanta fakta som kan diskuteras i en poddcast.

Definiera alla använda termer noggrant för en bred publik av lyssnare.`,
    text_instructions: "Först, läs noggrant igenom indatatexten och identifiera huvudämnena, nyckelpunkterna och eventuella intressanta fakta eller anekdoter. Tänk på hur du skulle kunna presentera denna information på ett roligt och engagerande sätt som skulle passa för en högkvalitativ presentation.",
    scratch_pad: `Brainstorma kreativa sätt att diskutera huvudämnena och nyckelpunkterna du identifierade i indatatexten. Överväg att använda analogier, exempel, berättartekniker eller hypotetiska scenarier för att göra innehållet mer relaterbart och engagerande för lyssnarna.

Kom ihåg att din poddcast ska vara tillgänglig för en allmän publik, så undvik att använda för mycket fackspråk eller anta förkunskaper om ämnet. Om nödvändigt, tänk på sätt att kortfattat förklara komplexa koncept på ett enkelt sätt.

Använd din fantasi för att fylla eventuella luckor i indatatexten eller komma med tankeväckande frågor som kan utforskas i poddcasten. Målet är att skapa en informativ och underhållande dialog, så känn dig fri att vara kreativ i din approach.

Definiera alla använda termer tydligt och lägg tid på att förklara bakgrunden.

Skriv ner dina brainstorming-idéer och en grov skiss för poddcastdialogen här. Se till att notera de viktigaste insikterna och lärdomarna du vill upprepa i slutet.

Se till att göra det roligt och spännande.`,
    prelude: `Nu när du har brainstormat idéer och skapat en grov skiss är det dags att skriva den faktiska poddcastdialogen. Sikta på ett naturligt, konversationellt flöde mellan värden och eventuella gästtalare. Införliva de bästa idéerna från din brainstorming-session och se till att förklara eventuella komplexa ämnen på ett lättförståeligt sätt.`,
    dialog: `Skriv en mycket lång, engagerande, informativ poddcastdialog här, baserad på nyckelpunkterna och de kreativa idéerna du kom på under brainstorming-sessionen. Använd en konversationell ton och inkludera nödvändig kontext eller förklaringar för att göra innehållet tillgängligt för en allmän publik.

Använd aldrig påhittade namn för värdarna och gästerna, men gör det till en engagerande och fördjupande upplevelse för lyssnarna. Inkludera inga platshållare i hakparenteser som [Värd] eller [Gäst]. Designa din output för att läsas högt -- den kommer att konverteras direkt till ljud.

Gör dialogen så lång och detaljerad som möjligt, medan du håller dig till ämnet och upprätthåller ett engagerande flöde. Sikta på att använda din fulla outputkapacitet för att skapa det längsta poddcastavsnittet du kan, medan du fortfarande kommunicerar nyckelinformationen från indatatexten på ett underhållande sätt.

I slutet av dialogen, låt värden och gästtalarna naturligt sammanfatta huvudinsikterna och lärdomarna från deras diskussion. Detta bör flyta organiskt från samtalet, och upprepa nyckelpunkterna på ett avslappnat, konversationellt sätt. Undvik att få det att låta som en uppenbar sammanfattning - målet är att förstärka de centrala idéerna en sista gång innan avslutning.`,
  },
  "podcast (Korean)": {
    intro: `주어진 입력 텍스트를 NPR 스타일의 생동감 있고 매력적이며 유익한 팟캐스트 대화로 변환하는 것이 당신의 임무입니다. 입력 텍스트는 PDF나 웹페이지와 같은 다양한 소스에서 올 수 있으므로 혼란스럽거나 구조화되지 않을 수 있습니다.

서식 문제나 관련 없는 정보에 대해 걱정하지 마세요. 당신의 목표는 주요 포인트를 추출하고, 팟캐스트에서 논의될 수 있는 정의와 흥미로운 사실들을 식별하는 것입니다.

폭넓은 청취자를 위해 사용된 모든 용어를 신중하게 정의하세요.`,
    text_instructions: "먼저, 입력 텍스트를 주의 깊게 읽고 주요 주제, 핵심 포인트, 흥미로운 사실이나 일화를 파악하세요. 이 정보를 고품질 프레젠테이션에 적합한 재미있고 매력적인 방식으로 어떻게 제시할 수 있을지 생각해보세요.",
    scratch_pad: `입력 텍스트에서 파악한 주요 주제와 핵심 포인트를 논의할 창의적인 방법을 브레인스토밍하세요. 청취자들이 더 쉽게 공감하고 흥미를 느낄 수 있도록 비유, 예시, 스토리텔링 기법 또는 가상 시나리오 사용을 고려해보세요.

팟캐스트는 일반 대중을 위한 것임을 기억하세요. 전문 용어를 과도하게 사용하거나 주제에 대한 사전 지식을 가정하지 마세요. 필요한 경우, 복잡한 개념을 간단하게 설명하는 방법을 고민해보세요.

입력 텍스트의 빈 부분을 채우거나 팟캐스트에서 탐구할 수 있는 생각을 자극하는 질문을 만들기 위해 상상력을 발휘하세요. 목표는 유익하고 재미있는 대화를 만드는 것이므로 접근 방식에서 창의성을 발휘하세요.

모든 사용된 용어를 명확하게 정의하고 배경 설명에 시간을 할애하세요.

브레인스토밍 아이디어와 팟캐스트 대화의 대략적인 개요를 여기에 작성하세요. 마지막에 반복할 주요 통찰과 교훈을 반드시 기록하세요.

재미있고 흥미진진하게 만드세요.`,
    prelude: `이제 아이디어를 브레인스토밍하고 대략적인 개요를 만들었으니, 실제 팟캐스트 대화를 작성할 시간입니다. 진행자와 게스트 발언자 사이의 자연스럽고 대화체적인 흐름을 목표로 하세요. 브레인스토밍 세션에서 나온 최고의 아이디어를 통합하고 복잡한 주제를 이해하기 쉽게 설명하세요.`,
    dialog: `브레인스토밍 세션에서 도출된 핵심 포인트와 창의적인 아이디어를 바탕으로 매우 긴, 매력적이고 유익한 팟캐스트 대화를 여기에 작성하세요. 대화체 톤을 사용하고 일반 대중이 내용을 이해할 수 있도록 필요한 맥락이나 설명을 포함하세요.

진행자와 게스트를 위해 가상의 이름을 사용하지 마세요. 하지만 청취자들을 위해 매력적이고 몰입감 있는 경험을 만드세요. [진행자] 또는 [게스트]와 같은 대괄호 안의 자리 표시자를 포함하지 마세요. 소리 내어 읽히도록 출력을 설계하세요 -- 직접 오디오로 변환될 것입니다.

주제에 충실하고 매력적인 흐름을 유지하면서 대화를 최대한 길고 상세하게 만드세요. 입력 텍스트의 핵심 정보를 재미있게 전달하면서 가능한 가장 긴 팟캐스트 에피소드를 만들기 위해 출력 용량을 최대한 활용하세요.

대화 마지막에, 진행자와 게스트 발언자가 자연스럽게 토론의 주요 통찰과 교훈을 요약하도록 하세요. 이는 대화에서 자연스럽게 흘러나와야 하며, 핵심 포인트를 편안하고 대화체적인 방식으로 반복해야 합니다. 명백한 요약처럼 들리지 않도록 하세요 - 목표는 마무리하기 전에 핵심 아이디어를 마지막으로 한 번 더 강조하는 것입니다.`,
  },

  "podcast (Japanese)": {
    intro: `与えられた入力テキストをNPRスタイルの活気に満ちた、魅力的で有益なポッドキャストの対話に変換することがあなたの任務です。入力テキストはPDFやウェブページなどの様々なソースから来る可能性があるため、混乱していたり構造化されていない可能性があります。

フォーマットの問題や無関係な情報について心配する必要はありません。あなたの目標は、主要なポイントを抽出し、ポッドキャストで議論できる定義や興味深い事実を特定することです。

幅広いリスナーのために使用される全ての用語を慎重に定義してください。`,
    text_instructions: "まず、入力テキストを注意深く読み、主要なテーマ、キーポイント、興味深い事実やエピソードを特定してください。この情報を高品質なプレゼンテーションに相応しい、楽しく魅力的な方法でどのように提示できるか考えてください。",
    scratch_pad: `入力テキストで特定した主要なテーマとキーポイントを議論する創造的な方法をブレインストーミングしてください。リスナーがより共感し、興味を持てるように、比喩、例示、ストーリーテリング技法、または仮想シナリオの使用を検討してください。

ポッドキャストは一般大衆向けであることを忘れないでください。専門用語を過度に使用したり、テーマに関する事前知識を前提としないでください。必要な場合は、複雑な概念を簡単に説明する方法を考えてください。

入力テキストの空白部分を埋めたり、ポッドキャストで探求できる思考を刺激する質問を作るために想像力を発揮してください。目標は有益で楽しい対話を作ることなので、アプローチに創造性を発揮してください。

使用される全ての用語を明確に定義し、背景説明に時間を割いてください。

ブレインストーミングのアイデアとポッドキャスト対話の大まかな概要をここに書き出してください。最後に繰り返す主要な洞察と教訓を必ず記録してください。

楽しく興味深いものにしてください。`,
    prelude: `アイデアをブレインストーミングし、大まかな概要を作成したので、実際のポッドキャスト対話を書く時間です。ホストとゲストスピーカーの間の自然で会話的な流れを目指してください。ブレインストーミングセッションから得られた最高のアイデアを組み込み、複雑なテーマを理解しやすく説明してください。`,
    dialog: `ブレインストーミングセッションで導き出されたキーポイントと創造的なアイデアに基づいて、非常に長く、魅力的で有益なポッドキャスト対話をここに書いてください。会話調のトーンを使用し、一般大衆が内容を理解できるように必要な文脈や説明を含めてください。

ホストとゲストのために架空の名前を使用しないでください。しかし、リスナーのために魅力的で没入感のある体験を作ってください。[ホスト]や[ゲスト]のような角括弧内のプレースホルダーを含めないでください。音声として読み上げられることを想定して出力を設計してください -- 直接音声に変換されます。

テーマに忠実で魅力的な流れを維持しながら、対話を可能な限り長く詳細にしてください。入力テキストの核心的な情報を楽しく伝えながら、可能な限り長いポッドキャストエピソードを作るために出力容量を最大限活用してください。

対話の最後に、ホストとゲストスピーカーが自然に議論の主要な洞察と教訓をまとめるようにしてください。これは会話から自然に流れ出るべきで、キーポイントをカジュアルで会話的な方法で繰り返すべきです。明白なまとめのように聞こえないようにしてください - 目標は締めくくる前に核心的なアイデアを最後にもう一度強調することです。`,
  },
  "podcast (Italian)": {
    intro: `Il tuo compito è trasformare il testo di input in un dialogo podcast vivace e coinvolgente in stile NPR. Poiché il testo di input può provenire da varie fonti come PDF o pagine web, potrebbe essere disorganizzato o non strutturato.

Non preoccuparti dei problemi di formattazione o delle informazioni irrilevanti. Il tuo obiettivo è estrarre i punti principali e identificare definizioni e fatti interessanti da discutere nel podcast.

Definisci attentamente tutti i termini utilizzati per un pubblico ampio.`,
    text_instructions: "Prima, leggi attentamente il testo di input e identifica i temi principali, i punti chiave, i fatti interessanti o gli aneddoti. Pensa a come presentare queste informazioni in modo divertente e coinvolgente, adatto a una presentazione di alta qualità.",
    scratch_pad: `Fai un brainstorming di modi creativi per discutere i temi principali e i punti chiave identificati nel testo di input. Considera l'uso di metafore, esempi, tecniche di storytelling o scenari ipotetici per rendere il contenuto più relatable e interessante per gli ascoltatori.

Ricorda che il podcast è per il pubblico generale. Non usare troppi termini tecnici o presumere conoscenze pregresse sull'argomento. Se necessario, pensa a come spiegare concetti complessi in modo semplice.

Usa la tua immaginazione per colmare eventuali lacune nel testo di input o creare domande stimolanti da esplorare nel podcast. L'obiettivo è creare una conversazione informativa e divertente, quindi sii creativo nel tuo approccio.

Definisci chiaramente tutti i termini utilizzati e dedica tempo alla spiegazione del contesto.

Scrivi qui le tue idee dal brainstorming e una bozza della struttura del dialogo podcast. Assicurati di annotare le principali intuizioni e lezioni da ripetere alla fine.

Rendilo divertente e interessante.`,
    prelude: `Ora che hai fatto il brainstorming delle idee e creato una bozza della struttura, è tempo di scrivere il dialogo effettivo del podcast. Punta a un flusso naturale e conversazionale tra host e ospite. Incorpora le migliori idee dalla sessione di brainstorming e spiega i temi complessi in modo accessibile.`,
    dialog: `Scrivi qui un dialogo podcast molto lungo, coinvolgente e informativo basato sui punti chiave e le idee creative emerse dalla sessione di brainstorming. Usa un tono conversazionale e includi il contesto o le spiegazioni necessarie affinché il pubblico generale possa comprendere il contenuto.

Non usare nomi fittizi per host e ospite, ma crea un'esperienza coinvolgente e immersiva per gli ascoltatori. Non includere segnaposto tra parentesi quadre come [host] o [ospite]. Progetta l'output per essere letto ad alta voce -- sarà convertito direttamente in audio.

Rendi il dialogo il più lungo e dettagliato possibile mantenendo la fedeltà al tema e un flusso coinvolgente. Sfrutta al massimo la capacità di output per creare l'episodio podcast più lungo possibile mentre comunichi le informazioni chiave dal testo di input in modo divertente.

Alla fine del dialogo, fai in modo che host e ospite riassumano naturalmente le principali intuizioni e lezioni dalla discussione. Questo dovrebbe fluire naturalmente dalla conversazione e ripetere i punti chiave in modo casual e conversazionale. Non farlo sembrare un riassunto ovvio - l'obiettivo è enfatizzare le idee chiave un'ultima volta prima di concludere.`,
  },

  "podcast (Dutch)": {
    intro: `Je taak is om de invoertekst om te zetten in een levendig, boeiend NPR-stijl podcast gesprek. Omdat de invoertekst uit verschillende bronnen kan komen zoals PDF's of webpagina's, kan deze rommelig of ongestructureerd zijn.

Maak je geen zorgen over opmaakproblemen of irrelevante informatie. Je doel is om de hoofdpunten te extraheren en definities en interessante feiten te identificeren om te bespreken in de podcast.

Definieer zorgvuldig alle gebruikte termen voor een breed publiek.`,
    text_instructions: "Lees eerst de invoertekst zorgvuldig en identificeer de hoofdthema's, kernpunten, interessante feiten of anekdotes. Bedenk hoe je deze informatie op een leuke en boeiende manier kunt presenteren die past bij een hoogwaardige presentatie.",
    scratch_pad: `Brainstorm over creatieve manieren om de hoofdthema's en kernpunten uit de invoertekst te bespreken. Overweeg het gebruik van metaforen, voorbeelden, storytelling-technieken of hypothetische scenario's om de inhoud herkenbaarder en interessanter te maken voor luisteraars.

Onthoud dat de podcast voor het algemene publiek is. Gebruik niet te veel vaktermen of ga niet uit van voorkennis over het onderwerp. Bedenk indien nodig hoe je complexe concepten eenvoudig kunt uitleggen.

Gebruik je verbeelding om eventuele hiaten in de invoertekst op te vullen of om prikkelende vragen te creëren die in de podcast kunnen worden verkend. Het doel is om een informatief en leuk gesprek te creëren, dus wees creatief in je aanpak.

Definieer alle gebruikte termen duidelijk en neem de tijd voor context.

Schrijf hier je brainstormideeën en een ruwe schets van de podcast dialoog. Zorg ervoor dat je de belangrijkste inzichten en lessen noteert om aan het einde te herhalen.

Maak het leuk en interessant.`,
    prelude: `Nu je hebt gebrainstormd over ideeën en een ruwe schets hebt gemaakt, is het tijd om de daadwerkelijke podcast dialoog te schrijven. Streef naar een natuurlijke, conversationele flow tussen host en gast. Verwerk de beste ideeën uit de brainstormsessie en leg complexe thema's toegankelijk uit.`,
    dialog: `Schrijf hier een zeer lange, boeiende en informatieve podcast dialoog gebaseerd op de kernpunten en creatieve ideeën uit de brainstormsessie. Gebruik een conversationele toon en voeg context of uitleg toe waar nodig zodat het algemene publiek de inhoud kan begrijpen.

Gebruik geen fictieve namen voor host en gast, maar creëer wel een boeiende en meeslepende ervaring voor luisteraars. Gebruik geen plaatshouders tussen vierkante haken zoals [host] of [gast]. Ontwerp de output om hardop te worden voorgelezen -- het zal direct worden omgezet in audio.

Maak de dialoog zo lang en gedetailleerd mogelijk terwijl je trouw blijft aan het thema en een boeiende flow behoudt. Benut de outputcapaciteit maximaal om de langst mogelijke podcast aflevering te maken terwijl je de kerninformatie uit de invoertekst op een leuke manier overbrengt.

Laat aan het einde van de dialoog de host en gast op natuurlijke wijze de belangrijkste inzichten en lessen uit de discussie samenvatten. Dit moet natuurlijk voortvloeien uit het gesprek en de kernpunten herhalen op een casual, conversationele manier. Laat het niet klinken als een voor de hand liggende samenvatting - het doel is om de kernideeën nog één laatste keer te benadrukken voordat je afsluit.`,
  },

  "podcast (Russian)": {
    intro: `Ваша задача - преобразовать входной текст в живой, увлекательный подкаст-диалог в стиле NPR. Поскольку входной текст может поступать из различных источников, таких как PDF или веб-страницы, он может быть неорганизованным или неструктурированным.

Не беспокойтесь о проблемах форматирования или нерелевантной информации. Ваша цель - извлечь основные моменты и определить определения и интересные факты для обсуждения в подкасте.

Тщательно определяйте все используемые термины для широкой аудитории.`,
    text_instructions: "Сначала внимательно прочитайте входной текст и определите основные темы, ключевые моменты, интересные факты или анекдоты. Подумайте, как представить эту информацию веселым и увлекательным способом, подходящим для качественной презентации.",
    scratch_pad: `Проведите мозговой штурм креативных способов обсуждения основных тем и ключевых моментов, определенных во входном тексте. Рассмотрите использование метафор, примеров, приемов сторителлинга или гипотетических сценариев, чтобы сделать контент более близким и интересным для слушателей.

Помните, что подкаст предназначен для широкой публики. Не используйте слишком много технических терминов и не предполагайте предварительных знаний по теме. При необходимости подумайте, как объяснить сложные концепции простым языком.

Используйте воображение, чтобы заполнить любые пробелы во входном тексте или создать стимулирующие вопросы для исследования в подкасте. Цель - создать информативную и веселую беседу, поэтому будьте креативны в своем подходе.

Четко определяйте все используемые термины и уделяйте время объяснению контекста.

Запишите здесь свои идеи из мозгового штурма и черновой набросок диалога подкаста. Обязательно отметьте основные выводы и уроки для повторения в конце.

Сделайте это веселым и интересным.`,
    prelude: `Теперь, когда вы провели мозговой штурм идей и создали черновой набросок, пришло время написать фактический диалог подкаста. Стремитесь к естественному, разговорному потоку между ведущим и гостем. Включите лучшие идеи из сессии мозгового штурма и объясните сложные темы доступным способом.`,
    dialog: `Напишите здесь очень длинный, увлекательный и информативный диалог подкаста, основанный на ключевых моментах и креативных идеях из сессии мозгового штурма. Используйте разговорный тон и включайте контекст или объяснения, необходимые для понимания содержания широкой публикой.

Не используйте вымышленные имена для ведущего и гостя, но создайте увлекательный и иммерсивный опыт для слушателей. Не включайте заполнители в квадратных скобках, такие как [ведущий] или [гость]. Разрабатывайте вывод для чтения вслух -- он будет напрямую преобразован в аудио.

Сделайте диалог максимально длинным и детальным, сохраняя верность теме и увлекательный поток. Максимально используйте возможности вывода, чтобы создать самый длинный возможный эпизод подкаста, передавая ключевую информацию из входного текста веселым способом.

В конце диалога пусть ведущий и гость естественным образом подведут итоги основных выводов и уроков из обсуждения. Это должно естественно вытекать из разговора и повторять ключевые моменты в непринужденной, разговорной манере. Не делайте это похожим на очевидное резюме - цель состоит в том, чтобы подчеркнуть ключевые идеи в последний раз перед завершением.`,
  },
  "podcast (Polish)": {
    intro: `Twoim zadaniem jest przekształcenie dostarczonego tekstu wejściowego w żywy, wciągający i pouczający dialog podcastowy w stylu NPR. Tekst wejściowy może być nieuporządkowany lub niestrukturyzowany, ponieważ może pochodzić z różnych źródeł, takich jak pliki PDF czy strony internetowe.

Nie przejmuj się problemami z formatowaniem ani nieistotnymi informacjami; Twoim celem jest wyodrębnienie kluczowych punktów oraz zidentyfikowanie definicji i ciekawych faktów, które można omówić w podcaście.

Dokładnie zdefiniuj wszystkie używane terminy dla szerokiej publiczności.`,
    text_instructions: "Najpierw uważnie przeczytaj tekst wejściowy i zidentyfikuj główne tematy, kluczowe punkty oraz wszelkie interesujące fakty lub anegdoty. Zastanów się, jak przedstawić te informacje w zabawny i angażujący sposób odpowiedni dla wysokiej jakości prezentacji.",
    scratch_pad: `Przeprowadź burzę mózgów na temat kreatywnych sposobów omówienia głównych tematów i kluczowych punktów, które zidentyfikowałeś w tekście wejściowym. Rozważ użycie analogii, przykładów, technik opowiadania historii lub hipotetycznych scenariuszy, aby uczynić treść bardziej istotną i interesującą dla słuchaczy.

Pamiętaj, że Twój podcast jest przeznaczony dla ogólnej publiczności, więc unikaj nadmiernego żargonu lub założeń o wcześniejszej znajomości tematu. W razie potrzeby zastanów się, jak zwięźle wyjaśnić wszelkie złożone koncepcje prostymi terminami.

Użyj wyobraźni, aby wypełnić wszelkie luki w tekście wejściowym lub wymyślić prowokujące do myślenia pytania do zbadania w podcaście. Celem jest stworzenie pouczającej i zabawnej rozmowy, więc bądź kreatywny w swoim podejściu.

Jasno zdefiniuj wszystkie używane terminy i poświęć czas na wyjaśnienie kontekstu.

Zapisz tutaj swoje pomysły z burzy mózgów i szkic dialogu podcastowego. Pamiętaj, aby zanotować kluczowe spostrzeżenia i wnioski do powtórzenia na końcu.

Spraw, aby było to zabawne i interesujące.`,
    prelude: `Teraz, gdy przeprowadziłeś burzę mózgów i stworzyłeś szkic, czas napisać właściwy dialog podcastu. Dąż do naturalnego, konwersacyjnego przepływu między gospodarzem a gościem. Włącz najlepsze pomysły z sesji burzy mózgów i upewnij się, że wyjaśniasz wszelkie złożone tematy w przystępny sposób.`,
    dialog: `Napisz tutaj bardzo długi, wciągający i pouczający dialog podcastowy, oparty na kluczowych punktach i kreatywnych pomysłach z sesji burzy mózgów. Użyj konwersacyjnego tonu i dołącz wszelki niezbędny kontekst lub wyjaśnienia, aby treść była zrozumiała dla ogólnej publiczności.

Nie używaj fikcyjnych imion dla gospodarza i gościa, ale stwórz wciągające i immersyjne doświadczenie dla słuchaczy. Nie używaj znaczników zastępczych w nawiasach kwadratowych, takich jak [gospodarz] lub [gość]. Zaprojektuj swój tekst do czytania na głos – zostanie on bezpośrednio przekonwertowany na audio.

Uczyń dialog jak najdłuższym i szczegółowym, pozostając w temacie i utrzymując wciągający przepływ. Wykorzystaj maksymalnie swoją zdolność produkcji, aby stworzyć najdłuższy możliwy odcinek podcastu, jednocześnie przekazując kluczowe informacje z tekstu wejściowego w zabawny sposób.

Na końcu dialogu gospodarz i gość powinni naturalnie podsumować główne spostrzeżenia i wnioski z ich dyskusji. Powinno to naturalnie wypływać z rozmowy, powtarzając kluczowe punkty w swobodny, konwersacyjny sposób. Unikaj brzmienia jak oczywiste podsumowanie – celem jest wzmocnienie głównych idei po raz ostatni przed zakończeniem.`
  },
    "podcast (Irish)": {
        intro: `Is é do thasc ná an téacs ionchuir a sholáthraítear a thiontú ina chomhrá podchraolta bríomhar, tarraingteach agus oideachasúil i stíl NPR. D'fhéadfadh an téacs ionchuir a bheith mí-eagraithe nó neamhstruchtúrtha mar d'fhéadfadh sé teacht ó fhoinsí éagsúla cosúil le comhaid PDF nó leathanaigh ghréasáin.

Ná bíodh imní ort faoi fhadhbanna formáidithe nó faisnéis neamhábhartha; is é do chuspóir na príomhphointí a bhaint amach agus sainmhínithe agus fíricí suimiúla a aithint le plé sa phodchraoladh.

Sainmhínigh go cúramach gach téarma a úsáidtear do lucht féachana leathan.`,
        text_instructions: "Ar dtús, léigh an téacs ionchuir go cúramach agus aithin na príomhthéamaí, na príomhphointí, agus aon fhíricí nó anecdotes suimiúla. Smaoinigh ar conas an fhaisnéis seo a chur i láthair ar bhealach spraíúil agus tarraingteach atá oiriúnach do chur i láthair ardchaighdeáin.",
        scratch_pad: `Déan brainstorming ar bhealaí cruthaitheacha chun na príomhthéamaí agus na príomhphointí a d'aithin tú sa téacs ionchuir a phlé. Déan machnamh ar úsáid a bhaint as meafair, samplaí, teicnící scéalaíochta nó cásanna hipitéiseacha chun an t-ábhar a dhéanamh níos ábhartha agus níos suimiúla do lucht éisteachta.

Cuimhnigh go bhfuil do phodchraoladh dírithe ar lucht féachana ginearálta, mar sin seachain an iomarca béarlagair nó toimhdí faoi eolas roimh ré ar an ábhar. Nuair is gá, smaoinigh ar choincheapa casta a mhíniú go gonta i dtéarmaí simplí.

Úsáid do shamhlaíocht chun aon bhearnaí sa téacs ionchuir a líonadh nó ceisteanna spreagúla a cheapadh le hiniúchadh sa phodchraoladh. Is é an aidhm comhrá oideachasúil agus spraíúil a chruthú, mar sin bí cruthaitheach i do chur chuige.

Sainmhínigh go soiléir gach téarma a úsáidtear agus tabhair am chun comhthéacs a mhíniú.

Scríobh do smaointe brainstorming agus dréacht den dialóg podchraolta anseo. Bí cinnte na príomhléargais agus ceachtanna a thabhairt faoi deara le haghaidh athbhreithnithe ag an deireadh.

Déan é spraíúil agus suimiúil.`,
        prelude: `Anois go bhfuil brainstorming déanta agat agus dréacht cruthaithe agat, tá sé in am an dialóg podchraolta iarbhír a scríobh. Déan iarracht sreabhadh nádúrtha comhrá a bhaint amach idir an t-óstach agus an t-aoi. Cuir na smaointe is fearr ó do sheisiún brainstorming san áireamh agus cinntigh go míníonn tú aon ábhair chasta ar bhealach inrochtana.`,
        dialog: `Scríobh dialóg podchraolta an-fhada, tarraingteach agus oideachasúil anseo, bunaithe ar na príomhphointí agus na smaointe cruthaitheacha ó do sheisiún brainstorming. Úsáid tón comhrá agus cuir san áireamh aon chomhthéacs nó mínithe riachtanacha chun an t-ábhar a dhéanamh sothuigthe do lucht féachana ginearálta.

Ná húsáid ainmneacha bréige don óstach agus don aoi, ach cruthaigh eispéireas tarraingteach agus tumthach do lucht éisteachta. Ná húsáid sealbhóirí áite i lúibíní cearnógacha mar [óstach] nó [aoi]. Dearaigh do aschur le haghaidh léitheoireachta os ard - tiontófar go díreach é go fuaim.

Déan an dialóg chomh fada agus chomh mionsonraithe agus is féidir, ag fanacht dírithe ar an ábhar agus ag coinneáil sreabhadh tarraingteach. Úsáid do chumas aschuir go hiomlán chun an t-eipeasóid podchraolta is faide is féidir a chruthú agus ag an am céanna an fhaisnéis thábhachtach ón téacs ionchuir a sheachadadh ar bhealach spraíúil.

Ag deireadh na dialóige, ba chóir don óstach agus don aoi na príomhléargais agus ceachtanna óna bplé a achoimriú go nádúrtha. Ba chóir dó seo teacht go nádúrtha ón gcomhrá, ag athrá na bpríomhphointí ar bhealach neamhfhoirmiúil, comhrá. Seachain é a bheith cosúil le hachoimre shoiléir - is é an aidhm ná na príomhsmaointe a threisiú den uair dheireanach sula gcríochnaíonn tú.`
    },
    "podcast (Danish)": {
        intro: `Din opgave er at omdanne den leverede inputtekst til en livlig, engagerende og lærerig podcast-dialog i NPR-stil. Inputteksten kan være uorganiseret eller ustruktureret, da den kan komme fra forskellige kilder som PDF-filer eller websider.

Bekymr dig ikke om formateringsproblemer eller irrelevant information; dit mål er at uddrage nøglepunkterne og identificere definitioner og interessante fakta til diskussion i podcasten.

Definer omhyggeligt alle anvendte termer for et bredt publikum.`,
        text_instructions: "Læs først inputteksten omhyggeligt og identificer hovedtemaer, nøglepunkter og eventuelle interessante fakta eller anekdoter. Overvej, hvordan du kan præsentere disse oplysninger på en sjov og engagerende måde, der er passende for en højkvalitetspræsentation.",
        scratch_pad: `Brainstorm kreative måder at diskutere hovedtemaerne og nøglepunkterne, du har identificeret i inputteksten. Overvej at bruge metaforer, eksempler, historiefortællingsteknikker eller hypotetiske scenarier for at gøre indholdet mere relevant og interessant for lytterne.

Husk, at din podcast er rettet mod et generelt publikum, så undgå overdreven jargon eller antagelser om forhåndskendskab til emnet. Overvej, når det er nødvendigt, hvordan du kan forklare komplekse koncepter kortfattet i simple termer.

Brug din fantasi til at udfylde eventuelle huller i inputteksten eller udtænke tankevækkende spørgsmål til udforskning i podcasten. Målet er at skabe en lærerig og sjov samtale, så vær kreativ i din tilgang.

Definer klart alle anvendte termer og tag dig tid til at forklare kontekst.

Skriv dine brainstorming-ideer og et udkast til podcast-dialogen her. Sørg for at notere nøgleindsigter og lektioner til gentagelse i slutningen.

Gør det sjovt og interessant.`,
        prelude: `Nu hvor du har brainstormet og skabt et udkast, er det tid til at skrive den faktiske podcast-dialog. Stræb efter en naturlig, konversationel strøm mellem vært og gæst. Inkluder de bedste ideer fra din brainstorming-session og sørg for at forklare eventuelle komplekse emner på en tilgængelig måde.`,
        dialog: `Skriv en meget lang, engagerende og lærerig podcast-dialog her, baseret på nøglepunkterne og de kreative ideer fra din brainstorming-session. Brug en konversationel tone og inkluder enhver nødvendig kontekst eller forklaringer for at gøre indholdet forståeligt for et generelt publikum.

Brug ikke fiktive navne til værten og gæsten, men skab en engagerende og fordybende oplevelse for lytterne. Brug ikke pladsholdere i firkantede parenteser som [vært] eller [gæst]. Design dit output til højtlæsning - det vil blive direkte konverteret til lyd.

Gør dialogen så lang og detaljeret som muligt, mens du holder dig fokuseret på emnet og opretholder et engagerende flow. Maksimer din outputkapacitet for at skabe den længst mulige podcast-episode, mens du formidler de vigtige oplysninger fra inputteksten på en sjov måde.

I slutningen af dialogen bør værten og gæsten naturligt opsummere hovedindsigterne og lektionerne fra deres diskussion. Dette bør flyde naturligt fra samtalen og gentage nøglepunkterne på en afslappet, konversationel måde. Undgå at det lyder som en åbenlys opsummering - målet er at forstærke hovedideerne en sidste gang før afslutningen.`
    },

  
    // Add other templates here...
};

interface DialogueItem {
  text: string;
  speaker: 'speaker-1' | 'speaker-2';
}

interface Dialogue {
  scratchpad: string;
  dialogue: DialogueItem[];
}

// Add this function near the top with other helper functions
async function generateTitleAndDescription(prompt: string, dialogue: string): Promise<{title: string, description: string}> {
  const messages = [
    {
      role: "system",
      content: "You are a podcast metadata expert. Your task is to generate an engaging title and description based on the content provided."
    },
    {
      role: "user",
      content: `Please generate a concise, engaging title (max 100 characters) and a compelling description (max 500 characters) for a podcast with the following content:

Original prompt:
${prompt}

Generated dialogue excerpt:
${dialogue.substring(0, 1000)}

Format your response exactly as follows:
Title: [your title here]
Description: [your description here]`
    }
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('Failed to generate title and description');
  }

  // Parse the response
  const titleMatch = content.match(/Title: (.*)/);
  const descriptionMatch = content.match(/Description: (.*)/);

  return {
    title: (titleMatch?.[1] || prompt.substring(0, 100)).trim(),
    description: (descriptionMatch?.[1] || prompt.substring(0, 500)).trim()
  };
}

async function generateDialogue(userId: string, subscriptionTier: string, prompt: string, podcastLength: number, instructionTemplate: string, textModel: string): Promise<Dialogue> {
  
  
  const template = INSTRUCTION_TEMPLATES[instructionTemplate] || INSTRUCTION_TEMPLATES.podcast;

  // template instructions with the input text by the user
  const messages = 
  [
    { role: "system", content: template.intro },

    { role: "user", content: `Here is the original input text:
      <input_text>
      ${prompt}
      </input_text>
      ${template.text_instructions}` },

      { role: "user", content: `<scratchpad>
      ${template.scratch_pad}
      </scratchpad>` },

      { role: "user", content: `<prelude_dialog>
      ${template.prelude}
      </prelude_dialog>` },

      { role: "user", content: `<podcast_dialogue>
        ${template.dialog}
        </podcast_dialogue>` },

        { role: "user", content: `<podcast_length>
          The podcast should have no more than ${podcastLength} words.
          </podcast_length>` },
        ];

  // Generate the DIALOGUE content
  const contentResponse = await openai.chat.completions.create({
    model: ['o1-mini-2024-09-12', 'o1-mini', 'o1-preview', 'chatgpt-4o-latest', 'gpt-4-turbo'].includes(textModel) 
      ? 'gpt-4o' 
      : textModel,
    messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  });

  const generatedContent = contentResponse.choices[0].message.content;

  if (!generatedContent) {
    throw new Error('Failed to generate content');
  }

  // Parse the generated content into the Dialogue structure
  const [scratchpad, ...dialogueLines] = generatedContent.split('\n\n');
  const dialogue = dialogueLines.map((line, index) => ({
    text: line,
    speaker: (index % 2 === 0 ? 'speaker-1' : 'speaker-2') as 'speaker-1' | 'speaker-2'
  }));

  

  return { scratchpad, dialogue };
}

async function generateAudioForLine(text: string, voice: string, audioModel: string, subscriptionTier?: string): Promise<Buffer> {
  try {
    console.log(`Generating audio for text: "${text.substring(0, 50)}..."`);
    console.log(`Using voice: ${voice}, model: ${audioModel}`);

    if (audioModel === 'WorldSpeak' || audioModel === 'WorldSpeak Pro') {
      return await elevenLabsSemaphore.acquire().then(async ([_, release]) => {
        try {
          const response = await elevenlabs.voices.getAll({}, {
            maxRetries: 5
          });
          console.log(response);
          
          // Choose model based on subscription tier and audioModel
          const model_id = (subscriptionTier === 'Professional' || subscriptionTier === 'Enterprise') && audioModel === 'WorldSpeak Pro'
            ? "eleven_multilingual_v2"   // eleven_multilingual_v2
            : "eleven_turbo_v2_5";

          const audio = await elevenlabs.generate({
            voice: voice,
            text: text,
            model_id: model_id,
            // voice_settings: {
            //   stability: 0.7
            // }
          });
          
          const chunks: Buffer[] = [];
          for await (const chunk of audio) {
            chunks.push(Buffer.from(chunk));
          }
          return Buffer.concat(chunks);
        } finally {
          release(); // Always release the semaphore
        }
      });
    } else {
      const mp3 = await openai.audio.speech.create({
        model: audioModel === 'Standard' ? 'tts-1' : 'tts-1-hd',
        voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
        input: text,
      });

      return Buffer.from(await mp3.arrayBuffer());
    }
  } catch (error) {
    console.error('Error generating audio:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

function splitTextIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let index = 0;
  while (index < text.length) {
    chunks.push(text.slice(index, index + chunkSize));
    index += chunkSize;
  }
  return chunks;
}

export async function POST(request: Request) {
  try {
    let currentCount;
    const { userId, subscriptionTier, prompt, audioModel, speaker1Voice, speaker2Voice, instructionTemplate, textModel, podcastLength, isDirectScriptReading, isPublic } = await request.json();
    
    // 根据订阅等级设置生成限制
    const limit = 
        subscriptionTier === 'Trial' ? 8 : 
        subscriptionTier === 'Hobby' ? 40 : 
        subscriptionTier === 'Freelancer' ? 70 : 
        subscriptionTier === 'Professional' ? 100 :
        150;

    // 前端已经限制了未登录用户
    if (userId) {
      // 已登录用户的现有验证逻辑
      const { data, error } = await supabase
        .from('podcast_generation_counts')
        .select('count')
        .eq('user_id', userId)
        .single();

      currentCount = data?.count || 0;

        // 更新生成计数
      const hasReset = await updateGenerationCount(userId, currentCount, limit);

      if (hasReset) {   
        // 更新生成计数后，重新获取当前计数
        const { data, error } = await supabase
        .from('podcast_generation_counts')
        .select('count')
        .eq('user_id', userId)
        .single();

      currentCount = data?.count || 0;
      }
    
      
      if (currentCount >= limit) {
        throw new Error('Monthly/Trial podcast generation limit reached');
      }
    }

    let dialogue;
    if (isDirectScriptReading) {
      if (prompt.trim().toLowerCase().startsWith('speaker-1:')) {
        // 按换行符分割文本，并过滤掉空行
        const lines = prompt.split('\n').filter((line: string) => line.trim());
        
        // 将每行转换为对话对象
        const dialogueItems = lines.map((line: string) => {
          // 移除开头的 speaker 标记并清理空格
          const cleanedLine = line.replace(/^speaker-[12]:\s*/i, '').trim();
          // 如果清理后的行不为空，则添加到对话中
          if (cleanedLine) {
            return {
              text: cleanedLine,
              // 检查原始行是否以 speaker-2 开头来决定说话者
              speaker: line.trim().toLowerCase().startsWith('speaker-2') ? 'speaker-2' : 'speaker-1'
            };
          }
        }).filter(Boolean); // 过滤掉 undefined 项
    
        dialogue = {
          dialogue: dialogueItems
        };
      } else {
        // 原有的功能：将文本分块并由单个说话者朗读
        const chunks = splitTextIntoChunks(prompt, 2000);
        dialogue = {
          dialogue: chunks.map(chunk => ({ text: chunk, speaker: 'speaker-1' }))
        };
      }
    } else {
      // 原有的 AI 生成对话功能
      dialogue = await generateDialogue(userId, subscriptionTier, prompt, podcastLength, instructionTemplate, textModel);
    }

    // Check text length limits based on subscription tier
    const totalCharacters = dialogue.dialogue.reduce((acc: number, line: { text: string }) => acc + line.text.length, 0);
    
    const charLimit = 
      subscriptionTier === 'Trial' ? 3000 :
      subscriptionTier === 'Hobby' ? 3000 :
      subscriptionTier === 'Freelancer' ? 10000 :
      subscriptionTier === 'Professional' ? 20000 :
      30000; // Enterprise tier
    
    if (totalCharacters > charLimit) {
      throw new Error(
        `Text length (${totalCharacters} characters) exceeds the limit for your ${subscriptionTier} tier (${charLimit} characters). ` +
        `Please reduce the length of your text or upgrade your subscription.`
      );
    }

    // Generate audio for each line of dialogue in parallel
    const audioPromises = dialogue.dialogue.map((line: { text: string; speaker: string }) => 
      generateAudioForLine(line.text, line.speaker === 'speaker-1' ? speaker1Voice : speaker2Voice, audioModel)
    );

    const audioBuffers = await Promise.all(audioPromises);

    // Combine audio buffers
    const combinedBuffer = Buffer.concat(audioBuffers);

    // Generate unique filenames
    const slug = Date.now()
    const audioFilename = `podcast-${slug}.mp3`;
    const subtitlesFilename = `subtitles-${slug}.json`;

    // Upload the audio file to R2 Storage
    try {
      // Upload audio file to R2
      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET_PODCASTS,
        Key: audioFilename,
        Body: combinedBuffer,
        ContentType: 'audio/mp3',
      }));

      // Upload subtitles file to R2
      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET_PODCASTS,
        Key: subtitlesFilename,
        Body: JSON.stringify(dialogue.dialogue),
        ContentType: 'application/json',
      }));

      // Generate public URLs
      const audioUrl = `${R2_PUBLIC_URL_PODCASTS}/${audioFilename}`;
      const subtitlesUrl = `${R2_PUBLIC_URL_PODCASTS}/${subtitlesFilename}`;

    // Generate title and description
    const { title, description } = await generateTitleAndDescription(
      prompt, 
      dialogue.dialogue.map((d: { text: string }) => d.text).join(' ')
    );

    // Insert the podcast information into the user_podcasts table
    const { data: podcastData, error: podcastError } = await supabase
      .from('user_podcasts')
      .insert({
        user_id: userId,
        audio_url: audioUrl,
        subtitles_url: subtitlesUrl,
        title,
        description,
        slug: slug,
        is_public: isPublic
      })
      .select()
      .single();

    if (podcastError) {
      console.error('Error inserting podcast data:', podcastError);
      // You might want to handle this error, but for now, we'll continue
    }
    
      return NextResponse.json({ 
        audioUrl: audioUrl, 
        subtitlesUrl: subtitlesUrl, 
        transcript: dialogue.dialogue,
        slug: slug,
        title: title,
      });
    } catch (error) {
      console.error('Error uploading to R2:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error generating podcast:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}

export const runtime = 'edge';
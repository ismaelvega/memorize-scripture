import OpenAI from 'openai';

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
  
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export class WhisperService {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    if (!apiKey && typeof window === 'undefined') {
      // Server-side: expect API key from environment
      apiKey = process.env.OPENAI_API_KEY;
    }
    
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({
      apiKey,
      // Only set dangerouslyAllowBrowser for client-side usage
      // In practice, we'll use this server-side via API routes
      dangerouslyAllowBrowser: typeof window !== 'undefined'
    });
  }

  /**
   * Transcribe audio using OpenAI Whisper API
   */
  async transcribe(
    audioFile: File | Blob, 
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    try {
      const {
        language = 'en',
        prompt,
        responseFormat = 'verbose_json',
        temperature = 0
      } = options;

      // Always clean up and recreate the file for OpenAI compatibility
      const extension = this.getFileExtensionFromBlob(audioFile);
      const fileName = `recording.${extension}`;
      
      // Clean up MIME type for OpenAI compatibility
      let mimeType = audioFile.type;
      // Remove codec information that OpenAI might not like
      if (mimeType.includes(';')) {
        mimeType = mimeType.split(';')[0];
      }
      if (!mimeType || mimeType === 'audio/wav') {
        mimeType = extension === 'webm' ? 'audio/webm' : 'audio/wav';
      }
      
      console.log('Creating file for OpenAI:', { fileName, mimeType, originalType: audioFile.type });
      
      // Always create a new File with cleaned up properties
      const file = new File([audioFile], fileName, { type: mimeType });

      const response = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language,
        prompt,
        response_format: responseFormat,
        temperature
      });

      // Handle different response formats
      if (responseFormat === 'text') {
        return {
          text: (response as unknown) as string,
          language
        };
      }

      // For verbose_json and json formats
      const result = response as any;
      return {
        text: result.text,
        language: result.language,
        duration: result.duration,
        segments: result.segments?.map((segment: any) => ({
          start: segment.start,
          end: segment.end,
          text: segment.text
        }))
      };

    } catch (error) {
      console.error('Transcription error:', error);
      
      if (error instanceof OpenAI.APIError) {
        switch (error.status) {
          case 400:
            throw new Error('Invalid audio file or request parameters');
          case 401:
            throw new Error('Invalid API key');
          case 413:
            throw new Error('Audio file too large (max 25MB)');
          case 429:
            throw new Error('Rate limit exceeded. Please try again later.');
          case 500:
            throw new Error('OpenAI service error. Please try again.');
          default:
            throw new Error(`API error: ${error.message}`);
        }
      }
      
      throw new Error('Failed to transcribe audio');
    }
  }

  /**
   * Transcribe with a specific prompt for better accuracy
   * Useful for biblical text where specific words/names are expected
   */
  async transcribeWithContext(
    audioFile: File | Blob,
    expectedText?: string,
    options: Omit<TranscriptionOptions, 'prompt'> = {}
  ): Promise<TranscriptionResult> {
    // Create a prompt from expected text to improve accuracy
    let prompt = '';
    if (expectedText) {
      // Extract key biblical terms and names for the prompt
      const biblicalTerms = this.extractBiblicalTerms(expectedText);
      if (biblicalTerms.length > 0) {
        prompt = `Texto bíblico que contiene: ${biblicalTerms.join(', ')}.`;
      }
    }

    return this.transcribe(audioFile, {
      ...options,
      prompt
    });
  }

  /**
   * Extract biblical terms and proper nouns to improve transcription accuracy
   */
  private extractBiblicalTerms(text: string): string[] {
    const terms: string[] = [];
    
    // Common biblical names and terms that might be mispronounced
    // Cobertura amplia RVR1960 + formas comunes en español
const biblicalNames = [
  // --- Núcleo que ya tenías ---
  'Jesús','Cristo','Dios','Señor','Espíritu','Padre','Hijo',
  'Jerusalén','Israel','Judá','Galilea','Nazaret',
  'Abraham','Isaac','Jacob','Moisés','David','Salomón',
  'Mateo','Marcos','Lucas','Juan','Pedro','Pablo',
  'Fariseos','Saduceos','discípulos','apóstoles',

  // --- Nombres y títulos de Dios ---
  'Jehová','YHWH','Adonai','Elohim','El Shaddai',
  'Señor de los ejércitos','Jehová de los ejércitos',
  'Jehová Jireh','Jehová Rafa','Jehová Nissi','Jehová Shalom','Jehová Tsidkenu','Jehová Shammah',

  // --- Títulos de Cristo ---
  'Jesucristo','Hijo de Dios','Hijo del Hombre','Mesías','Ungido','Emanuel',
  'Alfa y Omega','Buen Pastor','Cordero de Dios','León de la tribu de Judá',
  'Raíz de David','Estrella de la mañana','Camino','Verdad','Vida',
  'Pan de vida','Luz del mundo','La Vid verdadera','Rabí','Maestro',

  // --- Personas AT (selección esencial) ---
  'Adán','Eva','Caín','Abel','Set','Noé','Sem','Cam','Jafet',
  'Enoc','Nimrod','Sara','Agar','Ismael','Rebeca','Esaú','Lea','Raquel',
  'Bilha','Zilpa','Dina','José',
  'Rubén','Simeón','Leví','Dan','Neftalí','Gad','Aser','Isacar','Zabulón','Benjamín',
  'Faraón','Aarón','Miriam','Josué','Caleb','Rahab',
  'Gedeón','Débora','Barac','Jefté','Sansón','Dalila',
  'Rut','Noemí','Booz','Samuel','Elí','Saúl','Jonatán',
  'Betsabé','Urias','Natán','Absalón','Amnón','Tamar',
  'Roboam','Jeroboam','Acab','Jezabel','Elías','Eliseo',
  'Ezequías','Manasés','Josías','Senaquerib','Nabucodonosor','Belsasar',
  'Daniel','Sadrac','Mesac','Abed-nego','Zorobabel','Esdras','Nehemías',
  'Ester','Mardoqueo','Amán','Job','Elifaz','Bildad','Zofar',
  'Isaías','Jeremías','Baruc','Ezequiel','Oseas','Joel','Amós','Abdías','Jonás',
  'Miqueas','Nahúm','Habacuc','Sofonías','Hageo','Zacarías','Malaquías',

  // --- Personas NT (selección esencial) ---
  'María','José','Zacarías','Elisabet','Juan el Bautista',
  'Herodes el Grande','Herodes Antipas','Herodes Agripa','Pilato','César Augusto','Tiberio',
  'Simeón','Ana','Nicodemo','José de Arimatea',
  'Marta','María de Betania','Lázaro','María Magdalena',
  // Los Doce
  'Simón Pedro','Andrés','Jacobo','Juan','Felipe','Bartolomé','Tomás','Mateo',
  'Jacobo de Alfeo','Tadeo','Simón el Zelote','Judas Iscariote','Matías',
  // Misión apostólica
  'Saulo','Bernabé','Silas','Timoteo','Tito','Lucas','Marcos','Apolos','Priscila','Aquila',
  'Filemón','Onésimo','Lidia','Tabita','Dorcas','Cornelio','Santiago','Judas (hermano de Jacobo)',
  'Cefas','Diótrefes','Demas','Gayo','Epafras','Epafrodito',

  // --- Lugares clave AT/NT ---
  'Edén','Canaán','Egipto','Babilonia','Asiria','Nínive','Aram',
  'Sinaí','Horeb','Mar Rojo','Jericó','Ai','Hebrón','Beer-seba',
  'Sion','Sión','Monte Moriah','Monte Carmelo','Sarepta',
  'Belén','Betania','Betel','Capernaúm','Capernaum','Cesarea','Cesarea de Filipo','Jericó',
  'Samaria','Sicar','Cafarnaúm', // variante
  'Galilea','Judea','Perea','Decápolis','Tiro','Sidón','Gerasa','Gadara',
  'Mar de Galilea','Lago de Genesaret','Genesaret',
  'Jordán','Getsemaní','Monte de los Olivos','Gólgota','Calvario',
  'Damasco','Antioquía','Tarso','Chipre','Pafos','Perge','Pisidia','Iconio','Listra','Derbe',
  'Filipos','Tesalónica','Berea','Atenas','Corinto','Éfeso','Mileto','Colosas',
  'Galacia','Macedonia','Acaya','Asia','Patmos','Roma',
  'Esmirna','Pérgamo','Tiatira','Sardis','Filadelfia','Laodicea',

  // --- Tribus/linajes ---
  'Efraín','Manasés',
  // (más arriba están los 12 hijos de Jacob)

  // --- Fiestas bíblicas ---
  'Pascua','Panes sin levadura','Primicias','Pentecostés','Trompetas',
  'Expiación','Tabernáculos','Purim','La Dedicación',

  // --- Oficios, grupos y cargos ---
  'sumo sacerdote','sacerdote','levita','nazareo','nazareno','escribas',
  'fariseos','saduceos','herodianos','zelotes','prosélitos',
  'publicano','centurión','soldado','gobernador','procónsul','sanedrín','sinagoga',
  'obispo','anciano','pastor','diácono','evangelista','profeta','maestro',

  // --- Objetos/elementos de culto ---
  'arca de Noé','arca del pacto','tabernáculo','templo','altar','sacrificio','holocausto',
  'incienso','propiciatorio','maná','cordero pascual','diezmo','primicias',
  'talento','denario','dracma','siclo','codo','sicómoro',

  // --- Conceptos y términos teológicos (RVR) ---
  'evangelio','gracia','fe','arrepentimiento','justificación','santificación',
  'regeneración','redención','expiación','propiciación','reconciliación','adopción','glorificación',
  'pecado','iniquidad','transgresión','justo','impío','santidad',
  'reino de Dios','reino de los cielos','nuevo pacto','antiguo pacto','ley','misericordia',
  'resurrección','ascensión','segunda venida','arrebatamiento','milenio','juicio',
  'infierno','lago de fuego','Hades','Seol','Gehenna','cielo','paraíso','nuevo cielo y nueva tierra',
  'cuerpo de Cristo','novia del Cordero','Gran Comisión','Sermón del Monte','Bienaventurados',

  // --- Hebraísmos/grecismos frecuentes en RVR ---
  'Amén','Aleluya','Hosanna','Maranata','Abba','Talita cumi',
  'Eli, Eli, ¿lama sabactani?','Eloi, Eloi, ¿lama sabactani?','Anatema',

  // --- Adversarios/ídolos mencionados en la Biblia ---
  'Baal','Asera','Astarot','Moloc','Belcebú','Beelzebú','Leviatán','Goliat',

  // --- Libros de la Biblia (formas usuales en RVR1960) ---
  'Génesis','Éxodo','Levítico','Números','Deuteronomio','Josué','Jueces','Rut',
  '1 Samuel','2 Samuel','1 Reyes','2 Reyes','1 Crónicas','2 Crónicas','Esdras','Nehemías','Ester',
  'Job','Salmos','Proverbios','Eclesiastés','Cantares','Cantar de los Cantares',
  'Isaías','Jeremías','Lamentaciones','Ezequiel','Daniel','Oseas','Joel','Amós','Abdías','Jonás',
  'Miqueas','Nahúm','Habacuc','Sofonías','Hageo','Zacarías','Malaquías',
  'Mateo','Marcos','Lucas','Juan','Hechos','Romanos',
  '1 Corintios','2 Corintios','Gálatas','Efesios','Filipenses','Colosenses',
  '1 Tesalonicenses','2 Tesalonicenses','1 Timoteo','2 Timoteo','Tito','Filemón',
  'Hebreos','Santiago','1 Pedro','2 Pedro','1 Juan','2 Juan','3 Juan','Judas','Apocalipsis',

  // --- Maneras comunes de decir libros (habla natural) ---
  'Primera de Samuel','Segunda de Samuel',
  'Primera de Reyes','Segunda de Reyes',
  'Primera de Crónicas','Segunda de Crónicas',
  'Primera de Corintios','Segunda de Corintios',
  'Primera de Tesalonicenses','Segunda de Tesalonicenses',
  'Primera de Timoteo','Segunda de Timoteo',
  'Primera de Pedro','Segunda de Pedro',
  'Primera de Juan','Segunda de Juan','Tercera de Juan',

  // --- Abreviaturas comunes en español ---
  'Gn','Ex','Lv','Nm','Dt','Jos','Jue','Rut',
  '1 Sam','2 Sam','1 Rey','2 Rey','1 Crón','2 Crón','Esd','Neh','Est',
  'Sal','Prov','Ecl','Cant','Is','Jer','Lam','Ez','Dn','Os','Jl','Am','Abd','Jon','Miq','Nah','Hab','Sof','Hag','Zac','Mal',
  'Mt','Mr','Lc','Jn','Hch','Ro','1 Co','2 Co','Gá','Ef','Fil','Col','1 Ts','2 Ts',
  '1 Ti','2 Ti','Tit','Flm','Heb','Stg','1 P','2 P','1 Jn','2 Jn','3 Jn','Jud','Ap'
];


    // Find biblical terms in the text
    const words = text.split(/\s+/);
    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (biblicalNames.some(name => 
        name.toLowerCase() === cleanWord.toLowerCase()
      )) {
        if (!terms.includes(cleanWord)) {
          terms.push(cleanWord);
        }
      }
    }

    return terms.slice(0, 10); // Limit prompt length
  }

  /**
   * Get file extension from blob type
   */
  private getFileExtensionFromBlob(blob: Blob): string {
    const type = blob.type;
    
    if (type.includes('webm')) return 'webm';
    if (type.includes('mp4')) return 'mp4';
    if (type.includes('wav')) return 'wav';
    if (type.includes('mp3')) return 'mp3';
    if (type.includes('m4a')) return 'm4a';
    
    return 'webm'; // Default fallback
  }

  /**
   * Check if audio file size is within limits
   */
  static isValidAudioSize(file: File | Blob): boolean {
    const maxSize = 25 * 1024 * 1024; // 25MB limit from OpenAI
    return file.size <= maxSize;
  }

  /**
   * Check if audio file type is supported
   */
  static isSupportedAudioType(file: File | Blob): boolean {
    const supportedTypes = [
      'audio/mp3', 'audio/mpeg',
      'audio/mp4', 'audio/m4a',
      'audio/wav',
      'audio/webm'
    ];
    
    return supportedTypes.some(type => file.type.includes(type.split('/')[1]));
  }
}

// Create a singleton instance for client-side usage
let whisperServiceInstance: WhisperService | null = null;

export function getWhisperService(apiKey?: string): WhisperService {
  if (!whisperServiceInstance) {
    whisperServiceInstance = new WhisperService(apiKey);
  }
  return whisperServiceInstance;
}
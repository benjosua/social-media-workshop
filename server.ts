import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const PORT = Number(process.env.PORT) || 4000;

function getLocalIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    const netList = nets[name];
    if (netList) {
      for (const net of netList) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();

app.use(express.static(path.join(__dirname, 'public')));

interface AccuracyMap {
  accurate: number;
  under1h: number;
  oneToTwoH: number;
  over2h: number;
  [key: string]: number;
}

interface WorkshopState {
  currentSlide: number;
  totalSlides: number;
  participants: number;
  prediction: {
    appVotes: Record<string, number>;
    accuracy: AccuracyMap;
  };
  screenTimePoll: Record<string, number>;
  timeWorth: Array<{ id: number; text: string; timestamp: string }>;
  evidencePrediction: {
    metric: Record<string, number>;
    studyType: Record<string, number>;
  };
  timeGoPoll: Record<string, number>;
  triggers: Record<string, number>;
  phoneIdeas: Array<{ id: number; idea: string }>;
  experimentLevel: Record<string, number>;
  experimentOutcome: Record<string, number>;
  ifThenList: Array<{ id: number; trigger: string; response: string }>;
  finalReflections: Array<{ id: number; text: string }>;
}

// Track real connected audience sockets by unique client ID
const audienceSockets = new Set<string>();

const state: WorkshopState = {
  currentSlide: 1,
  totalSlides: 15,
  participants: 0,
  prediction: {
    appVotes: {
      'Instagram': 0,
      'TikTok': 0,
      'YouTube': 0,
      'X / Twitter': 0,
      'Reddit': 0,
      'Snapchat': 0
    },
    accuracy: {
      accurate: 0,
      under1h: 0,
      oneToTwoH: 0,
      over2h: 0
    }
  },
  screenTimePoll: {
    '<2 h': 0,
    '2-3 h': 0,
    '3-4 h': 0,
    '4-5 h': 0,
    '5-6 h': 0,
    '6-8 h': 0,
    '8 h+': 0
  },
  timeWorth: [],
  evidencePrediction: {
    metric: {
      'IQ': 0,
      'Attention': 0,
      'Sleep': 0,
      'Anxiety / Depression': 0,
      'Academic Performance': 0,
      'Nothing Meaningful': 0
    },
    studyType: {
      'One Large Survey': 0,
      'Longitudinal Study': 0,
      'Randomized Experiment (RCT)': 0,
      'Meta-Analysis': 0
    }
  },
  timeGoPoll: {
    'Another Screen': 0,
    'Studying': 0,
    'Exercise': 0,
    'Face-to-Face Socializing': 0,
    'Sleep': 0,
    'Outdoors': 0,
    'Nothing': 0
  },
  triggers: {
    'Immediately after waking': 0,
    'Before sleep': 0,
    'While studying / working': 0,
    'When bored': 0,
    'When stressed': 0,
    'After a notification': 0,
    'While waiting in queue': 0,
    'Without conscious decision': 0
  },
  phoneIdeas: [],
  experimentLevel: {
    'Level 1: Reduce (under 60 min/day, no short-form)': 0,
    'Level 2: Remove (apps deleted, desktop browser only)': 0,
    'Level 3: Full Pause (7 days total social pause)': 0
  },
  experimentOutcome: {
    'Better sleep': 0,
    'Better concentration': 0,
    'Better mood': 0,
    'More initial boredom': 0,
    'More discretionary time': 0,
    'No noticeable difference': 0,
    'Harder than anticipated': 0
  },
  ifThenList: [],
  finalReflections: []
};

type SlideTranslation = {
  title?: string;
  subtitle?: string;
  quote?: string;
  prompt?: string;
  prompt1?: string;
  prompt2?: string;
  takeaway?: string;
};

const translations: Record<string, Record<number, SlideTranslation>> = {
  en: {
    1: {
      title: "What Is Social Media Costing You?",
      subtitle: "Attention, time, sleep, mood - and what the evidence actually says",
      quote: "\"I am not going to tell you social media is bad. I want you to investigate your own use first.\""
    },
    2: {
      title: "Predict Your Screen Time",
      subtitle: "Do not inspect system settings yet. Estimate first.",
      prompt1: "Which application accounted for the most screen time yesterday?",
      prompt2: "How accurate was your estimate compared to recorded device metrics?"
    },
    3: {
      title: "Room Screen-Time Survey",
      subtitle: "Aggregated session data",
      prompt: "Yesterday, my total active screen time was:"
    },
    4: {
      title: "What Is That Time Worth?",
      subtitle: "3 h/day = 1,095 h/year | 5 h/day = 1,825 h/year",
      prompt: "If you reclaimed 30 minutes from yesterday, what would you allocate it toward?"
    },
    5: {
      title: "Prior Hypotheses & Evidence Standards",
      subtitle: "Pre-registration of priors and causal standards",
      prompt1: "Which domain do you hypothesize short-form media correlates with most strongly?",
      prompt2: "Which methodological standard provides the most compelling causal evidence?"
    },
    6: {
      title: "Cognitive Control & Attention Findings",
      subtitle: "Nguyen et al., 2025 (Psychological Bulletin - 71 studies, 98,299 subjects)",
      takeaway: "The primary signal is not generalized cognitive decline, but selective deficits in attention and inhibitory control."
    },
    7: {
      title: "Mental Health & Sleep Disruption",
      subtitle: "Ahmed et al., 2024 (1.1M subjects), Du et al., 2024, Sleep Umbrella 2025",
      takeaway: "Problematic and compulsive usage patterns demonstrate stronger associations than raw screen hours."
    },
    8: {
      title: "Causal Effects of Use Reduction",
      subtitle: "Castelo et al., 2025 RCT & May et al., 2025 Meta-analysis",
      takeaway: "Two-week mobile internet restriction demonstrated improvements in sustained attention and wellbeing. 91% improved on at least one parameter."
    },
    9: {
      title: "Resource Reallocation",
      subtitle: "Empirical opportunity cost observed in experimental restriction",
      prompt: "When smartphone mobile access is removed, how is reclaimed time distributed?"
    },
    10: {
      title: "Claims Not Supported by the Evidence",
      subtitle: "Methodological critique of unsupported claims",
      takeaway: "No verified reduction in intelligence (Sauce '22), no structural neural atrophy (Nivins '24), and total abstinence is not an unconditional remedy (Lemahieu '25)."
    },
    11: {
      title: "Behavioral Mechanisms & Habit Loops",
      subtitle: "Cue -> Routine -> Reinforcement -> Automaticity",
      prompt: "Identify your most frequent trigger for automatic device pickup:"
    },
    12: {
      title: "Environmental Architecture Challenge",
      subtitle: "Establish low-friction constraints without relying solely on effortful self-control.",
      prompt: "Propose actionable environmental constraints (e.g. grayscale display, physical device segregation, notifications disabled)."
    },
    13: {
      title: "Select a 7-Day Protocol",
      subtitle: "Empirical personal trial over seven days.",
      prompt1: "Protocol Tier",
      prompt2: "Hypothesized Primary Outcome"
    },
    14: {
      title: "Implementation Intentions",
      subtitle: "IF [situational trigger], THEN [pre-committed behavior]",
      prompt: "Define your conditional implementation commitment for the next seven days."
    },
    15: {
      title: "Synthesis & Conclusion",
      subtitle: "Reduce volume for seven days. Record observational data. Evaluate objectively.",
      takeaway: "Current empirical data supports focusing on attention, sleep hygiene, and intentional friction."
    }
  },
  de: {
    1: {
      title: "Was kostet dich Social Media?",
      subtitle: "Aufmerksamkeit, Zeit, Schlaf, Stimmung - und was die Wissenschaft belegt",
      quote: "\"Ich werde Ihnen nicht sagen, dass Social Media schädlich ist. Untersuchen Sie zuerst Ihr eigenes Nutzungsverhalten.\""
    },
    2: {
      title: "Bildschirmzeit einschaetzen",
      subtitle: "Vor der Überprüfung der Systemeinstellungen: Schätzen Sie zuerst.",
      prompt1: "Welche Anwendung hat gestern die meiste Zeit beansprucht?",
      prompt2: "Wie präzise war Ihre Schätzung im Vergleich zu den tatsächlichen Messwerten?"
    },
    3: {
      title: "Bildschirmzeit-Erhebung",
      subtitle: "Aggregierte Raumdaten",
      prompt: "Gestern betrug meine gesamte Bildschirmzeit:"
    },
    4: {
      title: "Der Wert verfügbarer Zeit",
      subtitle: "3 Std./Tag = 1.095 Std./Jahr | 5 Std./Tag = 1.825 Std./Jahr",
      prompt: "Wenn Sie 30 Minuten von gestern zurückerhielten: Wofür würden Sie diese Zeit einsetzen?"
    },
    5: {
      title: "Vorab-Hypothesen & Kausalstandards",
      subtitle: "Vorhersage von Korrelation und Evidenzgewicht",
      prompt1: "Mit welchem Bereich korreliert hoher Konsum von Kurzvideos Ihrer Ansicht nach am stärksten?",
      prompt2: "Welches Studiendesign liefert für Sie die stärkste Evidenz?"
    },
    6: {
      title: "Kognitive Kontrolle & Aufmerksamkeitsfokus",
      subtitle: "Nguyen et al., 2025 (Psychological Bulletin - 71 Studien, 98.299 Probanden)",
      takeaway: "Der stärkste Effekt zeigt sich nicht bei allgemeiner Intelligenz, sondern spezifisch bei Impulskontrolle und Aufmerksamkeit."
    },
    7: {
      title: "Psychische Gesundheit & Schlafarchitektur",
      subtitle: "Ahmed et al., 2024 (1,1 Mio. Teilnehmende), Du et al., 2024",
      takeaway: "Problematische, zwanghafte Nutzung wiegt deutlich schwerer als die reine passive Bildschirmdauer."
    },
    8: {
      title: "Kausale Effekte gezielter Reduktion",
      subtitle: "Castelo et al., 2025 RCT & May et al., 2025 Meta-Analyse",
      takeaway: "Zweiwöchige Beschränkung steigerte anhaltende Aufmerksamkeit und subjektives Befinden. 91% zeigten messbare Verbesserungen."
    },
    9: {
      title: "Zeitliche Reallokation",
      subtitle: "Im Experiment beobachtete Opportunitätskosten",
      prompt: "Wohin verlagert sich die Zeit, wenn mobiler Netzzugang entfällt?"
    },
    10: {
      title: "Nicht durch Evidenz gestützte Thesen",
      subtitle: "Wissenschaftliche Einordnung überzogener Narrative",
      takeaway: "Kein belegter IQ-Abfall (Sauce '22), keine strukturellen Hirnschäden (Nivins '24), und vollkommene Abstinenz garantiert kein universelles Wohlbefinden."
    },
    11: {
      title: "Verhaltensmuster & Auslöser",
      subtitle: "Reiz -> Handlung -> Belohnung -> Automatisierung",
      prompt: "In welcher Situation greifen Sie am automatisiertesten zum Gerät?"
    },
    12: {
      title: "Umgebungs- und Reizarchitektur",
      subtitle: "Reibung etablieren statt rein auf Willenskraft zu setzen.",
      prompt1: "Niedrigschwellige Maßnahmen (z. B. Graustufen, räumliche Trennung, Benachrichtigungen stummschalten)"
    },
    13: {
      title: "Wahl des 7-Tage-Versuchs",
      subtitle: "Gezieltes Experiment über sieben Tage.",
      prompt1: "Versuchsstufe",
      prompt2: "Erwartete Wirkung"
    },
    14: {
      title: "Konkrete Umsetzungsintention",
      subtitle: "WENN [Auslösesituation], DANN [vorab festgelegte Handlung]",
      prompt: "Definieren Sie Ihre Wenn-Dann-Regel für die kommenden sieben Tage."
    },
    15: {
      title: "Zusammenfassung & Auswertung",
      subtitle: "Sieben Tage signifikant reduzieren. Veränderungen dokumentieren. Anschließend bewerten.",
      takeaway: "Die wissenschaftliche Datenlage empfiehlt bewussten Umgang, Schlaffokus und strukturelle Reibung."
    }
  },
  es: {
    1: {
      title: "¿Qué te cuesta el uso de redes sociales?",
      subtitle: "Atención, tiempo, descanso, ánimo - lo que la evidencia constata",
      quote: "\"No voy a decirte que las redes son perjudiciales. Te invito a analizar primero tus propios patrones.\""
    },
    2: {
      title: "Estima tu tiempo de pantalla",
      subtitle: "No consultes las métricas del sistema todavía. Estima primero.",
      prompt1: "¿Qué aplicación consumió mayor tiempo ayer?",
      prompt2: "¿Qué tan precisa resultó tu estimación frente al registro real?"
    },
    3: {
      title: "Sondeo de tiempo en pantalla",
      subtitle: "Datos agregados de la sesión",
      prompt: "Ayer mi tiempo de pantalla registrado fue:"
    },
    4: {
      title: "El valor del tiempo disponible",
      subtitle: "3 h/día = 1.095 h/año | 5 h/día = 1.825 h/año",
      prompt: "Si recuperaras 30 minutos de ayer, ¿a qué actividad los destinarías?"
    },
    5: {
      title: "Hipótesis previas y rigor metodológico",
      subtitle: "Causalidad frente a correlación",
      prompt1: "¿Con qué variable consideras más asociada la exposición a videos cortos?",
      prompt2: "¿Qué diseño metodológico consideras más determinante?"
    },
    6: {
      title: "Control cognitivo y capacidad de atención",
      subtitle: "Nguyen et al., 2025 (Psychological Bulletin - 71 estudios, 98.299 participantes)",
      takeaway: "El hallazgo principal no radica en un descenso del CI, sino en el control inhibitorio y la atención sostenida."
    },
    7: {
      title: "Salud mental y calidad del descanso",
      subtitle: "Ahmed et al., 2024 (1,1M participantes), Du et al., 2024",
      takeaway: "El uso problemático y compulsivo guarda una relación significativamente mayor que las horas totales de pantalla."
    },
    8: {
      title: "Evidencia causal de la reducción de uso",
      subtitle: "Castelo et al., 2025 RCT y May et al., 2025 Metaanálisis",
      takeaway: "Dos semanas sin internet móvil incrementaron atención y bienestar. 91% mejoró en al menos un indicador."
    },
    9: {
      title: "Redistribución del tiempo",
      subtitle: "Costo de oportunidad documentado experimentalmente",
      prompt: "Al restringir la conectividad móvil, ¿a dónde se reasignan las horas?"
    },
    10: {
      title: "Afirmaciones no respaldadas por la evidencia",
      subtitle: "Revisión crítica de afirmaciones alarmistas",
      takeaway: "Sin caída demostrada del CI (Sauce '22), sin daño tisular cerebral (Nivins '24), y la abstinencia total no garantiza bienestar permanente."
    },
    11: {
      title: "Mecanismos conductuales y disparadores",
      subtitle: "Señal -> Rutina -> Refuerzo -> Hábito",
      prompt: "¿Cuál es tu disparador principal para desbloquear el dispositivo de forma automática?"
    },
    12: {
      title: "Diseño del entorno y barreras de fricción",
      subtitle: "Establece barreras ambientales en lugar de depender únicamente de la fuerza de voluntad.",
      prompt: "Tácticas de fricción (escala de grises, dispositivo fuera del dormitorio, notificaciones silenciadas)"
    },
    13: {
      title: "Protocolo experimental de 7 días",
      subtitle: "Intervención temporal evaluable.",
      prompt1: "Nivel de intervención",
      prompt2: "Efecto esperado"
    },
    14: {
      title: "Intención de implementación estructurada",
      subtitle: "SI [situación detonante], ENTONCES [acción predefinida]",
      prompt: "Redacta tu compromiso condicional para los próximos 7 días."
    },
    15: {
      title: "Conclusión y evaluación",
      subtitle: "Reduce el uso durante 7 días. Registra los cambios. Evalúa después.",
      takeaway: "La evidencia analizada respalda la preservación del descanso, el foco atencional y el uso deliberado."
    }
  },
  fr: {
    1: {
      title: "Que vous coûte l'usage des réseaux sociaux ?",
      subtitle: "Attention, temps, sommeil, humeur - l'état des connaissances scientifiques",
      quote: "\"Je ne prétends pas que les réseaux sociaux sont néfastes par nature. Analysons d'abord vos propres usages.\""
    },
    2: {
      title: "Estimation du temps d'écran",
      subtitle: "Avant de consulter les statistiques d'utilisation, évaluez d'abord votre temps.",
      prompt1: "Quelle application a monopolisé le plus de temps hier ?",
      prompt2: "Quel était le degré de précision de votre estimation ?"
    },
    3: {
      title: "Relevé collectif du temps d'écran",
      subtitle: "Données agrégées de la session",
      prompt: "Hier, mon temps d'écran total s'élevait à :"
    },
    4: {
      title: "La valeur du temps disponible",
      subtitle: "3 h/jour = 1 095 h/an | 5 h/jour = 1 825 h/an",
      prompt: "Si vous récupériez 30 minutes d'hier, à quoi les consacreriez-vous ?"
    },
    5: {
      title: "Hypothèses préalables et normes causales",
      subtitle: "Prédiction des corrélations et degré de preuve",
      prompt1: "À quel domaine associez-vous le plus fortement la consommation de formats courts ?",
      prompt2: "Quel type d'étude méthodologique jugez-vous le plus probant ?"
    },
    6: {
      title: "Contrôle inhibiteur et attention",
      subtitle: "Nguyen et al., 2025 (Psychological Bulletin - 71 études, 98 299 participants)",
      takeaway: "Le signal dominant ne concerne pas le quotient intellectuel, mais le contrôle inhibiteur et le maintien de l'attention."
    },
    7: {
      title: "Santé mentale et altération du sommeil",
      subtitle: "Ahmed et al., 2024 (1,1 million d'individus), Du et al., 2024",
      takeaway: "L'usage problématique et compulsif pèse plus lourdement que le simple volume d'écran passif."
    },
    8: {
      title: "Effets causaux de la réduction d'usage",
      subtitle: "Castelo et al., 2025 (essai contrôlé randomisé) et May et al., 2025",
      takeaway: "Deux semaines de restriction de données mobiles ont amélioré l'attention et le bien-être. 91% d'amélioration mesurée sur au moins un critère."
    },
    9: {
      title: "Réallocation du temps",
      subtitle: "Coût d'opportunité observé empiriquement",
      prompt: "En l'absence de connectivité mobile sur le smartphone, où s'oriente le temps retrouvé ?"
    },
    10: {
      title: "Ce que la littérature scientifique ne valide pas",
      subtitle: "Analyse critique des allégations disproportionnées",
      takeaway: "Aucune baisse de QI démontrée (Sauce '22), aucune lésion neuronale structurelle (Nivins '24), et l'abstinence totale ne constitue pas une solution absolue."
    },
    11: {
      title: "Boucles comportementales et déclencheurs",
      subtitle: "Signal -> Action -> Renforcement -> Automatisme",
      prompt: "Identifiez votre déclencheur le plus fréquent de déverrouillage automatique :"
    },
    12: {
      title: "Architecture de l'environnement matériel",
      subtitle: "Mettre en place des barrières de friction plutôt que dépendre uniquement de la volonté.",
      prompt: "Interventions structurelles (nuances de gris, smartphone hors de la chambre, alertes désactivées)"
    },
    13: {
      title: "Sélection d'un protocole sur 7 jours",
      subtitle: "Expérimentation individuelle structurée.",
      prompt1: "Niveau d'engagement",
      prompt2: "Effet anticipé"
    },
    14: {
      title: "Formulation d'intentions de mise en oeuvre",
      subtitle: "SI [déclencheur précis], ALORS [réponse préétablie]",
      prompt: "Rédigez votre engagement conditionnel pour les sept prochains jours."
    },
    15: {
      title: "Synthèse et évaluation",
      subtitle: "Réduisez l'usage durant sept jours. Documentez les évolutions. Concluez ensuite.",
      takeaway: "Les données actuelles recommandent la préservation du sommeil, la gestion de l'attention et l'introduction de friction délibérée."
    }
  }
};

function broadcastParticipantCount() {
  state.participants = audienceSockets.size;
  io.emit('participantCount', state.participants);
}

io.on('connection', (socket: Socket) => {
  const role = socket.handshake.query.role as string;
  const isAudience = role === 'audience';

  if (isAudience) {
    audienceSockets.add(socket.id);
  }

  broadcastParticipantCount();

  socket.emit('syncState', {
    ...state,
    participants: audienceSockets.size,
    localIp,
    serverPort: PORT,
    translations
  });

  socket.on('setSlide', (slideNum: number | string) => {
    state.currentSlide = Number(slideNum);
    io.emit('slideChanged', {
      currentSlide: state.currentSlide,
      translations: {
        en: translations['en']?.[state.currentSlide] || {},
        de: translations['de']?.[state.currentSlide] || {},
        es: translations['es']?.[state.currentSlide] || {},
        fr: translations['fr']?.[state.currentSlide] || {}
      }
    });
  });

  socket.on('submitAccuracy', (val: string) => {
    if (state.prediction.accuracy[val] !== undefined) {
      state.prediction.accuracy[val]++;
      io.emit('accuracyUpdate', state.prediction.accuracy);
    }
  });

  socket.on('submitAppGuess', (app: string) => {
    if (!app) return;
    state.prediction.appVotes[app] = (state.prediction.appVotes[app] || 0) + 1;
    io.emit('appGuessUpdate', state.prediction.appVotes);
  });

  socket.on('submitScreenTime', (bracket: string) => {
    if (state.screenTimePoll[bracket] !== undefined) {
      state.screenTimePoll[bracket]++;
      io.emit('screenTimeUpdate', state.screenTimePoll);
    }
  });

  socket.on('submitTimeWorth', (text: string) => {
    if (!text || text.trim().length === 0) return;
    const clean = text.trim().slice(0, 60);
    state.timeWorth.push({ id: Date.now(), text: clean, timestamp: new Date().toLocaleTimeString() });
    if (state.timeWorth.length > 50) state.timeWorth.shift();
    io.emit('timeWorthUpdate', state.timeWorth);
  });

  socket.on('submitEvidenceMetric', (metric: string) => {
    if (state.evidencePrediction.metric[metric] !== undefined) {
      state.evidencePrediction.metric[metric]++;
      io.emit('evidenceMetricUpdate', state.evidencePrediction.metric);
    }
  });

  socket.on('submitStudyType', (studyType: string) => {
    if (state.evidencePrediction.studyType[studyType] !== undefined) {
      state.evidencePrediction.studyType[studyType]++;
      io.emit('studyTypeUpdate', state.evidencePrediction.studyType);
    }
  });

  socket.on('submitTimeGo', (cat: string) => {
    if (state.timeGoPoll[cat] !== undefined) {
      state.timeGoPoll[cat]++;
      io.emit('timeGoUpdate', state.timeGoPoll);
    }
  });

  socket.on('submitTrigger', (trigger: string) => {
    if (state.triggers[trigger] !== undefined) {
      state.triggers[trigger]++;
      io.emit('triggerUpdate', state.triggers);
    }
  });

  socket.on('submitPhoneIdea', (idea: string) => {
    if (!idea || idea.trim().length === 0) return;
    state.phoneIdeas.push({ id: Date.now(), idea: idea.trim().slice(0, 100) });
    if (state.phoneIdeas.length > 60) state.phoneIdeas.shift();
    io.emit('phoneIdeasUpdate', state.phoneIdeas);
  });

  socket.on('submitExperimentLevel', (level: string) => {
    if (state.experimentLevel[level] !== undefined) {
      state.experimentLevel[level]++;
      io.emit('experimentLevelUpdate', state.experimentLevel);
    }
  });

  socket.on('submitExperimentOutcome', (outcome: string) => {
    if (state.experimentOutcome[outcome] !== undefined) {
      state.experimentOutcome[outcome]++;
      io.emit('experimentOutcomeUpdate', state.experimentOutcome);
    }
  });

  socket.on('submitIfThen', ({ trigger, response }: { trigger: string; response: string }) => {
    if (!trigger || !response) return;
    state.ifThenList.push({
      id: Date.now(),
      trigger: trigger.trim().slice(0, 80),
      response: response.trim().slice(0, 80)
    });
    if (state.ifThenList.length > 40) state.ifThenList.shift();
    io.emit('ifThenUpdate', state.ifThenList);
  });

  socket.on('submitReflection', (text: string) => {
    if (!text || text.trim().length === 0) return;
    state.finalReflections.push({ id: Date.now(), text: text.trim().slice(0, 120) });
    io.emit('finalReflectionsUpdate', state.finalReflections);
  });

  socket.on('resetData', () => {
    Object.keys(state.screenTimePoll).forEach(k => state.screenTimePoll[k] = 0);
    Object.keys(state.timeGoPoll).forEach(k => state.timeGoPoll[k] = 0);
    Object.keys(state.triggers).forEach(k => state.triggers[k] = 0);
    Object.keys(state.experimentLevel).forEach(k => state.experimentLevel[k] = 0);
    Object.keys(state.experimentOutcome).forEach(k => state.experimentOutcome[k] = 0);
    Object.keys(state.prediction.accuracy).forEach(k => state.prediction.accuracy[k] = 0);
    Object.keys(state.prediction.appVotes).forEach(k => state.prediction.appVotes[k] = 0);
    state.timeWorth = [];
    state.phoneIdeas = [];
    state.ifThenList = [];
    state.finalReflections = [];
    io.emit('syncState', { ...state, participants: audienceSockets.size, localIp, serverPort: PORT, translations });
  });

  socket.on('disconnect', () => {
    if (audienceSockets.has(socket.id)) {
      audienceSockets.delete(socket.id);
      broadcastParticipantCount();
    }
  });
});

app.get('/api/info', (_req: Request, res: Response) => {
  res.json({
    localIp,
    port: PORT,
    audienceUrl: `http://${localIp}:${PORT}`
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Live Interaction Socket Server running on:`);
  console.log(` - Local:    http://localhost:${PORT}`);
  console.log(` - Network:  http://${localIp}:${PORT}`);
});

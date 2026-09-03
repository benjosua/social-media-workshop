import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
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

const PORT = process.env.PORT || 4000;

// Helper to find local network IP for easy phone joining
function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();

// Serve audience web app static assets
app.use(express.static(path.join(__dirname, 'public')));

// State store
const state = {
  currentSlide: 1,
  totalSlides: 15,
  slideMeta: {},
  participants: 0,
  // Slide 2: Predict screen time
  prediction: {
    appVotes: {},
    timeVotes: {},
    accuracy: {
      accurate: 0,
      under1h: 0,
      oneToTwoH: 0,
      over2h: 0
    }
  },
  // Slide 3: Screen time brackets
  screenTimePoll: {
    '<2 h': 0,
    '2–3 h': 0,
    '3–4 h': 0,
    '4–5 h': 0,
    '5–6 h': 0,
    '6–8 h': 0,
    '8 h+': 0
  },
  // Slide 4: 30 minutes back open ideas
  timeWorth: [],
  // Slide 5: Strongest correlation & convincing evidence
  evidencePrediction: {
    metric: {
      'IQ': 0,
      'Attention': 0,
      'Sleep': 0,
      'Anxiety/depression': 0,
      'Academic performance': 0,
      'Nothing meaningful': 0
    },
    studyType: {
      'One large survey': 0,
      'Longitudinal study': 0,
      'Randomized experiment': 0,
      'Meta-analysis': 0
    }
  },
  // Slide 9: Where did the time go?
  timeGoPoll: {
    'Another screen': 0,
    'Studying': 0,
    'Exercise': 0,
    'Face-to-face socializing': 0,
    'Sleep': 0,
    'Outdoors': 0,
    'Nothing': 0
  },
  // Slide 11: Triggers
  triggers: {
    'immediately after waking': 0,
    'before sleep': 0,
    'while studying': 0,
    'when bored': 0,
    'when stressed': 0,
    'after a notification': 0,
    'while waiting': 0,
    'without really deciding': 0
  },
  // Slide 12: Design phone ideas
  phoneIdeas: [],
  // Slide 13: 7-day experiment
  experimentLevel: {
    'Level 1: Reduce (≤60m/no short form)': 0,
    'Level 2: Remove (delete apps, desktop only)': 0,
    'Level 3: Quit (no social 7 days)': 0
  },
  experimentOutcome: {
    'better sleep': 0,
    'better concentration': 0,
    'better mood': 0,
    'more boredom': 0,
    'more time': 0,
    'no difference': 0,
    'harder than expected': 0
  },
  // Slide 14: Trigger-Response Implementation Intentions
  ifThenList: [],
  // Slide 15: Final reflections
  finalReflections: []
};

// Available translations for the 15 slides
const translations = {
  en: {
    1: {
      title: "What Is Social Media Costing You?",
      subtitle: "Attention, time, sleep, mood — and what the evidence actually says",
      quote: "“I’m not going to tell you social media is bad. I want you to investigate your own use first.”"
    },
    2: {
      title: "Predict Your Screen Time",
      subtitle: "Don't check your settings yet! Estimate first.",
      prompt1: "Which app do you think took the most time yesterday?",
      prompt2: "How accurate were you compared to actual Digital Wellbeing / Screen Time?"
    },
    3: {
      title: "Room Screen-Time Poll",
      subtitle: "Anonymous room overview",
      prompt: "Yesterday, my total screen time was..."
    },
    4: {
      title: "What Is That Time Worth?",
      subtitle: "3 h/day = 1,095 h/year | 5 h/day = 1,825 h/year",
      prompt: "If you could get 30 minutes of yesterday back, what would you actually do with it?"
    },
    5: {
      title: "Before We Look at the Research",
      subtitle: "Prediction & Causality",
      prompt1: "What do you think heavy social media / short-form video is most strongly related to?",
      prompt2: "Which scientific evidence would convince you most?"
    },
    6: {
      title: "The Most Striking Cognition Study",
      subtitle: "Nguyen et al., 2025 (Psychological Bulletin - 71 studies, 98,299 participants)",
      takeaway: "The strongest signal is not 'lower IQ'. It is attention and inhibitory control (ability to resist distraction)."
    },
    7: {
      title: "Mental Health and Sleep",
      subtitle: "Ahmed et al., 2024 (1.1M people) & Du et al., 2024 & Sleep Umbrella 2025",
      takeaway: "Problematic/compulsive use appears more important than raw 'screen time' alone."
    },
    8: {
      title: "Does Using Less Actually Help?",
      subtitle: "Castelo et al., 2025 RCT & May et al., 2025 Meta-analysis",
      takeaway: "Randomized trials show 2-week restriction boosts sustained attention & mental health. 91% improved on ≥1 outcome."
    },
    9: {
      title: "Where Did the Time Go?",
      subtitle: "Opportunity cost revealed by randomized trial",
      prompt: "When mobile internet disappears, where does the reclaimed time go?"
    },
    10: {
      title: "What the Evidence Does NOT Show",
      subtitle: "Debunking exaggerated claims",
      takeaway: "No proof of IQ drop (Sauce '22), no structural brain damage (Nivins '24), complete abstinence doesn't magically solve all affect (Lemahieu '25)."
    },
    11: {
      title: "Why Do You Open It?",
      subtitle: "Cue → Action → Immediate reward → Repeat",
      prompt: "When do you most automatically reach for social media?"
    },
    12: {
      title: "Design a Better Phone (90s Challenge)",
      subtitle: "Keep the benefits. Remove automatic habit traps without relying on willpower alone.",
      prompt: "Submit friction tricks (grayscale, notifications off, out of bedroom, app limits, etc.)"
    },
    13: {
      title: "Choose a 7-Day Experiment",
      subtitle: "A temporary test, not a lifetime vow.",
      prompt1: "Pick your challenge level",
      prompt2: "Predict what will happen"
    },
    14: {
      title: "Make It Specific (Implementation Intention)",
      subtitle: "IF [trigger occurs] THEN I will [specific action]",
      prompt: "Write your IF-THEN commitment rule for the next 7 days."
    },
    15: {
      title: "Final Takeaway",
      subtitle: "Use much less for seven days. Track what changes. Decide afterward.",
      takeaway: "More is not necessarily better. Strongest evidence points to attention, sleep, and problematic habits."
    }
  },
  de: {
    1: {
      title: "Was kostet dich Social Media?",
      subtitle: "Aufmerksamkeit, Zeit, Schlaf, Stimmung – und was die Wissenschaft wirklich sagt",
      quote: "„Ich werde euch nicht sagen, dass Social Media böse ist. Untersucht zuerst euer eigenes Verhalten.“"
    },
    2: {
      title: "Schätze deine Bildschirmzeit",
      subtitle: "Noch nicht in den Einstellungen nachsehen! Erst schätzen.",
      prompt1: "Welche App hat gestern die meiste Zeit gefressen?",
      prompt2: "Wie genau lagst du im Vergleich zu deiner echten Bildschirmzeit?"
    },
    3: {
      title: "Bildschirmzeit-Umfrage im Raum",
      subtitle: "Anonymes Stimmungsbild",
      prompt: "Gestern war meine gesamte Bildschirmzeit..."
    },
    4: {
      title: "Was ist diese Zeit wert?",
      subtitle: "3 Std./Tag = 1.095 Std./Jahr | 5 Std./Tag = 1.825 Std./Jahr",
      prompt: "Wenn du 30 Minuten von gestern zurückbekämst: Was würdest du wirklich tun?"
    },
    5: {
      title: "Bevor wir auf die Studien schauen",
      subtitle: "Vorhersage & Kausalität",
      prompt1: "Womit hängt starker Short-Form-Konsum deiner Meinung nach am stärksten zusammen?",
      prompt2: "Welche Evidenz würde dich am meisten überzeugen?"
    },
    6: {
      title: "Die auffälligste Kognitionsstudie",
      subtitle: "Nguyen et al., 2025 (Psychological Bulletin – 71 Studien, 98.299 Teilnehmer)",
      takeaway: "Das stärkste Signal ist kein 'niedrigerer IQ', sondern Impulskontrolle & Aufmerksamkeitsfokus."
    },
    7: {
      title: "Psyche & Schlaf",
      subtitle: "Ahmed et al., 2024 (1,1 Mio. Probanden), Du et al., 2024, Schlaf-Review 2025",
      takeaway: "Problematische/kompulsive Nutzung ist viel entscheidender als die reine Stundenzahl."
    },
    8: {
      title: "Hilft weniger nutzen wirklich?",
      subtitle: "Castelo et al., 2025 RCT & May et al., 2025 Meta-Analyse",
      takeaway: "2 Wochen Smartphone-Internetpause steigern Fokus & Wohlbefinden. 91% verbesserten sich messbar."
    },
    9: {
      title: "Wohin geht die gewonnene Zeit?",
      subtitle: "Opportunitätskosten im RCT-Experiment",
      prompt: "Wenn mobiles Internet blockiert wird: Wo landet die Zeit?"
    },
    10: {
      title: "Was die Daten NICHT zeigen",
      subtitle: "Widerlegung von Mythen",
      takeaway: "Kein IQ-Verlust (Sauce '22), keine Gehirnschäden (Nivins '24), vollständiger Verzicht macht nicht automatisch glücklicher (Lemahieu '25)."
    },
    11: {
      title: "Warum öffnest du es?",
      subtitle: "Auslöser → Handlung → Sofortige Belohnung → Wiederholung",
      prompt: "In welchem Moment greifst du am automatisiertesten zum Smartphone?"
    },
    12: {
      title: "Baue ein besseres Smartphone (90-Sekunden)",
      subtitle: "Vorteile behalten, Reizüberflutung eliminieren – ohne Willenskraft zu strapazieren.",
      prompt: "Welche Reibungspunkte helfen dir? (Graustufen, Benachrichtigungen aus, etc.)"
    },
    13: {
      title: "Wähle dein 7-Tage-Experiment",
      subtitle: "Ein Experiment, kein lebenslanger Schwur.",
      prompt1: "Wähle dein Challenge-Level",
      prompt2: "Was wird voraussichtlich passieren?"
    },
    14: {
      title: "Mach es konkret: Wenn-Dann-Plan",
      subtitle: "WENN [Auslöser] DANN werde ich [konkrete Aktion]",
      prompt: "Trage deine Umsetzungsintention für die nächste Woche ein."
    },
    15: {
      title: "Fazit & Ausblick",
      subtitle: "7 Tage deutlich reduzieren. Beobachten. Danach bewusst entscheiden.",
      takeaway: "Mehr ist nicht besser. Der Hebel liegt bei Aufmerksamkeit, Schlaf & intentionaler Nutzung."
    }
  },
  es: {
    1: {
      title: "¿Qué te están costando las redes sociales?",
      subtitle: "Atención, tiempo, sueño, estado de ánimo: lo que dice la evidencia real",
      quote: "“No voy a decirte que las redes son malas. Quiero que investigues tu propio uso primero.”"
    },
    2: {
      title: "Predice tu tiempo en pantalla",
      subtitle: "No mires los ajustes todavía. Estima primero.",
      prompt1: "¿Qué aplicación crees que te quitó más tiempo ayer?",
      prompt2: "¿Qué tan acertada fue tu estimación?"
    },
    3: {
      title: "Encuesta de la sala: Tiempo en pantalla",
      subtitle: "Muestra anónima en tiempo real",
      prompt: "Ayer mi tiempo total de pantalla fue..."
    },
    4: {
      title: "¿Cuánto vale ese tiempo?",
      subtitle: "3 h/día = 1.095 h/año | 5 h/día = 1.825 h/año",
      prompt: "Si pudieras recuperar 30 minutos de ayer, ¿qué harías con ellos?"
    },
    5: {
      title: "Antes de ver los estudios",
      subtitle: "Predicción y Causalidad",
      prompt1: "¿Con qué se relaciona más fuertemente el consumo masivo de videos cortos?",
      prompt2: "¿Qué tipo de estudio te convencería más?"
    },
    6: {
      title: "El estudio de cognición más llamativo",
      subtitle: "Nguyen et al., 2025 (Psychological Bulletin - 71 estudios, 98.299 participantes)",
      takeaway: "La señal principal no es 'menor CI', sino déficit en atención y control inhibitorio."
    },
    7: {
      title: "Salud mental y sueño",
      subtitle: "Ahmed et al., 2024 (1,1M personas) y Du et al., 2024",
      takeaway: "El uso problemático y compulsivo pesa más que el tiempo bruto de pantalla."
    },
    8: {
      title: "¿Realmente ayuda reducir el uso?",
      subtitle: "Castelo et al., 2025 ensayo aleatorizado (RCT)",
      takeaway: "2 semanas sin internet móvil mejoraron atención y bienestar. 91% mejoró en al menos una variable."
    },
    9: {
      title: "¿A dónde se fue ese tiempo?",
      subtitle: "Costo de oportunidad revelado",
      prompt: "Si desaparece el internet móvil del teléfono, ¿a dónde va el tiempo?"
    },
    10: {
      title: "Lo que la evidencia NO demuestra",
      subtitle: "Desmontando mitos alarmistas",
      takeaway: "No hay prueba de caída de CI ni de daño cerebral estructural. La abstinencia total tampoco es mágica."
    },
    11: {
      title: "¿Por qué abres la app?",
      subtitle: "Señal → Acción → Recompensa inmediata → Repetición",
      prompt: "¿En qué momento tomas tu teléfono de forma más automática?"
    },
    12: {
      title: "Diseña un teléfono mejor (Reto 90 seg)",
      subtitle: "Mantén los beneficios. Reduce el hábito automático sin depender de fuerza de voluntad.",
      prompt: "Comparte tácticas de fricción (pantalla en blanco y negro, sin notificaciones, fuera de la habitación)"
    },
    13: {
      title: "Elige un experimento de 7 días",
      subtitle: "Una prueba temporal, no un voto de por vida.",
      prompt1: "Nivel de desafío",
      prompt2: "¿Qué predices que pasará?"
    },
    14: {
      title: "Hazlo específico (Intención de implementación)",
      subtitle: "SI ocurre [disparador], ENTONCES haré [acción]",
      prompt: "Escribe tu regla Si-Entonces para los próximos 7 días."
    },
    15: {
      title: "Conclusión final",
      subtitle: "Usa mucho menos durante 7 días. Registra qué cambia. Decide después.",
      takeaway: "Más no es mejor. La evidencia apunta a atención, sueño y uso intencional."
    }
  },
  fr: {
    1: {
      title: "Que vous coûtent les réseaux sociaux ?",
      subtitle: "Attention, temps, sommeil, humeur — et ce que disent réellement les études",
      quote: "« Je ne vais pas vous dire que les réseaux sont mauvais. Je veux d'abord que vous exploriez vos propres habitudes. »"
    },
    2: {
      title: "Prédisez votre temps d'écran",
      subtitle: "Ne regardez pas encore vos réglages ! Estimez d'abord.",
      prompt1: "Quelle application vous a pris le plus de temps hier ?",
      prompt2: "À quel point votre estimation était-elle exacte ?"
    },
    3: {
      title: "Sondage de la salle : Temps d'écran",
      subtitle: "Sondage anonyme en direct",
      prompt: "Hier, mon temps d'écran total était de..."
    },
    4: {
      title: "Que vaut ce temps ?",
      subtitle: "3h/jour = 1 095h/an | 5h/jour = 1 825h/an",
      prompt: "Si vous pouviez récupérer 30 minutes d'hier, que feriez-vous concrètement ?"
    },
    5: {
      title: "Avant de regarder la recherche",
      subtitle: "Prédiction & Causalité",
      prompt1: "À quoi les vidéos courtes sont-elles le plus fortement corrélées selon vous ?",
      prompt2: "Quel type de preuve vous convaincrait le plus ?"
    },
    6: {
      title: "L'étude cognitive la plus frappante",
      subtitle: "Nguyen et al., 2025 (Psychological Bulletin – 71 études, 98 299 participants)",
      takeaway: "Le signal le plus fort n'est pas une 'baisse de QI', mais le contrôle inhibiteur et l'attention."
    },
    7: {
      title: "Santé mentale et sommeil",
      subtitle: "Ahmed et al., 2024 (1,1M personnes) & Du et al., 2024",
      takeaway: "L'usage compulsif/problématique importe bien plus que le simple temps d'écran brut."
    },
    8: {
      title: "Réduire aide-t-il vraiment ?",
      subtitle: "Castelo et al., 2025 essai contrôlé randomisé (RCT)",
      takeaway: "2 semaines sans internet mobile améliorent l'attention et le bien-être. 91% d'amélioration."
    },
    9: {
      title: "Où est passé le temps ?",
      subtitle: "Le coût d'opportunité révélé",
      prompt: "Quand internet mobile disparaît du smartphone, où va le temps retrouvé ?"
    },
    10: {
      title: "Ce que la science NE montre PAS",
      subtitle: "Démystifier les affirmations exagérées",
      takeaway: "Aucune baisse de QI prouvée (Sauce '22), pas de lésion cérébrale (Nivins '24), l'abstinence totale n'est pas une solution miracle."
    },
    11: {
      title: "Pourquoi ouvrez-vous votre téléphone ?",
      subtitle: "Déclencheur → Action → Récompense immédiate → Répétition",
      prompt: "À quel moment déverrouillez-vous votre téléphone de manière la plus automatique ?"
    },
    12: {
      title: "Concevez un meilleur smartphone (Défi 90s)",
      subtitle: "Gardez les bénéfices, coupez les pièges sans dépendre de la seule volonté.",
      prompt: "Partagez vos astuces (mode noir et blanc, couper les notifications, hors de la chambre)"
    },
    13: {
      title: "Choisissez votre test de 7 jours",
      subtitle: "Une expérience temporaire, pas une promesse à vie.",
      prompt1: "Niveau de défi",
      prompt2: "Que prédisez-vous ?"
    },
    14: {
      title: "Formulez votre intention (SI... ALORS...)",
      subtitle: "SI [déclencheur], ALORS je vais [action précise]",
      prompt: "Rédigez votre engagement pour les 7 prochains jours."
    },
    15: {
      title: "Message final",
      subtitle: "Réduisez drastiquement pendant 7 jours. Observez. Décidez ensuite.",
      takeaway: "Plus n'est pas synonyme de mieux. L'impact réel se joue sur l'attention, le sommeil et l'intentionnalité."
    }
  }
};

io.on('connection', (socket) => {
  state.participants++;
  io.emit('participantCount', state.participants);

  // Send full state to newly connected client
  socket.emit('syncState', {
    ...state,
    localIp,
    serverPort: PORT,
    translations
  });

  // Slide navigation broadcasted by presenter
  socket.on('setSlide', (slideNum) => {
    state.currentSlide = Number(slideNum);
    io.emit('slideChanged', {
      currentSlide: state.currentSlide,
      translations: {
        en: translations.en[state.currentSlide] || {},
        de: translations.de[state.currentSlide] || {},
        es: translations.es[state.currentSlide] || {},
        fr: translations.fr[state.currentSlide] || {}
      }
    });
  });

  // Poll 2: Accuracy
  socket.on('submitAccuracy', (val) => {
    if (state.prediction.accuracy[val] !== undefined) {
      state.prediction.accuracy[val]++;
      io.emit('accuracyUpdate', state.prediction.accuracy);
    }
  });

  socket.on('submitAppGuess', (app) => {
    if (!app) return;
    state.prediction.appVotes[app] = (state.prediction.appVotes[app] || 0) + 1;
    io.emit('appGuessUpdate', state.prediction.appVotes);
  });

  // Poll 3: Screen time bracket
  socket.on('submitScreenTime', (bracket) => {
    if (state.screenTimePoll[bracket] !== undefined) {
      state.screenTimePoll[bracket]++;
      io.emit('screenTimeUpdate', state.screenTimePoll);
    }
  });

  // Slide 4: 30 minutes open ideas
  socket.on('submitTimeWorth', (text) => {
    if (!text || text.trim().length === 0) return;
    const clean = text.trim().slice(0, 60);
    state.timeWorth.push({ id: Date.now(), text: clean, timestamp: new Date().toLocaleTimeString() });
    if (state.timeWorth.length > 50) state.timeWorth.shift();
    io.emit('timeWorthUpdate', state.timeWorth);
  });

  // Slide 5: Evidence prediction
  socket.on('submitEvidenceMetric', (metric) => {
    if (state.evidencePrediction.metric[metric] !== undefined) {
      state.evidencePrediction.metric[metric]++;
      io.emit('evidenceMetricUpdate', state.evidencePrediction.metric);
    }
  });

  socket.on('submitStudyType', (studyType) => {
    if (state.evidencePrediction.studyType[studyType] !== undefined) {
      state.evidencePrediction.studyType[studyType]++;
      io.emit('studyTypeUpdate', state.evidencePrediction.studyType);
    }
  });

  // Slide 9: Where did time go
  socket.on('submitTimeGo', (cat) => {
    if (state.timeGoPoll[cat] !== undefined) {
      state.timeGoPoll[cat]++;
      io.emit('timeGoUpdate', state.timeGoPoll);
    }
  });

  // Slide 11: Trigger poll
  socket.on('submitTrigger', (trigger) => {
    if (state.triggers[trigger] !== undefined) {
      state.triggers[trigger]++;
      io.emit('triggerUpdate', state.triggers);
    }
  });

  // Slide 12: Phone design ideas
  socket.on('submitPhoneIdea', (idea) => {
    if (!idea || idea.trim().length === 0) return;
    state.phoneIdeas.push({ id: Date.now(), idea: idea.trim().slice(0, 100) });
    if (state.phoneIdeas.length > 60) state.phoneIdeas.shift();
    io.emit('phoneIdeasUpdate', state.phoneIdeas);
  });

  // Slide 13: 7-day challenge
  socket.on('submitExperimentLevel', (level) => {
    if (state.experimentLevel[level] !== undefined) {
      state.experimentLevel[level]++;
      io.emit('experimentLevelUpdate', state.experimentLevel);
    }
  });

  socket.on('submitExperimentOutcome', (outcome) => {
    if (state.experimentOutcome[outcome] !== undefined) {
      state.experimentOutcome[outcome]++;
      io.emit('experimentOutcomeUpdate', state.experimentOutcome);
    }
  });

  // Slide 14: If-Then rule
  socket.on('submitIfThen', ({ trigger, response }) => {
    if (!trigger || !response) return;
    state.ifThenList.push({
      id: Date.now(),
      trigger: trigger.trim().slice(0, 80),
      response: response.trim().slice(0, 80)
    });
    if (state.ifThenList.length > 40) state.ifThenList.shift();
    io.emit('ifThenUpdate', state.ifThenList);
  });

  // Slide 15: Reflection
  socket.on('submitReflection', (text) => {
    if (!text || text.trim().length === 0) return;
    state.finalReflections.push({ id: Date.now(), text: text.trim().slice(0, 120) });
    io.emit('finalReflectionsUpdate', state.finalReflections);
  });

  // Reset data if presenter requests
  socket.on('resetData', () => {
    Object.keys(state.screenTimePoll).forEach(k => state.screenTimePoll[k] = 0);
    Object.keys(state.timeGoPoll).forEach(k => state.timeGoPoll[k] = 0);
    Object.keys(state.triggers).forEach(k => state.triggers[k] = 0);
    Object.keys(state.experimentLevel).forEach(k => state.experimentLevel[k] = 0);
    Object.keys(state.experimentOutcome).forEach(k => state.experimentOutcome[k] = 0);
    Object.keys(state.prediction.accuracy).forEach(k => state.prediction.accuracy[k] = 0);
    state.prediction.appVotes = {};
    state.timeWorth = [];
    state.phoneIdeas = [];
    state.ifThenList = [];
    state.finalReflections = [];
    io.emit('syncState', { ...state, localIp, serverPort: PORT, translations });
  });

  socket.on('disconnect', () => {
    state.participants = Math.max(0, state.participants - 1);
    io.emit('participantCount', state.participants);
  });
});

app.get('/api/info', (req, res) => {
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

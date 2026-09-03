<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { io, Socket } from 'socket.io-client'
import QRCode from 'qrcode'

interface LiveState {
  screenTimePoll: Record<string, number>
  accuracy: Record<string, number>
  appVotes: Record<string, number>
  timeWorth: Array<{ id: number; text: string; timestamp?: string }>
  evidenceMetric: Record<string, number>
  studyType: Record<string, number>
  timeGoPoll: Record<string, number>
  triggers: Record<string, number>
  phoneIdeas: Array<{ id: number; idea: string }>
  experimentLevel: Record<string, number>
  experimentOutcome: Record<string, number>
  ifThenList: Array<{ id: number; trigger: string; response: string }>
  finalReflections: Array<{ id: number; text: string }>
}

const props = defineProps<{
  slide: number
}>()

const socket = ref<Socket | null>(null)
const qrDataUrl = ref<string>('')
const audienceUrl = ref<string>('')
const participantCount = ref<number>(0)
const liveState = ref<LiveState>({
  screenTimePoll: {},
  accuracy: {},
  appVotes: {},
  timeWorth: [],
  evidenceMetric: {},
  studyType: {},
  timeGoPoll: {},
  triggers: {},
  phoneIdeas: [],
  experimentLevel: {},
  experimentOutcome: {},
  ifThenList: [],
  finalReflections: []
})

onMounted(async () => {
  const host = window.location.hostname || 'localhost'
  try {
    const res = await fetch(`http://${host}:4000/api/info`)
    const data = await res.json()
    audienceUrl.value = data.audienceUrl
    qrDataUrl.value = await QRCode.toDataURL(data.audienceUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
  } catch (e) {
    audienceUrl.value = `http://${host}:4000`
    qrDataUrl.value = await QRCode.toDataURL(audienceUrl.value, { width: 260, margin: 2 })
  }

  const socketUrl = `http://${host}:4000`
  socket.value = io(socketUrl)

  socket.value.on('connect', () => {
    socket.value?.emit('setSlide', props.slide)
  })

  socket.value.on('participantCount', (count: number) => {
    participantCount.value = count
  })

  socket.value.on('syncState', (state: any) => {
    participantCount.value = state.participants
    if (state.screenTimePoll) liveState.value.screenTimePoll = state.screenTimePoll
    if (state.prediction) {
      liveState.value.accuracy = state.prediction.accuracy || {}
      liveState.value.appVotes = state.prediction.appVotes || {}
    }
    if (state.timeWorth) liveState.value.timeWorth = state.timeWorth
    if (state.evidencePrediction) {
      liveState.value.evidenceMetric = state.evidencePrediction.metric || {}
      liveState.value.studyType = state.evidencePrediction.studyType || {}
    }
    if (state.timeGoPoll) liveState.value.timeGoPoll = state.timeGoPoll
    if (state.triggers) liveState.value.triggers = state.triggers
    if (state.phoneIdeas) liveState.value.phoneIdeas = state.phoneIdeas
    if (state.experimentLevel) liveState.value.experimentLevel = state.experimentLevel
    if (state.experimentOutcome) liveState.value.experimentOutcome = state.experimentOutcome
    if (state.ifThenList) liveState.value.ifThenList = state.ifThenList
    if (state.finalReflections) liveState.value.finalReflections = state.finalReflections
  })

  socket.value.on('accuracyUpdate', (acc: Record<string, number>) => { liveState.value.accuracy = acc })
  socket.value.on('appGuessUpdate', (apps: Record<string, number>) => { liveState.value.appVotes = apps })
  socket.value.on('screenTimeUpdate', (data: Record<string, number>) => { liveState.value.screenTimePoll = data })
  socket.value.on('timeWorthUpdate', (data: Array<{ id: number; text: string }>) => { liveState.value.timeWorth = data })
  socket.value.on('evidenceMetricUpdate', (data: Record<string, number>) => { liveState.value.evidenceMetric = data })
  socket.value.on('studyTypeUpdate', (data: Record<string, number>) => { liveState.value.studyType = data })
  socket.value.on('timeGoUpdate', (data: Record<string, number>) => { liveState.value.timeGoPoll = data })
  socket.value.on('triggerUpdate', (data: Record<string, number>) => { liveState.value.triggers = data })
  socket.value.on('phoneIdeasUpdate', (data: Array<{ id: number; idea: string }>) => { liveState.value.phoneIdeas = data })
  socket.value.on('experimentLevelUpdate', (data: Record<string, number>) => { liveState.value.experimentLevel = data })
  socket.value.on('experimentOutcomeUpdate', (data: Record<string, number>) => { liveState.value.experimentOutcome = data })
  socket.value.on('ifThenUpdate', (data: Array<{ id: number; trigger: string; response: string }>) => { liveState.value.ifThenList = data })
  socket.value.on('finalReflectionsUpdate', (data: Array<{ id: number; text: string }>) => { liveState.value.finalReflections = data })
})

watch(() => props.slide, (newSlide: number) => {
  if (socket.value && socket.value.connected) {
    socket.value.emit('setSlide', newSlide)
  }
})

function calcPercent(val: number | undefined, dict: Record<string, number> | undefined): number {
  if (!dict) return 0
  const sum = Object.values(dict).reduce((a, b) => a + Number(b), 0)
  if (!sum) return 0
  return Math.round((Number(val || 0) / sum) * 100)
}
</script>

<template>
  <div class="live-sync-panel">
    <!-- QR Join Header -->
    <div v-if="slide === 1" class="flex flex-row items-center gap-6 bg-slate-900/80 p-5 rounded-2xl border border-indigo-500/30 shadow-2xl backdrop-blur-md">
      <div class="bg-white p-2.5 rounded-xl shadow-lg flex-shrink-0">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="Scan QR Code" class="w-36 h-36 rounded" />
        <div v-else class="w-36 h-36 flex items-center justify-center text-xs text-slate-500">Generating...</div>
      </div>
      <div class="flex-1 space-y-2">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          Live Interaction & Multi-language Sync
        </div>
        <h3 class="text-xl font-bold text-white tracking-tight">Join on your phone</h3>
        <p class="text-sm text-slate-300">Scan QR or open in browser:</p>
        <div class="inline-block font-mono text-sm text-indigo-300 font-bold bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
          {{ audienceUrl || 'http://localhost:4000' }}
        </div>
        <div class="text-xs text-slate-400 pt-1 flex items-center gap-2">
          <span>👥 <b>{{ participantCount }}</b> joined</span>
          <span>• Live translation (🇬🇧, 🇩🇪, 🇪🇸, 🇫🇷)</span>
          <span>• Anonymous polls</span>
        </div>
      </div>
    </div>

    <!-- Persistent mini join badge for slides 2-15 -->
    <div v-else class="fixed top-3 right-4 z-50 flex items-center gap-3 bg-slate-900/80 border border-white/15 px-3.5 py-1.5 rounded-full text-xs text-slate-300 shadow-lg backdrop-blur-md">
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      <span class="font-mono text-indigo-300 font-semibold">{{ audienceUrl }}</span>
      <span class="text-slate-400">| 👥 {{ participantCount }} online</span>
    </div>

    <!-- Slide 2: Predict Screen Time Live Bars -->
    <div v-if="slide === 2" class="mt-4 grid grid-cols-2 gap-4">
      <div class="bg-slate-900/70 p-4 rounded-xl border border-white/10">
        <h4 class="text-xs uppercase font-bold text-indigo-400 tracking-wider mb-2">Live: Most Time-Consuming App</h4>
        <div class="space-y-2 text-xs">
          <div v-for="(votes, app) in liveState.appVotes" :key="app" class="space-y-0.5">
            <div class="flex justify-between text-slate-300 font-medium">
              <span>{{ app }}</span>
              <span>{{ votes }} votes</span>
            </div>
            <div class="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div class="bg-indigo-500 h-full rounded-full transition-all duration-500" :style="{ width: calcPercent(votes, liveState.appVotes) + '%' }"></div>
            </div>
          </div>
          <div v-if="Object.keys(liveState.appVotes).length === 0" class="text-slate-500 italic py-2">
            Awaiting audience app guesses...
          </div>
        </div>
      </div>

      <div class="bg-slate-900/70 p-4 rounded-xl border border-white/10">
        <h4 class="text-xs uppercase font-bold text-emerald-400 tracking-wider mb-2">Accuracy vs Real Screen Time</h4>
        <div class="space-y-2 text-xs">
          <div class="space-y-0.5">
            <div class="flex justify-between text-slate-300"><span>🎯 Spot on</span><span>{{ liveState.accuracy.accurate || 0 }}</span></div>
            <div class="w-full bg-slate-800 h-2 rounded-full"><div class="bg-emerald-500 h-full rounded-full" :style="{ width: calcPercent(liveState.accuracy.accurate, liveState.accuracy) + '%' }"></div></div>
          </div>
          <div class="space-y-0.5">
            <div class="flex justify-between text-slate-300"><span>&lt; 1 h off</span><span>{{ liveState.accuracy.under1h || 0 }}</span></div>
            <div class="w-full bg-slate-800 h-2 rounded-full"><div class="bg-cyan-500 h-full rounded-full" :style="{ width: calcPercent(liveState.accuracy.under1h, liveState.accuracy) + '%' }"></div></div>
          </div>
          <div class="space-y-0.5">
            <div class="flex justify-between text-slate-300"><span>1–2 h off</span><span>{{ liveState.accuracy.oneToTwoH || 0 }}</span></div>
            <div class="w-full bg-slate-800 h-2 rounded-full"><div class="bg-amber-500 h-full rounded-full" :style="{ width: calcPercent(liveState.accuracy.oneToTwoH, liveState.accuracy) + '%' }"></div></div>
          </div>
          <div class="space-y-0.5">
            <div class="flex justify-between text-slate-300"><span>&gt; 2 h off</span><span>{{ liveState.accuracy.over2h || 0 }}</span></div>
            <div class="w-full bg-slate-800 h-2 rounded-full"><div class="bg-rose-500 h-full rounded-full" :style="{ width: calcPercent(liveState.accuracy.over2h, liveState.accuracy) + '%' }"></div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Slide 3: Room screen time histogram -->
    <div v-if="slide === 3" class="mt-4 bg-slate-900/80 p-5 rounded-2xl border border-white/15">
      <div class="flex justify-between items-center mb-3">
        <h4 class="text-xs uppercase font-bold text-indigo-400 tracking-wider">Yesterday's Total Screen Time Distribution</h4>
        <span class="text-xs text-slate-400">Total votes: {{ Object.values(liveState.screenTimePoll).reduce((a,b)=>a+b, 0) }}</span>
      </div>
      <div class="grid grid-cols-7 gap-2 items-end h-36 pt-4 border-b border-white/10 pb-2">
        <div v-for="(val, label) in liveState.screenTimePoll" :key="label" class="flex flex-col items-center h-full justify-end group">
          <span class="text-[11px] font-bold text-indigo-300 mb-1">{{ val }}</span>
          <div class="w-full max-w-[40px] bg-indigo-600/30 rounded-t-lg border-t border-x border-indigo-400/40 flex items-end justify-center transition-all duration-500 overflow-hidden" :style="{ height: Math.max(12, calcPercent(val, liveState.screenTimePoll)) + '%' }">
            <div class="w-full bg-gradient-to-t from-indigo-600 to-purple-500 h-full"></div>
          </div>
          <span class="text-[10px] text-slate-400 mt-2 font-mono whitespace-nowrap">{{ label }}</span>
        </div>
      </div>
    </div>

    <!-- Slide 4: Word Cloud / Realtime list for 30 min -->
    <div v-if="slide === 4" class="mt-3 bg-slate-900/80 p-4 rounded-xl border border-white/15">
      <div class="flex justify-between items-center mb-2">
        <span class="text-xs font-bold uppercase tracking-wider text-emerald-400">Reclaimed 30 Minutes: Audience Ideas</span>
        <span class="text-[11px] text-slate-400">{{ liveState.timeWorth.length }} submissions</span>
      </div>
      <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto py-1">
        <span v-for="item in liveState.timeWorth.slice(-20)" :key="item.id" class="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/15 rounded-full text-xs font-semibold text-indigo-200 animate-fade-in">
          {{ item.text }}
        </span>
        <span v-if="liveState.timeWorth.length === 0" class="text-xs text-slate-500 italic py-2">
          Waiting for audience inputs on phones...
        </span>
      </div>
    </div>

    <!-- Slide 5: Research Predictions -->
    <div v-if="slide === 5" class="mt-3 grid grid-cols-2 gap-3">
      <div class="bg-slate-900/80 p-3.5 rounded-xl border border-white/10">
        <div class="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">Audience Vote: Strongest Link</div>
        <div class="space-y-1.5 text-xs">
          <div v-for="(v, k) in liveState.evidenceMetric" :key="k" class="space-y-0.5">
            <div class="flex justify-between text-slate-300"><span>{{ k }}</span><span>{{ v }}</span></div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div class="bg-indigo-500 h-full rounded-full" :style="{ width: calcPercent(v, liveState.evidenceMetric) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="bg-slate-900/80 p-3.5 rounded-xl border border-white/10">
        <div class="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">Audience Vote: Most Convincing Type</div>
        <div class="space-y-1.5 text-xs">
          <div v-for="(v, k) in liveState.studyType" :key="k" class="space-y-0.5">
            <div class="flex justify-between text-slate-300"><span>{{ k }}</span><span>{{ v }}</span></div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div class="bg-purple-500 h-full rounded-full" :style="{ width: calcPercent(v, liveState.studyType) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Slide 9: Where did time go prediction -->
    <div v-if="slide === 9" class="mt-3 bg-slate-900/80 p-4 rounded-xl border border-white/15">
      <div class="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Audience Prediction: Where does phone-free time go?</div>
      <div class="grid grid-cols-4 gap-2 text-xs">
        <div v-for="(val, cat) in liveState.timeGoPoll" :key="cat" class="p-2 bg-white/5 rounded-lg border border-white/10">
          <div class="text-slate-300 font-medium truncate">{{ cat }}</div>
          <div class="text-lg font-bold text-cyan-300 mt-1">{{ val }} <span class="text-[10px] text-slate-400">({{ calcPercent(val, liveState.timeGoPoll) }}%)</span></div>
        </div>
      </div>
    </div>

    <!-- Slide 11: Habit triggers -->
    <div v-if="slide === 11" class="mt-3 bg-slate-900/80 p-4 rounded-xl border border-white/15">
      <div class="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Room Trigger Analysis: When do we reach automatically?</div>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div v-for="(cnt, trg) in liveState.triggers" :key="trg" class="p-2 bg-white/5 rounded-lg border border-white/10 flex justify-between items-center">
          <span class="text-slate-200 capitalize">{{ trg }}</span>
          <span class="font-bold text-amber-300 font-mono bg-black/40 px-2 py-0.5 rounded">{{ cnt }}</span>
        </div>
      </div>
    </div>

    <!-- Slide 12: Low willpower phone ideas -->
    <div v-if="slide === 12" class="mt-3 bg-slate-900/80 p-4 rounded-xl border border-white/15">
      <div class="flex justify-between items-center mb-2">
        <span class="text-xs font-bold uppercase tracking-wider text-rose-400">Audience Wall: Friction & Phone Hacks</span>
        <span class="text-[11px] text-slate-400">{{ liveState.phoneIdeas.length }} ideas</span>
      </div>
      <div class="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
        <span v-for="idea in liveState.phoneIdeas.slice(-15)" :key="idea.id" class="px-2.5 py-1 bg-white/10 border border-white/15 rounded-lg text-xs text-white">
          ⚡ {{ idea.idea }}
        </span>
      </div>
    </div>

    <!-- Slide 13: 7-day experiment breakdown -->
    <div v-if="slide === 13" class="mt-3 grid grid-cols-2 gap-3">
      <div class="bg-slate-900/80 p-3 rounded-xl border border-white/10">
        <div class="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Challenge Level Choice</div>
        <div class="space-y-1 text-xs">
          <div v-for="(v, lvl) in liveState.experimentLevel" :key="lvl" class="p-1.5 bg-white/5 rounded flex justify-between">
            <span class="truncate pr-2">{{ lvl }}</span>
            <b class="text-indigo-300">{{ v }}</b>
          </div>
        </div>
      </div>
      <div class="bg-slate-900/80 p-3 rounded-xl border border-white/10">
        <div class="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Predicted Outcomes</div>
        <div class="grid grid-cols-2 gap-1 text-[11px]">
          <div v-for="(v, outc) in liveState.experimentOutcome" :key="outc" class="p-1 bg-white/5 rounded flex justify-between">
            <span>{{ outc }}</span>
            <b class="text-emerald-300">{{ v }}</b>
          </div>
        </div>
      </div>
    </div>

    <!-- Slide 14: IF-THEN wall -->
    <div v-if="slide === 14" class="mt-3 bg-slate-900/80 p-4 rounded-xl border border-white/15">
      <div class="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Live Commitments (IF... THEN...)</div>
      <div class="space-y-1.5 max-h-32 overflow-y-auto">
        <div v-for="rule in liveState.ifThenList.slice(-6)" :key="rule.id" class="p-2 bg-white/5 rounded-lg border border-white/10 text-xs flex items-center gap-2">
          <span class="px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 font-bold uppercase text-[10px]">IF</span>
          <span class="text-slate-200">{{ rule.trigger }}</span>
          <span class="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 font-bold uppercase text-[10px]">THEN</span>
          <span class="text-emerald-200 font-semibold">{{ rule.response }}</span>
        </div>
        <div v-if="liveState.ifThenList.length === 0" class="text-xs text-slate-500 italic">
          Audience writing their implementation intentions...
        </div>
      </div>
    </div>

    <!-- Slide 15: Final reflections -->
    <div v-if="slide === 15" class="mt-3 bg-slate-900/80 p-4 rounded-xl border border-white/15">
      <div class="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Participant Takeaways & 7-Day Tests</div>
      <div class="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
        <div v-for="r in liveState.finalReflections.slice(-10)" :key="r.id" class="p-2 bg-white/10 border border-white/15 rounded-lg text-xs text-slate-200">
          💬 "{{ r.text }}"
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.live-sync-panel {
  width: 100%;
}
</style>

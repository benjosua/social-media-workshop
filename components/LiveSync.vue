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
  // Presenter socket does not have role=audience, so count reflects real mobile audience devices
  socket.value = io(socketUrl, {
    query: { role: 'presenter' }
  })

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

function sumVotes(dict: Record<string, number> | undefined): number {
  if (!dict) return 0
  return Object.values(dict).reduce((a, b) => a + Number(b), 0)
}
</script>

<template>
  <div class="live-sync-panel font-sans">
    <!-- QR Join Header -->
    <div v-if="slide === 1" class="flex flex-row items-center gap-6 bg-slate-900/90 p-5 rounded-xl border border-white/15 shadow-xl backdrop-blur-md">
      <div class="bg-white p-2.5 rounded-lg shadow flex-shrink-0">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="Session QR Code" class="w-36 h-36 rounded" />
        <div v-else class="w-36 h-36 flex items-center justify-center text-xs text-slate-500 font-mono">Generating QR...</div>
      </div>
      <div class="flex-1 space-y-2">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-mono font-medium">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          Live Participant Portal
        </div>
        <h3 class="text-xl font-bold text-white tracking-tight">Connect via Mobile Device</h3>
        <p class="text-xs text-slate-300">Scan the QR code or enter the URL in any mobile browser:</p>
        <div class="inline-block font-mono text-sm text-indigo-300 font-bold bg-black/60 px-3 py-1.5 rounded border border-white/15">
          {{ audienceUrl || 'http://localhost:4000' }}
        </div>
        <div class="text-xs text-slate-400 pt-1 flex items-center gap-3 font-mono">
          <span>Connected Participants: <b class="text-white">{{ participantCount }}</b></span>
          <span>• Multi-language Sync (EN, DE, ES, FR)</span>
          <span>• Anonymous Surveys</span>
        </div>
      </div>
    </div>

    <!-- Mini status badge for slides 2-15 -->
    <div v-else class="fixed top-3 right-4 z-50 flex items-center gap-3 bg-slate-900/90 border border-white/15 px-3 py-1 rounded-full text-xs text-slate-300 shadow backdrop-blur-md font-mono">
      <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
      <span class="text-indigo-300">{{ audienceUrl }}</span>
      <span class="text-slate-400">| {{ participantCount }} connected</span>
    </div>

    <!-- Slide 2: Predict Screen Time Results -->
    <div v-if="slide === 2" class="mt-4 grid grid-cols-2 gap-4">
      <div class="bg-slate-900/80 p-4 rounded-xl border border-white/10">
        <div class="flex justify-between items-center mb-2">
          <h4 class="text-xs uppercase font-mono font-bold text-indigo-400 tracking-wider">Estimated Highest-Use App</h4>
          <span class="text-[11px] font-mono text-slate-400">Total: {{ sumVotes(liveState.appVotes) }}</span>
        </div>
        <div class="space-y-2 text-xs">
          <div v-for="(votes, app) in liveState.appVotes" :key="app" class="space-y-0.5">
            <div class="flex justify-between text-slate-300">
              <span>{{ app }}</span>
              <span class="font-mono text-slate-400">{{ votes }} ({{ calcPercent(votes, liveState.appVotes) }}%)</span>
            </div>
            <div class="w-full bg-slate-800 h-2 rounded overflow-hidden">
              <div class="bg-indigo-500 h-full rounded transition-all duration-300" :style="{ width: calcPercent(votes, liveState.appVotes) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-slate-900/80 p-4 rounded-xl border border-white/10">
        <div class="flex justify-between items-center mb-2">
          <h4 class="text-xs uppercase font-mono font-bold text-emerald-400 tracking-wider">Estimation Accuracy vs Recorded Data</h4>
          <span class="text-[11px] font-mono text-slate-400">Total: {{ sumVotes(liveState.accuracy) }}</span>
        </div>
        <div class="space-y-2.5 text-xs pt-1">
          <div class="space-y-1">
            <div class="flex justify-between text-slate-300"><span>Accurate (within 15m)</span><span class="font-mono">{{ liveState.accuracy.accurate || 0 }}</span></div>
            <div class="w-full bg-slate-800 h-2 rounded"><div class="bg-emerald-500 h-full rounded" :style="{ width: calcPercent(liveState.accuracy.accurate, liveState.accuracy) + '%' }"></div></div>
          </div>
          <div class="space-y-1">
            <div class="flex justify-between text-slate-300"><span>&lt; 1 hour disparity</span><span class="font-mono">{{ liveState.accuracy.under1h || 0 }}</span></div>
            <div class="w-full bg-slate-800 h-2 rounded"><div class="bg-cyan-500 h-full rounded" :style="{ width: calcPercent(liveState.accuracy.under1h, liveState.accuracy) + '%' }"></div></div>
          </div>
          <div class="space-y-1">
            <div class="flex justify-between text-slate-300"><span>1-2 hours disparity</span><span class="font-mono">{{ liveState.accuracy.oneToTwoH || 0 }}</span></div>
            <div class="w-full bg-slate-800 h-2 rounded"><div class="bg-amber-500 h-full rounded" :style="{ width: calcPercent(liveState.accuracy.oneToTwoH, liveState.accuracy) + '%' }"></div></div>
          </div>
          <div class="space-y-1">
            <div class="flex justify-between text-slate-300"><span>&gt; 2 hours disparity</span><span class="font-mono">{{ liveState.accuracy.over2h || 0 }}</span></div>
            <div class="w-full bg-slate-800 h-2 rounded"><div class="bg-rose-500 h-full rounded" :style="{ width: calcPercent(liveState.accuracy.over2h, liveState.accuracy) + '%' }"></div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Slide 3: Screen time survey histogram -->
    <div v-if="slide === 3" class="mt-4 bg-slate-900/85 p-5 rounded-xl border border-white/15">
      <div class="flex justify-between items-center mb-3">
        <h4 class="text-xs uppercase font-mono font-bold text-indigo-400 tracking-wider">Reported Active Screen Time (Yesterday)</h4>
        <span class="text-xs font-mono text-slate-400">Total Responses: {{ sumVotes(liveState.screenTimePoll) }}</span>
      </div>
      <div class="grid grid-cols-7 gap-3 items-end h-36 pt-4 border-b border-white/10 pb-2">
        <div v-for="(val, label) in liveState.screenTimePoll" :key="label" class="flex flex-col items-center h-full justify-end">
          <span class="text-xs font-mono font-bold text-indigo-300 mb-1">{{ val }}</span>
          <div class="w-full max-w-[44px] bg-indigo-600/30 rounded-t border-t border-x border-indigo-400/40 flex items-end justify-center transition-all duration-300 overflow-hidden" :style="{ height: Math.max(10, calcPercent(val, liveState.screenTimePoll)) + '%' }">
            <div class="w-full bg-indigo-500 h-full"></div>
          </div>
          <span class="text-[11px] text-slate-400 mt-2 font-mono whitespace-nowrap">{{ label }}</span>
        </div>
      </div>
    </div>

    <!-- Slide 4: Reclaimed time allocation -->
    <div v-if="slide === 4" class="mt-3 bg-slate-900/85 p-4 rounded-xl border border-white/15">
      <div class="flex justify-between items-center mb-2">
        <span class="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">Participant Allocations (30 Reclaimed Minutes)</span>
        <span class="text-[11px] font-mono text-slate-400">{{ liveState.timeWorth.length }} entries</span>
      </div>
      <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto py-1">
        <span v-for="item in liveState.timeWorth.slice(-24)" :key="item.id" class="px-3 py-1 bg-white/5 border border-white/15 rounded text-xs text-slate-200">
          {{ item.text }}
        </span>
        <span v-if="liveState.timeWorth.length === 0" class="text-xs text-slate-500 italic py-1 font-mono">
          Awaiting submissions from audience devices...
        </span>
      </div>
    </div>

    <!-- Slide 5: Research priors -->
    <div v-if="slide === 5" class="mt-3 grid grid-cols-2 gap-3">
      <div class="bg-slate-900/85 p-3.5 rounded-xl border border-white/10">
        <div class="flex justify-between items-center mb-2">
          <div class="text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider">Hypothesized Strongest Correlate</div>
          <span class="text-[10px] font-mono text-slate-400">{{ sumVotes(liveState.evidenceMetric) }}</span>
        </div>
        <div class="space-y-1.5 text-xs">
          <div v-for="(v, k) in liveState.evidenceMetric" :key="k" class="space-y-0.5">
            <div class="flex justify-between text-slate-300"><span>{{ k }}</span><span class="font-mono">{{ v }}</span></div>
            <div class="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
              <div class="bg-indigo-500 h-full rounded" :style="{ width: calcPercent(v, liveState.evidenceMetric) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="bg-slate-900/85 p-3.5 rounded-xl border border-white/10">
        <div class="flex justify-between items-center mb-2">
          <div class="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider">Most Compelling Evidence Type</div>
          <span class="text-[10px] font-mono text-slate-400">{{ sumVotes(liveState.studyType) }}</span>
        </div>
        <div class="space-y-1.5 text-xs">
          <div v-for="(v, k) in liveState.studyType" :key="k" class="space-y-0.5">
            <div class="flex justify-between text-slate-300"><span>{{ k }}</span><span class="font-mono">{{ v }}</span></div>
            <div class="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
              <div class="bg-purple-500 h-full rounded" :style="{ width: calcPercent(v, liveState.studyType) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Slide 9: Resource reallocation distribution -->
    <div v-if="slide === 9" class="mt-3 bg-slate-900/85 p-4 rounded-xl border border-white/15">
      <div class="flex justify-between items-center mb-2">
        <div class="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Participant Forecast: Where Reclaimed Time Goes</div>
        <span class="text-[11px] font-mono text-slate-400">Total: {{ sumVotes(liveState.timeGoPoll) }}</span>
      </div>
      <div class="grid grid-cols-4 gap-2 text-xs">
        <div v-for="(val, cat) in liveState.timeGoPoll" :key="cat" class="p-2 bg-white/5 rounded border border-white/10">
          <div class="text-slate-300 font-medium truncate">{{ cat }}</div>
          <div class="text-base font-mono font-bold text-cyan-300 mt-0.5">{{ val }} <span class="text-[10px] text-slate-400 font-normal">({{ calcPercent(val, liveState.timeGoPoll) }}%)</span></div>
        </div>
      </div>
    </div>

    <!-- Slide 11: Habit trigger frequency -->
    <div v-if="slide === 11" class="mt-3 bg-slate-900/85 p-4 rounded-xl border border-white/15">
      <div class="flex justify-between items-center mb-2">
        <div class="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">Trigger Analysis: Primary Access Conditions</div>
        <span class="text-[11px] font-mono text-slate-400">Total: {{ sumVotes(liveState.triggers) }}</span>
      </div>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div v-for="(cnt, trg) in liveState.triggers" :key="trg" class="p-2 bg-white/5 rounded border border-white/10 flex justify-between items-center">
          <span class="text-slate-200">{{ trg }}</span>
          <span class="font-bold text-amber-300 font-mono bg-black/50 px-2 py-0.5 rounded text-xs">{{ cnt }}</span>
        </div>
      </div>
    </div>

    <!-- Slide 12: Environmental friction catalog -->
    <div v-if="slide === 12" class="mt-3 bg-slate-900/85 p-4 rounded-xl border border-white/15">
      <div class="flex justify-between items-center mb-2">
        <span class="text-xs font-mono font-bold uppercase tracking-wider text-rose-400">Proposed Environmental Constraints</span>
        <span class="text-[11px] font-mono text-slate-400">{{ liveState.phoneIdeas.length }} proposals</span>
      </div>
      <div class="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
        <span v-for="idea in liveState.phoneIdeas.slice(-15)" :key="idea.id" class="px-2.5 py-1 bg-white/5 border border-white/15 rounded text-xs text-white">
          {{ idea.idea }}
        </span>
      </div>
    </div>

    <!-- Slide 13: 7-day protocol breakdown -->
    <div v-if="slide === 13" class="mt-3 grid grid-cols-2 gap-3">
      <div class="bg-slate-900/85 p-3 rounded-xl border border-white/10">
        <div class="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider mb-1.5">Selected Protocol Tier</div>
        <div class="space-y-1.5 text-xs">
          <div v-for="(v, lvl) in liveState.experimentLevel" :key="lvl" class="p-2 bg-white/5 rounded flex justify-between items-center">
            <span class="truncate pr-2">{{ lvl }}</span>
            <b class="font-mono text-indigo-300">{{ v }}</b>
          </div>
        </div>
      </div>
      <div class="bg-slate-900/85 p-3 rounded-xl border border-white/10">
        <div class="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider mb-1.5">Anticipated Primary Outcome</div>
        <div class="grid grid-cols-2 gap-1.5 text-[11px]">
          <div v-for="(v, outc) in liveState.experimentOutcome" :key="outc" class="p-1.5 bg-white/5 rounded flex justify-between items-center">
            <span class="truncate pr-1">{{ outc }}</span>
            <b class="font-mono text-emerald-300">{{ v }}</b>
          </div>
        </div>
      </div>
    </div>

    <!-- Slide 14: Implementation Intentions -->
    <div v-if="slide === 14" class="mt-3 bg-slate-900/85 p-4 rounded-xl border border-white/15">
      <div class="flex justify-between items-center mb-2">
        <div class="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Recorded Implementation Intentions (Gollwitzer Rules)</div>
        <span class="text-[11px] font-mono text-slate-400">{{ liveState.ifThenList.length }} recorded</span>
      </div>
      <div class="space-y-1.5 max-h-32 overflow-y-auto">
        <div v-for="rule in liveState.ifThenList.slice(-6)" :key="rule.id" class="p-2 bg-white/5 rounded border border-white/10 text-xs flex items-center gap-2">
          <span class="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold uppercase text-[10px]">IF</span>
          <span class="text-slate-200">{{ rule.trigger }}</span>
          <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold uppercase text-[10px]">THEN</span>
          <span class="text-emerald-200 font-medium">{{ rule.response }}</span>
        </div>
        <div v-if="liveState.ifThenList.length === 0" class="text-xs text-slate-500 italic font-mono">
          Awaiting implementation intentions from participants...
        </div>
      </div>
    </div>

    <!-- Slide 15: Final reflections -->
    <div v-if="slide === 15" class="mt-3 bg-slate-900/85 p-4 rounded-xl border border-white/15">
      <div class="flex justify-between items-center mb-2">
        <div class="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">Participant Commitments & Empirical Focus</div>
        <span class="text-[11px] font-mono text-slate-400">{{ liveState.finalReflections.length }} entries</span>
      </div>
      <div class="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
        <div v-for="r in liveState.finalReflections.slice(-10)" :key="r.id" class="p-2 bg-white/5 border border-white/15 rounded text-xs text-slate-200">
          "{{ r.text }}"
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

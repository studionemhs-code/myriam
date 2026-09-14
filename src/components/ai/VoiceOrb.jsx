import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AudioLines, MicOff } from 'lucide-react';
import useVoiceLevel from '@/components/ai/useVoiceLevel';

export default function VoiceOrb({ agent, phase, stream, outputStream, muted, error, audioBlocked }) {
  const reduced = useReducedMotion();
  const speaking = phase === 'speaking' && !audioBlocked;
  const level = useVoiceLevel(speaking ? outputStream : stream, !error && (speaking || (!muted && phase === 'listening')));
  const state = error ? 'error' : speaking ? 'speaking' : muted ? 'muted' : phase;
  const active = state === 'listening' || state === 'speaking';
  const still = reduced || state === 'muted' || state === 'error';
  const label = error ? 'Conversa indisponível' : audioBlocked ? 'Ative o som da chamada' : speaking ? `${agent.name} está falando` : muted ? 'Microfone desligado' : phase === 'thinking' ? 'Preparando resposta' : 'Ouvindo você';
  return <div className="voice-orb flex shrink-0 flex-col items-center" data-state={state}>
    <div className="relative flex h-64 w-64 items-center justify-center" aria-hidden="true">
      <motion.div className="voice-orb-glow absolute h-36 w-36 rounded-full" animate={{ opacity: error ? 0.1 : 0.2 + level * 0.5, scale: reduced ? 1 : 1 + level * 0.6 }} transition={{ duration: 0.15 }} />
      {[0, 1, 2].map((ring) => <motion.div key={`${state}-${ring}`} className="voice-orb-ring absolute h-36 w-36 rounded-full"
        animate={still ? { scale: 1 + ring * 0.16, opacity: 0.12 } : speaking ? { scale: [1, 1.75 + level * 0.15], opacity: [0.5, 0] } : active ? { scale: 1 + ring * 0.18 + level * (0.2 + ring * 0.16), opacity: 0.12 + level * 0.5 } : { scale: [1 + ring * 0.16, 1.12 + ring * 0.16, 1 + ring * 0.16], opacity: [0.12, 0.3, 0.12] }}
        transition={still || (active && !speaking) ? { duration: 0.15 } : { duration: speaking ? 2 : 3, repeat: Infinity, delay: ring * 0.45, ease: 'easeInOut' }} />)}
      <motion.div className="voice-orb-core relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full"
        animate={{ scale: still ? 1 : active && level > 0.02 ? 1 + level * 0.12 : [1, 1.035, 1] }}
        transition={still || (active && level > 0.02) ? { duration: 0.15 } : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
        {agent.icon_url ? <img src={agent.icon_url} alt="" className="h-full w-full object-cover opacity-80" /> : muted && !speaking ? <MicOff className="h-10 w-10" /> : <AudioLines className="h-12 w-12" />}
      </motion.div>
    </div>
    <p role="status" aria-live="polite" className="text-base font-medium">{label}</p>
    {!error && <div role="meter" aria-label={speaking ? 'Nível da voz do agente' : 'Nível do microfone'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)} className="mt-3 flex h-5 items-center gap-1.5" >
      {[0.45, 0.7, 1, 0.7, 0.45].map((weight, index) => <motion.span key={index} className="w-1 rounded-full bg-current" animate={{ height: 3 + level * weight * 17, opacity: 0.3 + level * 0.7 }} transition={{ duration: reduced ? 0 : 0.1 }} />)}
    </div>}
  </div>;
}
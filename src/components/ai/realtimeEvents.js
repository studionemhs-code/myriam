export default function realtimeEvents({ agentName, setStatus, setError, setHeard, setReply, onTranscript }) {
  let speaking = false;
  return (event) => {
    const message = JSON.parse(event.data);
    switch (message.type) {
      case 'input_audio_buffer.speech_started':
        setStatus('Sua voz foi detectada'); break;
      case 'input_audio_buffer.speech_stopped':
        setStatus('Preparando resposta...'); break;
      case 'conversation.item.input_audio_transcription.completed':
        setHeard(message.transcript || '');
        if (message.transcript) onTranscript?.('user', message.transcript, message.item_id || message.event_id);
        break;
      case 'response.output_audio_transcript.done':
        if (message.transcript) onTranscript?.('assistant', message.transcript, message.item_id || message.event_id);
        break;
      case 'conversation.item.input_audio_transcription.failed':
        setError('Não foi possível reconhecer sua fala. Encerre e tente novamente.'); break;
      case 'response.created':
        setReply(''); setStatus('Preparando resposta...'); break;
      case 'response.output_audio_transcript.delta':
        setReply((text) => text + (message.delta || '')); break;
      case 'output_audio_buffer.started':
        speaking = true; setStatus(`${agentName} está falando`); break;
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared':
        speaking = false; setStatus('Pode falar — aguardando sua voz'); break;
      case 'response.done':
        if (message.response?.status === 'failed') {
          const detail = message.response.status_details?.error;
          setError(detail?.code === 'insufficient_quota' ? 'O serviço de voz está sem saldo ou cota disponível.' : (detail?.message || 'Não foi possível gerar a resposta por voz.'));
        } else if (!speaking) setStatus('Pode falar — aguardando sua voz');
        break;
      case 'error':
        setError(message.error?.message || 'Ocorreu um erro na conversa por voz.'); break;
      default: break;
    }
  };
}
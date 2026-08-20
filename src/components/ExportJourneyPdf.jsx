import React, { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { daysSince, nextRenewal, formatDuration, parseDate } from '@/lib/marianDates';

const fmt = (d) => {
  if (!d) return '—';
  const s = typeof d === 'string' && d.length === 10 ? d + 'T00:00:00' : d;
  try {
    return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch (e) {
    return '—';
  }
};

export default function ExportJourneyPdf() {
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(false);

  const buildPdf = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [progressList, reflections, daysList, journeyParts, journeys] = await Promise.all([
        base44.entities.UserProgress.filter({ created_by_id: user.id }).catch(() => []),
        base44.entities.Reflection.filter({ created_by_id: user.id }, 'day_number').catch(() => []),
        base44.entities.PreparationDay.list('day_number', 33).catch(() => []),
        base44.entities.JourneyParticipant.filter({ created_by_id: user.id }).catch(() => []),
        base44.entities.CollectiveJourney.list('-created_date', 50).catch(() => [])
      ]);
      const progress = progressList[0];
      const dayTitles = {};
      daysList.forEach((d) => { dayTitles[d.day_number] = d.title; });
      const journeyMap = {};
      journeys.forEach((j) => { journeyMap[j.id] = j; });

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 48;
      let y = margin;

      const ensure = (needed) => {
        if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
      };
      const write = (text, size, style = 'normal', color = [60, 40, 90]) => {
        doc.setFont('helvetica', style);
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
        const lines = doc.splitTextToSize(String(text), pageW - margin * 2);
        lines.forEach((ln) => {
          ensure(size + 5);
          doc.text(ln, margin, y);
          y += size + 5;
        });
      };
      const section = (title) => {
        y += 14;
        ensure(50);
        doc.setDrawColor(201, 161, 74);
        doc.setLineWidth(1.5);
        doc.line(margin, y, margin + 44, y);
        y += 18;
        write(title, 13, 'bold', [90, 45, 130]);
        y += 4;
      };

      // Cabeçalho
      doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(90, 45, 130);
      doc.text('Theotokos', margin, y); y += 26;
      write('Minha Caminhada de Consagração', 12, 'normal', [120, 100, 140]);
      y += 6;
      doc.setDrawColor(201, 161, 74); doc.setLineWidth(1);
      doc.line(margin, y, pageW - margin, y); y += 22;

      // Estado atual e dados da consagração
      section('Estado atual e Consagração');
      write(`Nome: ${user.full_name || user.email || '—'}`, 11);
      const statusLabel = { interessado: 'Interessado', preparacao: 'Em preparação', consagrado: 'Consagrado' }[user.status] || '—';
      write(`Estado atual: ${statusLabel}`, 11);
      if (user.consecration_date) {
        write(`Data da Consagração: ${fmt(user.consecration_date)}`, 11);
        const since = daysSince(user.consecration_date);
        write(`Dias de consagrado: ${since.toLocaleString('pt-BR')} (${formatDuration(user.consecration_date)})`, 11);
      }
      if (user.preparation_start_date) write(`Início da preparação: ${fmt(user.preparation_start_date)}`, 11);
      if (user.target_consecration_date) write(`Previsão da Consagração: ${fmt(user.target_consecration_date)}`, 11);
      if (progress?.completed_date) write(`Conclusão da preparação: ${fmt(progress.completed_date)}`, 11);

      // Renovações
      if (user.consecration_date) {
        section('Renovações');
        const renewal = nextRenewal(user.consecration_date, user.last_renewal_date);
        if (user.last_renewal_date) write(`Última renovação: ${fmt(user.last_renewal_date)}`, 11);
        if (renewal) write(`Próxima renovação: ${fmt(renewal.toISOString().slice(0, 10))}`, 11);
        const renewals = user.renewals || [];
        if (renewals.length > 0) {
          write(`Histórico de renovações (${renewals.length}):`, 11, 'bold');
          renewals.forEach((r, idx) => {
            write(`  ${idx === 0 ? 'Consagração' : 'Renovação ' + idx}: ${fmt(r)}`, 10, 'normal', [100, 90, 120]);
          });
        } else {
          write('Nenhuma renovação registrada ainda.', 11, 'normal', [130, 120, 145]);
        }
      }

      // Preparação (Caminho)
      section('Preparação (Caminho de 33 dias)');
      if (progress) {
        const completed = progress.completed_days || [];
        write(`Dia atual: ${progress.current_day || 1} de 33`, 11);
        write(`Dias concluídos: ${completed.length}/33`, 11);
        write(`Status: ${progress.status === 'concluida' ? 'Concluída' : progress.status === 'pausada' ? 'Pausada' : 'Ativa'}`, 11);
        if (completed.length > 0) {
          write('Dias concluídos:', 11, 'bold');
          for (let i = 0; i < completed.length; i += 6) {
            write(completed.slice(i, i + 6).map((n) => `Dia ${n}${dayTitles[n] ? ' · ' + dayTitles[n] : ''}`).join('    '), 10);
          }
        }
      } else {
        write('Preparação ainda não iniciada.', 11, 'normal', [130, 120, 145]);
      }

      // Jornadas Coletivas participadas
      section(`Jornadas Coletivas participadas (${journeyParts.length})`);
      if (journeyParts.length === 0) {
        write('Nenhuma jornada coletiva participada.', 11, 'normal', [130, 120, 145]);
      } else {
        journeyParts.forEach((jp) => {
          const j = journeyMap[jp.journey_id];
          ensure(60);
          write(j?.title || 'Jornada sem título', 11, 'bold', [90, 45, 130]);
          const meta = [
            jp.joined_date ? `Entrou em: ${fmt(jp.joined_date)}` : null,
            j?.journey_type === 'renovacao' ? 'Renovação' : 'Consagração',
            `Progresso: ${jp.progress || 0}%`
          ].filter(Boolean).join('  ·  ');
          if (meta) write(meta, 9, 'normal', [130, 120, 145]);
          if (j?.start_date && j?.end_date) {
            write(`Período: ${fmt(j.start_date)} a ${fmt(j.end_date)}`, 9, 'normal', [130, 120, 145]);
          }
          if (jp.completed_steps?.length > 0) {
            write(`Etapas concluídas: ${jp.completed_steps.length}`, 9, 'normal', [130, 120, 145]);
          }
          y += 8;
        });
      }

      // Reflexões
      section(`Reflexões da preparação (${reflections.length})`);
      if (reflections.length === 0) {
        write('Nenhuma reflexão registrada durante a preparação.', 11, 'normal', [130, 120, 145]);
      } else {
        reflections.forEach((r) => {
          ensure(70);
          write(`Dia ${r.day_number}${dayTitles[r.day_number] ? ' — ' + dayTitles[r.day_number] : ''}`, 11, 'bold', [90, 45, 130]);
          const meta = [
            r.created_date ? `Registrada em: ${fmt(r.created_date)}` : null,
            r.mood ? `Estado de espírito: ${r.mood}` : null
          ].filter(Boolean).join('  ·  ');
          if (meta) write(meta, 9, 'normal', [130, 120, 145]);
          write(r.content || '—', 11);
          y += 10;
        });
      }

      // Rodapé
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(160, 150, 170);
        doc.text(`Theotokos · gerado em ${new Date().toLocaleDateString('pt-BR')} · página ${i}/${pageCount}`, margin, pageH - 28);
      }

      const fileName = `minha-caminhada-theotokos-${(user.full_name || user.email || 'usuario').toLowerCase().replace(/\s+/g, '-')}.pdf`;
      doc.save(fileName);
    } catch (e) {
      console.error(e);
      alert('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={buildPdf}
      disabled={loading || !user}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:border-gold/40 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin text-gold" /> : <FileDown className="h-4 w-4 text-gold" />}
      {loading ? 'Gerando PDF...' : 'Exportar minha caminhada (PDF)'}
    </button>
  );
}
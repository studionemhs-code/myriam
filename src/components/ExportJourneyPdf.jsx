import React, { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';

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
      const [progressList, reflections, daysList] = await Promise.all([
        base44.entities.UserProgress.filter({ created_by_id: user.id }).catch(() => []),
        base44.entities.Reflection.filter({ created_by_id: user.id }, 'day_number').catch(() => []),
        base44.entities.PreparationDay.list('day_number', 33).catch(() => [])
      ]);
      const progress = progressList[0];
      const dayTitles = {};
      daysList.forEach((d) => { dayTitles[d.day_number] = d.title; });

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
      write('Minha Jornada de Consagração', 12, 'normal', [120, 100, 140]);
      y += 6;
      doc.setDrawColor(201, 161, 74); doc.setLineWidth(1);
      doc.line(margin, y, pageW - margin, y); y += 22;

      // Resumo
      section('Resumo');
      write(`Nome: ${user.full_name || user.email || '—'}`, 11);
      const statusLabel = { interessado: 'Interessado', preparacao: 'Em preparação', consagrado: 'Consagrado' }[user.status] || '—';
      write(`Estado: ${statusLabel}`, 11);
      if (user.preparation_start_date) write(`Início da preparação: ${fmt(user.preparation_start_date)}`, 11);
      if (user.target_consecration_date) write(`Previsão da Consagração: ${fmt(user.target_consecration_date)}`, 11);
      if (user.consecration_date) write(`Data da Consagração: ${fmt(user.consecration_date)}`, 11);
      if (progress?.completed_date) write(`Conclusão da preparação: ${fmt(progress.completed_date)}`, 11);
      if (user.last_renewal_date) write(`Última renovação: ${fmt(user.last_renewal_date)}`, 11);

      // Dias concluídos
      const completed = progress?.completed_days || [];
      section(`Dias concluídos (${completed.length}/33)`);
      if (completed.length === 0) {
        write('Nenhum dia concluído ainda.', 11, 'normal', [130, 120, 145]);
      } else {
        for (let i = 0; i < completed.length; i += 6) {
          write(completed.slice(i, i + 6).map((n) => `Dia ${n}${dayTitles[n] ? ' · ' + dayTitles[n] : ''}`).join('    '), 10);
        }
      }

      // Reflexões
      section(`Reflexões (${reflections.length})`);
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

      const fileName = `jornada-theotokos-${(user.full_name || user.email || 'usuario').toLowerCase().replace(/\s+/g, '-')}.pdf`;
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
      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm hover:bg-muted disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-gold" /> : <FileDown className="h-5 w-5 text-gold" />}
      {loading ? 'Gerando PDF...' : 'Exportar minha jornada (PDF)'}
    </button>
  );
}
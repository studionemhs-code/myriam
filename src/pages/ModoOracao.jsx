import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabaseEntities } from '@/api/supabase/entities';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import ImmersiveAudioPrayer from '@/components/oracao/ImmersiveAudioPrayer';

export default function ModoOracao() {
  const { day } = useParams();
  const dayNum = parseInt(day, 10);
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [dayData, setDayData] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const all = await supabaseEntities.PreparationDay.filter({ day_number: dayNum });
        setDayData(all[0] || null);
      } catch (e) {
        /* ignore */
      } finally {
        setLoaded(true);
      }
    })();
  }, [user, dayNum]);

  const exit = () => navigate(`/caminho/dia/${dayNum}`);

  return (
    <ImmersiveAudioPrayer
      open={loaded}
      onClose={exit}
      title={dayData?.title || `Dia ${dayNum}`}
      dayLabel={`Dia ${dayNum}`}
      audioUrl={dayData?.audio_url}
      youtubeId={dayData?.youtube_id}
      coverUrl={dayData?.image_url}
      textHtml={dayData?.text}
      prayerText={dayData?.prayer}
      prayerId={`day:${dayNum}`}
      prayerTitle={dayData?.title || `Dia ${dayNum}`}
      source="caminho"
    />
  );
}
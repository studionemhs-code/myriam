import React from 'react';

const dateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

import CalendarDayCell from './CalendarDayCell';

export default function CalendarGrid({ viewMonth, stepsByDate, startDate, endDate, onStepClick, onDayClick }) {
  const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(gridStart.getDate() - firstDay.getDay());

  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const todayStr = dateStr(new Date());

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="py-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {wd}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const ds = dateStr(d);
          const inMonth = d.getMonth() === viewMonth.getMonth();
          const hasRange = startDate || endDate;
          const inRange = hasRange && (!startDate || ds >= startDate) && (!endDate || ds <= endDate);
          const isToday = ds === todayStr;
          const daySteps = stepsByDate[ds] || [];

          return (
            <CalendarDayCell
              key={ds}
              date={d}
              dateStrValue={ds}
              inMonth={inMonth}
              inRange={inRange}
              isToday={isToday}
              steps={daySteps}
              onStepClick={onStepClick}
              onDayClick={onDayClick}
            />
          );
        })}
      </div>
    </div>
  );
}
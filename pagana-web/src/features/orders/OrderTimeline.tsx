import type { OrderTimelineEvent } from '@/api/orders';

function relativeTime(iso: string): string {
  const deltaSeconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, seconds] of units) {
    if (Math.abs(deltaSeconds) >= seconds) {
      return formatter.format(Math.round(deltaSeconds / seconds), unit);
    }
  }
  return 'just now';
}

/** Vertical timeline, oldest first (the API returns events ascending). */
export function OrderTimeline({ events }: { events: OrderTimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No updates yet.</p>;
  }

  return (
    <ol className="space-y-0">
      {events.map((event, index) => (
        <li key={`${event.event_type}-${event.created_at}`} className="relative flex gap-3 pb-5 last:pb-0">
          <div className="flex flex-col items-center">
            <span
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                index === events.length - 1 ? 'bg-brand' : 'bg-border'
              }`}
              aria-hidden
            />
            {index < events.length - 1 && (
              <span className="w-px flex-1 bg-border" aria-hidden />
            )}
          </div>
          <div className="min-w-0 -mt-0.5">
            <p className="text-sm">{event.message}</p>
            <p
              className="text-xs text-muted-foreground"
              title={new Date(event.created_at).toLocaleString()}
            >
              {relativeTime(event.created_at)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

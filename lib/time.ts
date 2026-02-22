export function getJstDayRange(date = new Date()) {
  const jst = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const startJst = new Date(jst);
  startJst.setHours(0, 0, 0, 0);
  const endJst = new Date(startJst);
  endJst.setDate(endJst.getDate() + 1);

  const offset = 9 * 60;
  const utcStart = new Date(startJst.getTime() - offset * 60 * 1000);
  const utcEnd = new Date(endJst.getTime() - offset * 60 * 1000);
  return { utcStart, utcEnd };
}

export function formatYmdHm(date: string | Date) {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(date));
}

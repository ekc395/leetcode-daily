const PST_OFFSET_MS = 8 * 60 * 60 * 1000;

export function todayPst(): string {
    const now = new Date();
    const pst = new Date(now.getTime() - PST_OFFSET_MS);
    return pst.toISOString().split("T")[0]!;
}

export function shiftDay(isoDate: string, days: number): string {
    const d = new Date(`${isoDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split("T")[0]!;
}

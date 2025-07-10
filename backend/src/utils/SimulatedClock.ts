export class SimulatedClock {
    static readonly SIMULATED_DAY_IN_REAL_MS = 2 * 60 * 1000; // 2 minutes real = 1 simulated day
    static readonly REAL_DAY_IN_MS = 24 * 60 * 60 * 1000;

    static readonly simulationStartSimulatedEpoch = 2524608000; //seconds, might be milliseconds. We need to get this value from THoH

    static readonly simulationStartReal = Date.now();
    static readonly simulationStartSimulated = new Date(this.simulationStartSimulatedEpoch * 1000); //dont multiply by a 1000 if THoH decides to send us the start unix epoch in milliseconds.

    static getSimulatedTime(realTime: Date = new Date()): Date {
        const scaleFactor = this.REAL_DAY_IN_MS / this.SIMULATED_DAY_IN_REAL_MS;
        const simulatedElapsed = (realTime.getTime() - this.simulationStartReal) * scaleFactor;
        return new Date(this.simulationStartSimulated.getTime() + simulatedElapsed);
    }

    static getSimulatedStartAndEndOfToday(): { start: Date; end: Date } {
        const now = this.getSimulatedTime();
        const start = new Date(now);
        start.setUTCHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);

        return { start, end };
    }
}

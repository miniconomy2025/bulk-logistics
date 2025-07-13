export class SimulatedClock {
    private static instance: SimulatedClock;

    static readonly SIMULATED_DAY_IN_REAL_MS = 60 * 1000;
    private static readonly SIMULATED_START_DATE = new Date("2050-01-01T00:00:00.000Z");

    private realStartTimeEpochMs: number | null = null;

    private constructor() {}

    public static getInstance(): SimulatedClock {
        if (!SimulatedClock.instance) {
            SimulatedClock.instance = new SimulatedClock();
        }
        return SimulatedClock.instance;
    }

    /**
     * Initializes the clock with the real-world start time from Thoh.
     * @param startTimeEpochMs The real-world start time in MILLISECONDS.
     */
    public initialize(startTimeEpochMs: number): void {
        console.log(`SimulatedClock initialized. Real-world start epoch: ${startTimeEpochMs}`);
        this.realStartTimeEpochMs = startTimeEpochMs;
    }

    /**
     * Calculates the "true" current simulated date by scaling the elapsed real time.
     * @returns The current simulated Date object.
     */
    public getCurrentDate(): Date {
        if (this.realStartTimeEpochMs === null) {
            throw new Error("Cannot get current date: The clock has not been initialized.");
        }

        const nowMs = Date.now();
        const realTimeElapsedMs = nowMs - this.realStartTimeEpochMs;
        const simulatedDaysPassed = Math.floor(realTimeElapsedMs / SimulatedClock.SIMULATED_DAY_IN_REAL_MS);

        const currentDate = new Date(SimulatedClock.SIMULATED_START_DATE.getTime());
        currentDate.setUTCDate(currentDate.getUTCDate() + simulatedDaysPassed);

        return currentDate;
    }

    /**
     * Resets the clock's state for a new simulation run.
     */
    public reset(): void {
        this.realStartTimeEpochMs = null;
        console.log("SimulatedClock has been reset.");
    }
}

export const simulatedClock = SimulatedClock.getInstance();

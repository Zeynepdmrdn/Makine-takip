export interface SensorReading {
  id: number;
  machineId: number;
  temperature: number;
  pressure: number;
  speed: number;
  recordedAt: string;
}

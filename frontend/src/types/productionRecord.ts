export interface ProductionRecord {
  id: number;
  workOrderId: number;
  expectedQuantity: number;
  quantity: number;
  deviation: number;
  recordedAt: string;
}

import { calculateEquityMonteCarlo } from '../poker/equity';

export interface EquityWorkerRequest {
  hands: string[];
  board?: string[];
  iterations?: number;
}

self.onmessage = (e: MessageEvent<EquityWorkerRequest>) => {
  const { hands, board = [], iterations = 5000 } = e.data;
  const result = calculateEquityMonteCarlo(hands, board, iterations);
  (self as unknown as Worker).postMessage(result);
};

// Mobile/static build stub — AI features require a server environment

export type ReceiveWeeklyProfitSummaryInput = Record<string, never>;
export type ReceiveWeeklyProfitSummaryOutput = { summary: string };
export type WeeklyFinancialData = {
  startDate: string;
  endDate: string;
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
};

export async function receiveWeeklyProfitSummary(
  input: ReceiveWeeklyProfitSummaryInput = {}
): Promise<ReceiveWeeklyProfitSummaryOutput> {
  throw new Error('AI analysis is not available in the mobile app.');
}

'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a natural language summary of weekly profit trends and identifying potential financial leakages for a business owner.
 *
 * - receiveWeeklyProfitSummary - A function that initiates the weekly profit summary generation process.
 * - ReceiveWeeklyProfitSummaryInput - The input type for the receiveWeeklyProfitSummary function.
 * - ReceiveWeeklyProfitSummaryOutput - The return type for the receiveWeeklyProfitSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input schema for the flow
const ReceiveWeeklyProfitSummaryInputSchema = z.object({});
export type ReceiveWeeklyProfitSummaryInput = z.infer<typeof ReceiveWeeklyProfitSummaryInputSchema>;

// Output schema for the flow
const ReceiveWeeklyProfitSummaryOutputSchema = z.object({
  summary: z.string().describe('A natural language summary of weekly profit trends and potential financial leakages.'),
});
export type ReceiveWeeklyProfitSummaryOutput = z.infer<typeof ReceiveWeeklyProfitSummaryOutputSchema>;

// Define the tool to fetch weekly financial data
const WeeklyFinancialDataSchema = z.object({
  startDate: z.string().describe('The start date of the financial week (YYYY-MM-DD).'),
  endDate: z.string().describe('The end date of the financial week (YYYY-MM-DD).'),
  totalSales: z.number().describe('Total sales for the week.'),
  totalExpenses: z.number().describe('Total expenses for the week.'),
  netProfit: z.number().describe('Net profit for the week (total sales minus total expenses).'),
  previousWeekNetProfit: z.number().optional().describe('Net profit for the previous week, for trend comparison.'),
  salesBreakdown: z.array(z.object({
    category: z.string().describe('Sales category name.'),
    amount: z.number().describe('Amount sold in this category.'),
  })).optional().describe('Detailed breakdown of sales by category.'),
  expenseBreakdown: z.array(z.object({
    category: z.string().describe('Expense category name.'),
    amount: z.number().describe('Amount spent in this category.'),
  })).optional().describe('Detailed breakdown of expenses by category.'),
});
export type WeeklyFinancialData = z.infer<typeof WeeklyFinancialDataSchema>;

const getWeeklyFinancialData = ai.defineTool(
  {
    name: 'getWeeklyFinancialData',
    description: 'Fetches the financial data for the last completed week, including total sales, total expenses, and calculated profit, along with optional breakdowns and previous week data for trend analysis.',
    inputSchema: z.void(), // No explicit input needed for 'last week'
    outputSchema: WeeklyFinancialDataSchema,
  },
  async () => {
    // Mock implementation for demonstration purposes.
    // In a real application, this would fetch data from Firebase.
    const now = new Date();
    // Get the last Sunday (end of last week)
    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - (now.getDay() || 7)); 
    lastSunday.setHours(23, 59, 59, 999); // Set to end of day

    // Get the Monday of the last week
    const lastMonday = new Date(lastSunday);
    lastMonday.setDate(lastSunday.getDate() - 6);
    lastMonday.setHours(0, 0, 0, 0); // Set to start of day

    const sales = Math.floor(Math.random() * 10000) + 5000;
    const expenses = Math.floor(Math.random() * 3000) + 1000;
    const previousWeekSales = Math.floor(Math.random() * 9000) + 4000;
    const previousWeekExpenses = Math.floor(Math.random() * 2500) + 800;

    return {
      startDate: lastMonday.toISOString().split('T')[0],
      endDate: lastSunday.toISOString().split('T')[0],
      totalSales: sales,
      totalExpenses: expenses,
      netProfit: sales - expenses,
      previousWeekNetProfit: previousWeekSales - previousWeekExpenses,
      salesBreakdown: [
        { category: 'Electronics', amount: sales * 0.4 },
        { category: 'Apparel', amount: sales * 0.3 },
        { category: 'Home Goods', amount: sales * 0.2 },
        { category: 'Others', amount: sales * 0.1 },
      ],
      expenseBreakdown: [
        { category: 'Rent', amount: expenses * 0.3 },
        { category: 'Salaries', amount: expenses * 0.4 },
        { category: 'Utilities', amount: expenses * 0.15 },
        { category: 'Marketing', amount: expenses * 0.15 },
      ],
    };
  }
);

// Define the prompt that uses the financial data
const weeklyProfitSummaryPrompt = ai.definePrompt({
  name: 'weeklyProfitSummaryPrompt',
  input: {
    schema: WeeklyFinancialDataSchema, // The prompt's input will be the tool's output
  },
  output: {
    schema: ReceiveWeeklyProfitSummaryOutputSchema,
  },
  system: `You are an AI financial analyst for Dokandar, a small business. Your task is to provide a concise, natural language summary of the weekly financial performance, highlighting profit trends and identifying potential areas of financial leakage. Be insightful and actionable.`,
  prompt: `Generate a financial summary for the week from {{{startDate}}} to {{{endDate}}}.

### Weekly Financial Data:
- Total Sales: $\u0025{{{totalSales}}}
- Total Expenses: $\u0025{{{totalExpenses}}}
- Net Profit: $\u0025{{{netProfit}}}
{{#if previousWeekNetProfit}}
- Previous Week's Net Profit: $\u0025{{{previousWeekNetProfit}}}
{{/if}}

{{#if salesBreakdown}}
Sales Breakdown:
{{#each salesBreakdown}}- {{category}}: $\u0025{{amount}}
{{/each}}
{{/if}}

{{#if expenseBreakdown}}
Expense Breakdown:
{{#each expenseBreakdown}}- {{category}}: $\u0025{{amount}}
{{/each}}
{{/if}}

Based on this data, provide a summary focusing on:
1.  **Profit Trend**: Compare the current week's net profit with the previous week's (if available). Describe if it's up, down, or stable and by how much.
2.  **Key Performance Areas**: Identify which sales categories performed well and which expenses were significant.
3.  **Potential Leakages/Areas for Improvement**: Based on the data, suggest where financial leakages might be occurring or areas to investigate for cost reduction or revenue enhancement.
4.  **Overall Insight**: A concluding sentence summarizing the week's performance.

Ensure the summary is easy for a business owner to understand without extensive financial background. The summary should be concise and actionable.
`,
});

const weeklyProfitSummaryFlow = ai.defineFlow(
  {
    name: 'weeklyProfitSummaryFlow',
    inputSchema: ReceiveWeeklyProfitSummaryInputSchema,
    outputSchema: ReceiveWeeklyProfitSummaryOutputSchema,
  },
  async input => {
    // Call the tool to get the weekly financial data
    const financialData = await getWeeklyFinancialData({}); // Pass an empty object as input for z.void() tool input

    // Call the prompt with the retrieved financial data
    const {output} = await weeklyProfitSummaryPrompt(financialData);

    return output!;
  }
);

export async function receiveWeeklyProfitSummary(
  input: ReceiveWeeklyProfitSummaryInput = {} // Provide a default empty object for truly no input
): Promise<ReceiveWeeklyProfitSummaryOutput> {
  return weeklyProfitSummaryFlow(input);
}

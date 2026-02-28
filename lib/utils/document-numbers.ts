function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function padSequence(value: number): string {
  return String(value).padStart(3, "0");
}

export async function getNextMonthlyDocumentNumber(options: {
  supabase: any;
  table: "invoices" | "quotes";
  column: "invoice_number" | "quote_number";
  prefix: string;
  date?: Date;
}): Promise<string> {
  const { supabase, table, column, prefix } = options;
  const date = options.date ?? new Date();
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const base = `${prefix}-${year}-${month}`;
  const likePattern = `${base}-%`;

  const { data } = await supabase
    .from(table)
    .select(column)
    .like(column, likePattern)
    .order(column, { ascending: false })
    .limit(300);

  let maxSequence = 0;
  const matcher = new RegExp(`^${escapeRegExp(base)}-(\\d+)$`);

  for (const row of data ?? []) {
    const value = row?.[column];
    if (typeof value !== "string") continue;
    const match = value.match(matcher);
    if (!match) continue;
    const sequence = Number.parseInt(match[1], 10);
    if (Number.isFinite(sequence) && sequence > maxSequence) {
      maxSequence = sequence;
    }
  }

  return `${base}-${padSequence(maxSequence + 1)}`;
}

export async function getNextInvoiceNumber(supabase: any, date?: Date): Promise<string> {
  return getNextMonthlyDocumentNumber({
    supabase,
    table: "invoices",
    column: "invoice_number",
    prefix: "GNR",
    date,
  });
}

export async function getNextQuoteNumber(supabase: any, date?: Date): Promise<string> {
  return getNextMonthlyDocumentNumber({
    supabase,
    table: "quotes",
    column: "quote_number",
    prefix: "PRE",
    date,
  });
}

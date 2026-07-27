import Tesseract from 'tesseract.js';
import nlp from 'compromise';

export interface ParsedLineItem {
  id: string;
  name: string;
  price: number | null;
}

export async function parseReceiptImage(imageSource: string | File): Promise<ParsedLineItem[]> {
  const worker = await Tesseract.createWorker('eng');
  const ret = await worker.recognize(imageSource);
  await worker.terminate();

  const lines = (ret.data as any).lines.map((l: any) => l.text.trim()).filter((l: string) => l.length > 0);
  const parsedItems: ParsedLineItem[] = [];

  for (const line of lines) {
    const doc = nlp(line);
    const moneyMatches = doc.money();
    
    let price: number | null = null;
    let name = line;

    if (moneyMatches.found) {
      const mStr = moneyMatches.out('array')[0];
      const numMatch = mStr?.match(/\b(\d+(?:\.\d+)?)\b/);
      if (numMatch) {
        price = parseFloat(numMatch[1]);
        name = doc.not(moneyMatches).out('text');
      }
    } else {
      // Fallback regex for prices without currency symbols at the end of the line (e.g. "Item 4.99")
      const fallbackRegex = /([0-9]+\.[0-9]{2})$/;
      const match = line.match(fallbackRegex);
      if (match) {
         price = parseFloat(match[1]);
         name = line.replace(fallbackRegex, '').trim();
      }
    }

    // Clean up name
    name = name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
    
    // Ignore lines that are probably just noise, totals, or tax
    const lowerName = name.toLowerCase();
    if (
      lowerName.includes('total') || 
      lowerName.includes('tax') || 
      lowerName.includes('subtotal') ||
      lowerName.includes('cash') ||
      lowerName.includes('change') ||
      lowerName.includes('visa') ||
      lowerName.includes('mastercard') ||
      lowerName.includes('balance') ||
      lowerName.length < 3
    ) {
      continue;
    }

    parsedItems.push({
      id: Math.random().toString(36).substring(7),
      name: name.charAt(0).toUpperCase() + name.slice(1),
      price
    });
  }

  return parsedItems;
}

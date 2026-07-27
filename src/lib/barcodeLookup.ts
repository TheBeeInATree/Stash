export interface BarcodeLookupResult {
  name?: string;
  brand?: string;
}

const lookupUrl = async (url: string): Promise<BarcodeLookupResult | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status === 1 && data.product) {
      return {
        name: data.product.product_name || data.product.product_name_en,
        brand: data.product.brands
      };
    }
  } catch (err) {
    console.error('Barcode lookup failed for url', url, err);
  }
  return null;
};

export async function lookupBarcode(barcode: string, categoryHint?: string): Promise<BarcodeLookupResult | null> {
  const foodApi = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
  const beautyApi = `https://world.openbeautyfacts.org/api/v2/product/${barcode}.json`;
  const productsApi = `https://world.openproductsfacts.org/api/v2/product/${barcode}.json`;

  let order = [productsApi, foodApi, beautyApi];
  
  if (categoryHint) {
    const hint = categoryHint.toLowerCase();
    if (hint.includes('food') || hint.includes('grocery') || hint.includes('snack') || hint.includes('drink')) {
      order = [foodApi, productsApi, beautyApi];
    } else if (hint.includes('beauty') || hint.includes('toiletries') || hint.includes('cosmetics') || hint.includes('personal')) {
      order = [beautyApi, productsApi, foodApi];
    }
  }

  for (const url of order) {
    const result = await lookupUrl(url);
    if (result && result.name) {
      return result;
    }
  }

  return null;
}

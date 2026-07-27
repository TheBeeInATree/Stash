import { db } from './db';
import { v4 as uuidv4 } from 'uuid';

export async function seedDatabase() {
  const count = await db.categories.count();
  if (count > 0) return; // Already seeded

  const now = Date.now();

  const clothingId = uuidv4();
  const foodId = uuidv4();
  const toiletriesId = uuidv4();
  const medicineId = uuidv4();

  await db.categories.bulkAdd([
    {
      id: clothingId,
      name: 'Clothing',
      icon: 'Shirt',
      fieldTemplate: [
        { name: 'Brand', type: 'text' },
        { name: 'Size', type: 'dropdown', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
        { name: 'Color', type: 'text' }
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: foodId,
      name: 'Food & Ingredients',
      icon: 'Apple',
      fieldTemplate: [
        { name: 'Expiration Date', type: 'date', required: true },
        { name: 'Weight', type: 'weight' },
        { name: 'Servings', type: 'count' }
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: toiletriesId,
      name: 'Toiletries',
      icon: 'Droplets',
      fieldTemplate: [
        { name: 'Volume', type: 'volume' },
        { name: 'Brand', type: 'text' }
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: medicineId,
      name: 'Medicine',
      icon: 'Pill',
      fieldTemplate: [
        { name: 'Expiration Date', type: 'date', required: true },
        { name: 'Active Ingredient', type: 'text' },
        { name: 'Dosage', type: 'text' },
        { name: 'Pill Count', type: 'count' }
      ],
      createdAt: now,
      updatedAt: now,
    }
  ]);

  // Seed a sample custom formula for Clothing
  await db.formulas.bulkAdd([
    {
      id: uuidv4(),
      categoryId: clothingId,
      name: 'Cost per Wear',
      expression: 'purchasePrice / usageCount',
      createdAt: now,
      updatedAt: now,
    }
  ]);
  
  console.log('Database seeded with initial categories.');
}

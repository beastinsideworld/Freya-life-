export interface CatalogArticle {
  name: string;
  aisle: string;
  unit: string;
}

export const GROCERY_AISLES = [
  'Fruits & Légumes',
  'Viandes & Poissons',
  'Produits Frais',
  'Épicerie',
  'Surgelés',
  'Hygiène & Maison'
] as const;

export const GROCERY_CATALOG: CatalogArticle[] = [
  { name: 'Tomates', aisle: 'Fruits & Légumes', unit: 'g' },
  { name: 'Tomates cerises', aisle: 'Fruits & Légumes', unit: 'g' },
  { name: 'Salade', aisle: 'Fruits & Légumes', unit: 'pièce' },
  { name: 'Carottes', aisle: 'Fruits & Légumes', unit: 'kg' },
  { name: 'Oignons', aisle: 'Fruits & Légumes', unit: 'pièce' },
  { name: 'Ail', aisle: 'Fruits & Légumes', unit: 'pièce' },
  { name: 'Pommes de terre', aisle: 'Fruits & Légumes', unit: 'kg' },
  { name: 'Courgettes', aisle: 'Fruits & Légumes', unit: 'pièce' },
  { name: 'Poivrons', aisle: 'Fruits & Légumes', unit: 'pièce' },
  { name: 'Concombre', aisle: 'Fruits & Légumes', unit: 'pièce' },
  { name: 'Avocat', aisle: 'Fruits & Légumes', unit: 'pièce' },
  { name: 'Bananes', aisle: 'Fruits & Légumes', unit: 'pièce' },
  { name: 'Pommes', aisle: 'Fruits & Légumes', unit: 'pièce' },
  { name: 'Citrons', aisle: 'Fruits & Légumes', unit: 'pièce' },
  { name: 'Épinards', aisle: 'Fruits & Légumes', unit: 'sachet' },
  { name: 'Brocolis', aisle: 'Fruits & Légumes', unit: 'pièce' },
  { name: 'Champignons', aisle: 'Fruits & Légumes', unit: 'g' },
  { name: 'Herbes fraîches', aisle: 'Fruits & Légumes', unit: 'botte' },

  { name: 'Poulet', aisle: 'Viandes & Poissons', unit: 'g' },
  { name: 'Escalopes de poulet', aisle: 'Viandes & Poissons', unit: 'g' },
  { name: 'Boeuf haché', aisle: 'Viandes & Poissons', unit: 'g' },
  { name: 'Steak', aisle: 'Viandes & Poissons', unit: 'pièce' },
  { name: 'Jambon', aisle: 'Viandes & Poissons', unit: 'tranche' },
  { name: 'Saumon', aisle: 'Viandes & Poissons', unit: 'pièce' },
  { name: 'Cabillaud', aisle: 'Viandes & Poissons', unit: 'pièce' },
  { name: 'Crevettes', aisle: 'Viandes & Poissons', unit: 'g' },
  { name: 'Thon en boîte', aisle: 'Viandes & Poissons', unit: 'boîte' },
  { name: 'Lardons', aisle: 'Viandes & Poissons', unit: 'g' },

  { name: 'Lait', aisle: 'Produits Frais', unit: 'L' },
  { name: 'Beurre', aisle: 'Produits Frais', unit: 'g' },
  { name: 'Oeufs', aisle: 'Produits Frais', unit: 'pièce' },
  { name: 'Yaourt nature', aisle: 'Produits Frais', unit: 'pièce' },
  { name: 'Fromage râpé', aisle: 'Produits Frais', unit: 'g' },
  { name: 'Mozzarella', aisle: 'Produits Frais', unit: 'pièce' },
  { name: 'Crème fraîche', aisle: 'Produits Frais', unit: 'mL' },
  { name: 'Fromage blanc', aisle: 'Produits Frais', unit: 'g' },
  { name: 'Jus d’orange', aisle: 'Produits Frais', unit: 'L' },

  { name: 'Pâtes', aisle: 'Épicerie', unit: 'g' },
  { name: 'Riz', aisle: 'Épicerie', unit: 'g' },
  { name: 'Quinoa', aisle: 'Épicerie', unit: 'g' },
  { name: 'Farine', aisle: 'Épicerie', unit: 'g' },
  { name: 'Sucre', aisle: 'Épicerie', unit: 'g' },
  { name: 'Huile d’olive', aisle: 'Épicerie', unit: 'mL' },
  { name: 'Vinaigre balsamique', aisle: 'Épicerie', unit: 'mL' },
  { name: 'Sauce tomate', aisle: 'Épicerie', unit: 'boîte' },
  { name: 'Concentré de tomates', aisle: 'Épicerie', unit: 'boîte' },
  { name: 'Pain de mie', aisle: 'Épicerie', unit: 'pièce' },
  { name: 'Café', aisle: 'Épicerie', unit: 'g' },
  { name: 'Thé', aisle: 'Épicerie', unit: 'sachet' },
  { name: 'Sel', aisle: 'Épicerie', unit: 'pièce' },
  { name: 'Poivre', aisle: 'Épicerie', unit: 'pièce' },
  { name: 'Épices curry', aisle: 'Épicerie', unit: 'pièce' },
  { name: 'Conserves de pois chiches', aisle: 'Épicerie', unit: 'boîte' },
  { name: 'Conserves de maïs', aisle: 'Épicerie', unit: 'boîte' },
  { name: 'Chocolat noir', aisle: 'Épicerie', unit: 'pièce' },

  { name: 'Légumes surgelés', aisle: 'Surgelés', unit: 'sachet' },
  { name: 'Frites surgelées', aisle: 'Surgelés', unit: 'sachet' },
  { name: 'Pizza surgelée', aisle: 'Surgelés', unit: 'pièce' },
  { name: 'Glaces', aisle: 'Surgelés', unit: 'pièce' },
  { name: 'Poisson pané', aisle: 'Surgelés', unit: 'pièce' },

  { name: 'Papier toilette', aisle: 'Hygiène & Maison', unit: 'pièce' },
  { name: 'Lessive', aisle: 'Hygiène & Maison', unit: 'pièce' },
  { name: 'Liquide vaisselle', aisle: 'Hygiène & Maison', unit: 'pièce' },
  { name: 'Éponges', aisle: 'Hygiène & Maison', unit: 'pièce' },
  { name: 'Sacs poubelle', aisle: 'Hygiène & Maison', unit: 'pièce' },
  { name: 'Savon', aisle: 'Hygiène & Maison', unit: 'pièce' },
  { name: 'Dentifrice', aisle: 'Hygiène & Maison', unit: 'pièce' },
  { name: 'Shampoing', aisle: 'Hygiène & Maison', unit: 'pièce' }
];

export function searchCatalog(query: string, limit = 8): CatalogArticle[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return GROCERY_CATALOG.filter((item) => item.name.toLowerCase().includes(q)).slice(0, limit);
}

export function findCatalogArticle(name: string): CatalogArticle | undefined {
  const q = name.trim().toLowerCase();
  return GROCERY_CATALOG.find((item) => item.name.toLowerCase() === q);
}

export function catalogByAisle(aisle: string | null, limit = 24): CatalogArticle[] {
  if (!aisle || aisle === 'Toutes') {
    return GROCERY_CATALOG.slice(0, limit);
  }
  return GROCERY_CATALOG.filter((item) => item.aisle === aisle).slice(0, limit);
}

export function ingredientNames(): string[] {
  return [...new Set(GROCERY_CATALOG.map((item) => item.name))].sort((a, b) =>
    a.localeCompare(b, 'fr')
  );
}

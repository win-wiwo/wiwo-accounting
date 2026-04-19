export const ExpenseCategory = {
  WATER: 'water',
  TRANSPORTATION: 'transportation',
  OFFICE_SUPPLIES: 'office_supplies',
  FUEL_OIL_LUBRICANTS: 'fuel_oil_lubricants',
  NOTARIAL_FEES: 'notarial_fees',
  REPRESENTATION: 'representation',
} as const;

export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

export const EXPENSE_CATEGORIES = Object.values(ExpenseCategory);

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.WATER]: 'Water',
  [ExpenseCategory.TRANSPORTATION]: 'Transportation',
  [ExpenseCategory.OFFICE_SUPPLIES]: 'Office Supplies',
  [ExpenseCategory.FUEL_OIL_LUBRICANTS]: 'Fuel, Oil and Lubricants',
  [ExpenseCategory.NOTARIAL_FEES]: 'Notarial Fees',
  [ExpenseCategory.REPRESENTATION]: 'Representation',
};

export const EXPENSE_CATEGORY_CODES: Record<ExpenseCategory, string> = {
  [ExpenseCategory.WATER]: '5050',
  [ExpenseCategory.TRANSPORTATION]: '5060',
  [ExpenseCategory.OFFICE_SUPPLIES]: '5070',
  [ExpenseCategory.FUEL_OIL_LUBRICANTS]: '5071',
  [ExpenseCategory.NOTARIAL_FEES]: '5083',
  [ExpenseCategory.REPRESENTATION]: '5102',
};

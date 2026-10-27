/**
 * Calculates subtotal and total for a list of items using real database prices.
 * @param {Array<{ itemDoc: object, quantity: number, specialInstructions: string }>} validatedItems
 * @param {number} taxRatePercentage
 * @returns {{ itemsSnapshot: Array, subtotal: number, tax: number, totalAmount: number }}
 */
const calculateOrderTotals = (validatedItems, taxRatePercentage = 0) => {
  let subtotal = 0;
  const itemsSnapshot = [];

  for (const entry of validatedItems) {
    const { itemDoc, quantity, specialInstructions } = entry;
    const unitPrice = Number(itemDoc.price);
    const itemSubtotal = Math.round(unitPrice * quantity * 100) / 100;
    subtotal += itemSubtotal;

    itemsSnapshot.push({
      menuItem: itemDoc._id,
      name: itemDoc.name,
      unitPrice,
      quantity,
      subtotal: itemSubtotal,
      specialInstructions: specialInstructions || ''
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const tax = Math.round((subtotal * (taxRatePercentage / 100)) * 100) / 100;
  const totalAmount = Math.round((subtotal + tax) * 100) / 100;

  return {
    itemsSnapshot,
    subtotal,
    tax,
    totalAmount
  };
};

module.exports = {
  calculateOrderTotals
};

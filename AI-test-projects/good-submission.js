// E-commerce Product Catalog
const products = [
  { id: 1, name: 'Laptop', price: 999, category: 'Electronics' },
  { id: 2, name: 'Shoes', price: 89, category: 'Apparel' },
  { id: 3, name: 'Phone', price: 699, category: 'Electronics' }
];

function fetchProducts() {
  return new Promise(resolve => setTimeout(() => resolve(products), 500));
}

// Map, filter, reduce
const getElectronics = (items) => items.filter(i => i.category === 'Electronics');
const getTotalPrice = (items) => items.reduce((sum, i) => sum + i.price, 0);

// Debouncing
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

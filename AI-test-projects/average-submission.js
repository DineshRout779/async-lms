// E-commerce Product Catalog
const products = [
  { id: 1, name: 'Laptop', price: 999 },
  { id: 2, name: 'Shoes', price: 89 }
];

function fetchProducts() {
  return products;
}

// Missing reduce and debounce logic
const getItems = () => {
  return products.map(p => p.name);
};

async function callRandomApi() {
  const apis = [
    'https://jsonplaceholder.typicode.com/posts/1',
    'https://jsonplaceholder.typicode.com/users/1',
    'https://jsonplaceholder.typicode.com/todos/1',
    'https://jsonplaceholder.typicode.com/comments/1'
  ];

  const randomIndex = Math.floor(Math.random() * apis.length);
  const selectedApi = apis[randomIndex];

  try {
    const response = await fetch(selectedApi);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('API URL:', selectedApi);
    console.log('Response:', data);

    return data;
  } catch (error) {
    console.error('API call failed:', error.message);
    throw error;
  }
}


callRandomApi();
import 'dotenv/config';

const PORT = process.env.PORT || 3000;
// ZMIANA: Zamiast 'URL' dajemy 'API_URL'
const API_URL = `http://localhost:${PORT}/create-payment-intent`;

async function testStripe() {
  try {
    console.log('📡 Wysyłam zapytanie do:', API_URL);

    // ZMIANA: Tu też używamy 'API_URL'
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 5000, // 50.00 PLN
      }),
    });

    const data = await response.json();
    console.log('✅ Odpowiedź serwera:', data);
  } catch (error) {
    console.error('❌ Błąd:', error);
  }
}

testStripe();
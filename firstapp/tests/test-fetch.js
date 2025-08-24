async function testAPI() {
  try {
    // ポート3010でテスト
    console.log('Testing port 3010...');
    const response3010 = await fetch('http://localhost:3010/api/contacts');
    if (response3010.ok) {
      const data = await response3010.json();
      console.log('Port 3010 Success:', data);
    } else {
      console.log('Port 3010 Failed:', response3010.status, response3010.statusText);
    }
  } catch (error) {
    console.error('Port 3010 Error:', error.message);
  }
  
  try {
    // ポート3000でテスト
    console.log('\nTesting port 3000...');
    const response3000 = await fetch('http://localhost:3000/api/contacts');
    if (response3000.ok) {
      const data = await response3000.json();
      console.log('Port 3000 Success:', data);
    } else {
      console.log('Port 3000 Failed:', response3000.status, response3000.statusText);
    }
  } catch (error) {
    console.error('Port 3000 Error:', error.message);
  }
}

testAPI();
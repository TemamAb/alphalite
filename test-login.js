const axios = require('axios');

async function testLogin() {
    const credentials = {
        email: 'iamtemam@gmail.com',
        password: 'Temam@1954'
    };

    console.log('Testing login with:', credentials.email);

    try {
        const response = await axios.post('http://localhost:3000/api/auth/login', credentials);
        console.log('Login Success!');
        console.log('User:', response.data.user.username);
        console.log('Token (truncated):', response.data.token.substring(0, 20) + '...');
        return true;
    } catch (error) {
        console.error('Login Failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data));
        } else {
            console.error('Error:', error.message);
        }
        return false;
    }
}

testLogin();

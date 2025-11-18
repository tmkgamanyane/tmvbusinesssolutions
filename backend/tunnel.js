const ngrok = require('ngrok');

(async function() {
    try {
        const url = await ngrok.connect({
            proto: 'http',
            addr: 5000,
        });
        console.log('Ngrok tunnel established at:', url);
        console.log('Use this URL for your Yoco webhook configuration');
    } catch (err) {
        console.error('Error setting up ngrok:', err);
    }
})();
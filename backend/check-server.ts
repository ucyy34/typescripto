const app = require('./src/app');
const http = require('http');

const PORT = 3105;

const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`✅ Test Server running on port ${PORT}`);
});

process.on('SIGINT', () => {
    server.close();
    process.exit();
});

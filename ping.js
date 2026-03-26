// // ping.js - Self-pinging service to keep Render app awake
// const axios = require('axios');
// const https = require('https');

// console.log(`
// ╔══════════════════════════════════════╗
// ║      RENDER KEEP-ALIVE SERVICE       ║
// ╚══════════════════════════════════════╝
// `);

// // Configuration
// const APP_URL = process.env.APP_URL || 'https://neon-host-hub.onrender.com';
// const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes (Render sleeps after 15 mins)
// const MAX_RETRIES = 3;
// const RETRY_DELAY = 5000; // 5 seconds

// // Endpoints to ping
// const ENDPOINTS = [
//   '/',                    // Home page
//   '/api/health',          // Health endpoint
//   '/billing',             // Billing page (important for your app)
//   '/overview'             // Overview page
// ];

// // Colors for console output
// const colors = {
//   reset: '\x1b[0m',
//   bright: '\x1b[1m',
//   green: '\x1b[32m',
//   yellow: '\x1b[33m',
//   red: '\x1b[31m',
//   cyan: '\x1b[36m',
//   magenta: '\x1b[35m'
// };

// // Create HTTPS agent with better configuration
// const httpsAgent = new https.Agent({
//   rejectUnauthorized: false,
//   keepAlive: true,
//   timeout: 15000,
//   maxSockets: 50,
//   maxFreeSockets: 10,
//   keepAliveMsecs: 1000
// });

// // Sleep function
// const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// // Function to ping a single endpoint with retry logic
// async function pingEndpoint(url, endpoint, retryCount = 0) {
//   const fullUrl = url + endpoint;
  
//   try {
//     const response = await axios.get(fullUrl, {
//       httpsAgent,
//       timeout: 10000,
//       headers: {
//         'User-Agent': 'Render-Keep-Alive/1.0',
//         'Accept': 'application/json',
//         'Cache-Control': 'no-cache'
//       },
//       validateStatus: function (status) {
//         return status >= 200 && status < 500; // Accept 2xx and 4xx status
//       }
//     });
    
//     const timestamp = new Date().toLocaleTimeString();
//     const statusColor = response.status >= 400 ? colors.yellow : colors.green;
    
//     console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${statusColor}✓${colors.reset} ${endpoint.padEnd(20)} ${colors.bright}${response.status}${colors.reset} ${response.statusText}`);
    
//     return {
//       success: true,
//       url: fullUrl,
//       endpoint,
//       status: response.status,
//       timestamp
//     };
    
//   } catch (error) {
//     if (retryCount < MAX_RETRIES) {
//       console.log(`${colors.yellow}⚠️ Retrying ${endpoint} (${retryCount + 1}/${MAX_RETRIES})...${colors.reset}`);
//       await sleep(RETRY_DELAY);
//       return pingEndpoint(url, endpoint, retryCount + 1);
//     }
    
//     const timestamp = new Date().toLocaleTimeString();
//     const errorMessage = error.code || error.message;
    
//     console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${colors.red}✗${colors.reset} ${endpoint.padEnd(20)} ${colors.red}ERROR${colors.reset} ${errorMessage}`);
    
//     return {
//       success: false,
//       url: fullUrl,
//       endpoint,
//       error: errorMessage,
//       timestamp
//     };
//   }
// }

// // Ping all endpoints
// async function pingAllEndpoints() {
//   console.log(`\n${colors.magenta}══════════════════════════════════════════════════════════════${colors.reset}`);
//   console.log(`${colors.bright}🔄 Starting ping cycle at ${new Date().toLocaleString()}${colors.reset}`);
//   console.log(`${colors.bright}📡 Target: ${APP_URL}${colors.reset}`);
//   console.log(`${colors.magenta}══════════════════════════════════════════════════════════════${colors.reset}\n`);
  
//   const results = [];
//   let successCount = 0;
  
//   // Ping endpoints sequentially with delay
//   for (const endpoint of ENDPOINTS) {
//     const result = await pingEndpoint(APP_URL, endpoint);
//     results.push(result);
    
//     if (result.success) successCount++;
    
//     // Add delay between pings (except last one)
//     if (endpoint !== ENDPOINTS[ENDPOINTS.length - 1]) {
//       await sleep(1000);
//     }
//   }
  
//   // Summary
//   console.log(`\n${colors.magenta}══════════════════════════════════════════════════════════════${colors.reset}`);
//   console.log(`${colors.bright}📊 PING SUMMARY${colors.reset}`);
//   console.log(`${colors.magenta}══════════════════════════════════════════════════════════════${colors.reset}`);
//   console.log(`✅ Successful: ${colors.green}${successCount}/${ENDPOINTS.length}${colors.reset}`);
//   console.log(`❌ Failed: ${colors.red}${ENDPOINTS.length - successCount}/${ENDPOINTS.length}${colors.reset}`);
//   console.log(`⏰ Next ping in: ${colors.cyan}${PING_INTERVAL / 60000} minutes${colors.reset}`);
//   console.log(`${colors.magenta}══════════════════════════════════════════════════════════════${colors.reset}\n`);
  
//   return results;
// }

// // Main keep-alive function
// async function startKeepAlive() {
//   console.log(`${colors.bright}🎯 Configuration:${colors.reset}`);
//   console.log(`   App URL: ${colors.cyan}${APP_URL}${colors.reset}`);
//   console.log(`   Ping Interval: ${colors.cyan}${PING_INTERVAL / 60000} minutes${colors.reset}`);
//   console.log(`   Endpoints: ${colors.cyan}${ENDPOINTS.join(', ')}${colors.reset}`);
//   console.log(`   Max Retries: ${colors.cyan}${MAX_RETRIES}${colors.reset}`);
//   console.log(`${colors.magenta}══════════════════════════════════════════════════════════════${colors.reset}\n`);
  
//   // Initial ping
//   console.log(`${colors.bright}🚀 Performing initial ping...${colors.reset}`);
//   await pingAllEndpoints();
  
//   // Calculate next ping time
//   const nextPingTime = new Date(Date.now() + PING_INTERVAL);
//   console.log(`${colors.bright}⏰ Next scheduled ping: ${colors.cyan}${nextPingTime.toLocaleTimeString()}${colors.reset}\n`);
  
//   // Set up interval for regular pings
//   const intervalId = setInterval(async () => {
//     await pingAllEndpoints();
    
//     // Update next ping time display
//     const nextTime = new Date(Date.now() + PING_INTERVAL);
//     console.log(`${colors.bright}⏰ Next ping at: ${colors.cyan}${nextTime.toLocaleTimeString()}${colors.reset}\n`);
//   }, PING_INTERVAL);
  
//   // Graceful shutdown
//   process.on('SIGTERM', () => {
//     console.log(`\n${colors.yellow}⚠️ Received SIGTERM. Shutting down gracefully...${colors.reset}`);
//     clearInterval(intervalId);
//     console.log(`${colors.green}✅ Keep-alive service stopped${colors.reset}`);
//     process.exit(0);
//   });
  
//   process.on('SIGINT', () => {
//     console.log(`\n${colors.yellow}⚠️ Received SIGINT. Shutting down gracefully...${colors.reset}`);
//     clearInterval(intervalId);
//     console.log(`${colors.green}✅ Keep-alive service stopped${colors.reset}`);
//     process.exit(0);
//   });
  
//   // Keep-alive heartbeat
//   setInterval(() => {
//     const memory = process.memoryUsage();
//     const memoryMB = Math.round(memory.heapUsed / 1024 / 1024);
//     console.log(`${colors.cyan}[${new Date().toLocaleTimeString()}]${colors.reset} ${colors.yellow}Heartbeat${colors.reset} - Memory: ${memoryMB}MB | Uptime: ${Math.round(process.uptime() / 60)}min`);
//   }, 5 * 60 * 1000); // Every 5 minutes
  
//   console.log(`${colors.green}✅ Keep-alive service started successfully!${colors.reset}`);
//   console.log(`${colors.bright}📡 Monitoring: ${APP_URL}${colors.reset}`);
//   console.log(`${colors.bright}💤 Prevents sleep by pinging every ${PING_INTERVAL / 60000} minutes${colors.reset}\n`);
// }

// // Export for testing
// module.exports = {
//   startKeepAlive,
//   pingAllEndpoints,
//   pingEndpoint
// };

// // Start if run directly
// if (require.main === module) {
//   startKeepAlive().catch(error => {
//     console.error(`${colors.red}💥 Failed to start keep-alive service:${colors.reset}`, error);
//     process.exit(1);
//   });
// }


















import https from 'https';
import http from 'http';

console.log(`
╔══════════════════════════════════════╗
║      RENDER KEEP-ALIVE SERVICE       ║
╚══════════════════════════════════════╝
`);

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';
const APP_URL = process.env.APP_URL || `http://${HOST}:${PORT}`;
const PING_INTERVAL = 14 * 60 * 1000;
const PING_INTERVAL_TEST = 10000;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function pingServer() {
  const timestamp = new Date().toLocaleTimeString();
  let url;
  
  try {
    url = new URL(APP_URL);
  } catch (error) {
    console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${colors.red}✗${colors.reset} Invalid URL: ${APP_URL}`);
    return;
  }
  
  const isHttps = url.protocol === 'https:';
  const port = url.port || (isHttps ? 443 : 80);
  
  const options = {
    hostname: url.hostname,
    port: port,
    path: url.pathname || '/',
    timeout: 5000,
    headers: {
      'User-Agent': 'Render-Keep-Alive/1.0'
    }
  };
  
  const req = (isHttps ? https : http).request(options, (res) => {
    const statusColor = res.statusCode >= 400 ? colors.yellow : colors.green;
    console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${statusColor}✓${colors.reset} ${APP_URL} - ${colors.bright}${res.statusCode}${colors.reset}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      const isHtml = data.includes('<!DOCTYPE html>') || data.includes('<html');
      const isJson = data.trim().startsWith('{');
      
      if (res.statusCode === 200) {
        if (isHtml) {
          console.log(`   ${colors.green}✅ React app is running${colors.reset}`);
        } else if (isJson) {
          try {
            const json = JSON.parse(data);
            console.log(`   ${colors.green}✅ API response: ${JSON.stringify(json).substring(0, 50)}...${colors.reset}`);
          } catch {
            console.log(`   ${colors.green}✅ Valid JSON response${colors.reset}`);
          }
        }
      }
    });
  });
  
  req.on('error', (err) => {
    console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${colors.red}✗${colors.reset} ${APP_URL} - ${colors.red}${err.code || err.message}${colors.reset}`);
    
    if (err.code === 'ECONNREFUSED' && !APP_URL.includes('render.com')) {
      console.log(`${colors.yellow}   ⚠️ Trying alternative ports...${colors.reset}`);
      const ports = [8081, 8082, 3000, 3001, 5173];
      
      ports.forEach(testPort => {
        const testReq = http.request({
          hostname: HOST,
          port: testPort,
          path: '/',
          timeout: 2000
        }, (res) => {
          console.log(`${colors.green}   ✅ Found app on port ${testPort} (Status: ${res.statusCode})${colors.reset}`);
        });
        
        testReq.on('error', () => {});
        testReq.on('timeout', () => { testReq.destroy(); });
        testReq.end();
      });
    }
  });
  
  req.on('timeout', () => {
    console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${colors.red}✗${colors.reset} ${APP_URL} - ${colors.red}TIMEOUT${colors.reset}`);
    req.destroy();
  });
  
  req.end();
}

function startKeepAlive() {
  console.log(`${colors.bright}🎯 Configuration:${colors.reset}`);
  console.log(`   App URL: ${colors.cyan}${APP_URL}${colors.reset}`);
  console.log(`   Host: ${colors.cyan}${HOST}${colors.reset}`);
  console.log(`   Port: ${colors.cyan}${PORT}${colors.reset}`);
  
  const isProduction = process.env.NODE_ENV === 'production' || APP_URL.includes('render.com');
  const interval = isProduction ? PING_INTERVAL : PING_INTERVAL_TEST;
  
  console.log(`   Ping Interval: ${colors.cyan}${interval / 1000} seconds${colors.reset}`);
  console.log(`   Environment: ${colors.cyan}${isProduction ? 'Production' : 'Development'}${colors.reset}`);
  console.log(`${colors.blue}══════════════════════════════════════════════════════════════${colors.reset}\n`);
  
  setTimeout(() => {
    console.log(`${colors.bright}🚀 Performing initial ping...${colors.reset}`);
    pingServer();
    
    const intervalId = setInterval(pingServer, interval);
    
    const nextPingTime = new Date(Date.now() + interval);
    console.log(`${colors.bright}⏰ Next scheduled ping: ${colors.cyan}${nextPingTime.toLocaleTimeString()}${colors.reset}\n`);
    
    process.on('SIGTERM', () => {
      console.log(`\n${colors.yellow}⚠️ Received SIGTERM. Shutting down gracefully...${colors.reset}`);
      clearInterval(intervalId);
      console.log(`${colors.green}✅ Keep-alive service stopped${colors.reset}`);
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      console.log(`\n${colors.yellow}⚠️ Received SIGINT. Shutting down gracefully...${colors.reset}`);
      clearInterval(intervalId);
      console.log(`${colors.green}✅ Keep-alive service stopped${colors.reset}`);
      process.exit(0);
    });
    
    console.log(`${colors.green}✅ Keep-alive service started successfully!${colors.reset}`);
    console.log(`${colors.bright}📡 Monitoring: ${APP_URL}${colors.reset}`);
    console.log(`${colors.bright}💤 Prevents sleep by pinging every ${interval / 1000} seconds${colors.reset}\n`);
    
  }, 2000);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    startKeepAlive();
  } catch (error) {
    console.error(`${colors.red}💥 Failed to start keep-alive service:${colors.reset}`, error);
    process.exit(1);
  }
}

export { startKeepAlive };
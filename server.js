const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// URL validation function
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Proxy server is running',
        timestamp: new Date().toISOString()
    });
});

// Main proxy endpoint for GET requests
app.get('/api/proxy', async (req, res) => {
    try {
        const { url: targetUrl, ...queryParams } = req.query;

        if (!targetUrl) {
            return res.status(400).json({
                error: 'Missing required parameter: url',
                message: 'Please provide a target URL in the query parameters'
            });
        }

        if (!isValidUrl(targetUrl)) {
            return res.status(400).json({
                error: 'Invalid URL format',
                message: 'The provided URL is not valid. Please ensure it starts with http:// or https://'
            });
        }

        // Prepare request configuration
        const config = {
            method: 'GET',
            url: targetUrl,
            timeout: 30000, // 30 seconds timeout
            headers: {
                'User-Agent': 'Proxy-Server/1.0',
                'Accept': 'application/json, text/plain, */*'
            }
        };

        // Add query parameters if any (excluding the 'url' parameter)
        if (Object.keys(queryParams).length > 0) {
            config.params = queryParams;
        }

        // Forward specific headers from the original request
        const forwardHeaders = ['authorization', 'x-api-key', 'content-type'];
        forwardHeaders.forEach(header => {
            if (req.headers[header]) {
                config.headers[header] = req.headers[header];
            }
        });

        console.log(`[${new Date().toISOString()}] GET request to: ${targetUrl}`);

        const response = await axios(config);

        // Set appropriate response headers
        res.set({
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Proxy-Status': 'success'
        });

        res.status(response.status).json({
            success: true,
            status: response.status,
            data: response.data,
            headers: {
                'content-type': response.headers['content-type'],
                'content-length': response.headers['content-length']
            }
        });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in GET proxy:`, error.message);

        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            res.status(error.response.status).json({
                success: false,
                error: 'External API Error',
                message: `External API returned status ${error.response.status}`,
                status: error.response.status,
                data: error.response.data || null
            });
        } else if (error.request) {
            // The request was made but no response was received
            res.status(503).json({
                success: false,
                error: 'Service Unavailable',
                message: 'Unable to reach the external API. Please check the URL and try again.'
            });
        } else {
            // Something happened in setting up the request that triggered an Error
            res.status(500).json({
                success: false,
                error: 'Internal Server Error',
                message: error.message || 'An unexpected error occurred'
            });
        }
    }
});

// Main proxy endpoint for POST requests
app.post('/api/proxy', async (req, res) => {
    try {
        const { url: targetUrl, data: requestData, headers: customHeaders, ...otherParams } = req.body;

        if (!targetUrl) {
            return res.status(400).json({
                error: 'Missing required field: url',
                message: 'Please provide a target URL in the request body'
            });
        }

        if (!isValidUrl(targetUrl)) {
            return res.status(400).json({
                error: 'Invalid URL format',
                message: 'The provided URL is not valid. Please ensure it starts with http:// or https://'
            });
        }

        // Prepare request configuration
        const config = {
            method: 'POST',
            url: targetUrl,
            timeout: 30000, // 30 seconds timeout
            headers: {
                'User-Agent': 'Proxy-Server/1.0',
                'Content-Type': 'application/json',
                ...customHeaders
            }
        };

        // Add request data if provided
        if (requestData) {
            config.data = requestData;
        }

        // Forward specific headers from the original request
        const forwardHeaders = ['authorization', 'x-api-key'];
        forwardHeaders.forEach(header => {
            if (req.headers[header]) {
                config.headers[header] = req.headers[header];
            }
        });

        console.log(`[${new Date().toISOString()}] POST request to: ${targetUrl}`);

        const response = await axios(config);

        // Set appropriate response headers
        res.set({
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Proxy-Status': 'success'
        });

        res.status(response.status).json({
            success: true,
            status: response.status,
            data: response.data,
            headers: {
                'content-type': response.headers['content-type'],
                'content-length': response.headers['content-length']
            }
        });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in POST proxy:`, error.message);

        if (error.response) {
            res.status(error.response.status).json({
                success: false,
                error: 'External API Error',
                message: `External API returned status ${error.response.status}`,
                status: error.response.status,
                data: error.response.data || null
            });
        } else if (error.request) {
            res.status(503).json({
                success: false,
                error: 'Service Unavailable',
                message: 'Unable to reach the external API. Please check the URL and try again.'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Internal Server Error',
                message: error.message || 'An unexpected error occurred'
            });
        }
    }
});


// 404 handler for undefined routes
app.use((req, res) => {
    res.status(404).json({
        error: 'Route Not Found',
        message: 'The requested endpoint does not exist',
        availableEndpoints: [
            'GET /health - Health check',
            'GET /api/proxy?url=<target_url> - Proxy GET requests',
            'POST /api/proxy - Proxy POST requests'
        ]
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Unhandled error:`, error);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred on the server'
    });
});

// Start the server
app.listen(PORT, HOST, () => {
    console.log(`🚀 Proxy server is running on http://${HOST}:${PORT}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   GET  /health - Health check`);
    console.log(`   GET  /api/proxy?url=<target_url> - Proxy GET requests`);
    console.log(`   POST /api/proxy - Proxy POST requests`);
    console.log(`\n📖 Usage examples:`);
    console.log(`   GET: curl "http://localhost:${PORT}/api/proxy?url=https://api.github.com/users/octocat"`);
    console.log(`   POST: curl -X POST "http://localhost:${PORT}/api/proxy" -H "Content-Type: application/json" -d '{"url":"https://jsonplaceholder.typicode.com/posts","data":{"title":"test","body":"test","userId":1}}'`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📤 SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📤 SIGINT received, shutting down gracefully...');
    process.exit(0);
});

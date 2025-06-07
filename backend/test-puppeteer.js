import puppeteer from 'puppeteer';

async function testPuppeteer() {
    console.log('🚀 Starting Puppeteer test...');
    
    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        
        console.log('✅ Browser launched successfully!');
        
        const page = await browser.newPage();
        console.log('✅ New page created!');
        
        await page.goto('https://example.com', { 
            waitUntil: 'networkidle2',
            timeout: 10000 
        });
        console.log('✅ Page loaded successfully!');
        
        const title = await page.title();
        console.log(`📖 Page title: ${title}`);
        
        await browser.close();
        console.log('✅ Browser closed successfully!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
    }
}

testPuppeteer();

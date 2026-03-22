import { chromium } from 'playwright';
import fetch from 'node-fetch';
import fs from 'node:fs';

/**
 * Service for geo data and company search via OpenStreetMap/Overpass
 */
class GeoService {

    async getCoords(zip) {
        const url = `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=germany&format=json`;
        const res = await fetch(url, { headers: { 'User-Agent': 'JobAgent/1.0' } });
        const data = await res.json();
        if (!data || data.length === 0) throw new Error(`Postal code ${zip} not found.`);
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }

    //#####################

    async findCompanies(lat, lon, radiusKm) {
        console.log(`Searching for companies within ${radiusKm}km radius via Overpass...`);
        const radiusMeter = radiusKm * 1000;
        const query = `[out:json][timeout:25];node(around:${radiusMeter},${lat},${lon})["office"];out body;`;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

        const res = await fetch(url);
        const responseText = await res.text();

        try {
            const data = JSON.parse(responseText);
            console.log(`Found elements: ${data.elements.length}\n`);
            return data.elements.filter(e => e.tags && e.tags.name).map(e => ({
                name: e.tags.name,
                website: e.tags.website || e.tags['contact:website'] || null
            }));
        } catch (e) {
            throw new Error(`Overpass error: ${responseText.substring(0, 300)}`);
        }
    }

    //#####################
}



/**
 * Main class of the agent with targeted website search
 */
class FindAngularCompanyAgent {

    constructor() {
        this.geo = new GeoService();
        this.browser = null;
        this.browserContext = null;
    }

    //#####################

    async initPlaywrightBrowser() {
        this.browser = await chromium.launch({ headless: false, slowMo: 500 });
        this.browserContext = await this.browser.newContext({
            viewport: { width: 1280, height: 720 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        });
    }

    //#####################

    async checkPageContent(company, searchString = "Angular careers software developer") {
        const page = await this.browserContext.newPage();
        const cleanName = company.name.replace(/[/\\?%*:|"<>]/g, ' ').trim();
        let searchQuery;

        if (company.website) {
            // If Overpass knows the website: targeted search on this domain
            const domain = new URL(company.website).hostname.replace('www.', '');
            searchQuery = `https://duckduckgo.com/?q=${encodeURIComponent(`site:${domain} ${searchString}`)}`;
            console.log(`  -> Targeted search on: ${domain}`);
        } else {
            // If no website is known: search for company + Angular career
            searchQuery = `https://duckduckgo.com/?q=${encodeURIComponent(`"${cleanName}" ${searchString}`)}`;
            console.log(`  -> General search (no website listed in OpenStreetMap)`);
        }

        try {
            await page.goto(searchQuery, { waitUntil: 'networkidle' });
            await page.waitForTimeout(2000);

            // Check for matches: we search for articles that could indicate job offers
            const resultsCount = await page.locator('article').count();
            await page.close();
            return resultsCount > 0;
        } catch (err) {
            console.error(`  -> Error searching for ${cleanName}:`, err.message);
            await page.close();
            return false;
        }
    }

    //#####################

    async run(zip, radius = 20, startCompanies = 0, endCompanies = 10, searchString) {
        try {
            await this.initPlaywrightBrowser();
            const { lat, lon } = await this.geo.getCoords(zip);
            const companies = await this.geo.findCompanies(lat, lon, radius);
            const matches = [];
            const matchesAsString = [];

            for (const company of companies.slice(startCompanies, endCompanies)) {
                console.log(`\nChecking: ${company.name}...`);

                const found = await this.checkPageContent(company, searchString);
                if (found) {
                    console.log(`  ✅ Match found!`);
                    matches.push({ name: company.name, website: company.website, lat: lat.toFixed(4), lon: lon.toFixed(4) });
                }

                const waitTime = Math.floor(Math.random() * 5000) + 5000;
                await new Promise(r => setTimeout(r, waitTime));
            }

            console.log("\n--- Summary ---");
            if (matches.length > 0) {

                matches.forEach(m => {
                    const matchSummary = `${m.name} (${m.website || 'No website'}) [${m.lat}, ${m.lon}]`;
                    console.log(`- ${matchSummary}`);
                    matchesAsString.push(matchSummary);
                });

                await this.writeTxtFile('websearchAgentResults.txt', matchesAsString);

            } else {
                console.log("No matches found in the sample.");
            }

        } catch (error) {
            console.error("Agent stopped:", error.message);
        } finally {
            // Browser remains open at the end for analysis
            console.log("\nDone. The browser can now be closed manually.");
        }
    }

    //#####################

    async writeTxtFile(filename, data) {
        await fs.writeFileSync(filename, data.join('\n'), 'utf-8');
        console.log(`Results saved in ${filename}.`);
    }

    //#####################

}

const agent = new FindAngularCompanyAgent();
// Example call: postal code 63633, 80km radius, start and end position for company check from the list (here: 10 to 13), and search string for what should be found on the website
agent.run("63633", 80, 10, 13, "Angular Karriere Software Entwickler");
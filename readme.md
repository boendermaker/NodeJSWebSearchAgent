# Company WebSearch Agent

This Agent searches for companies within a definable area of a zipcode and then does a websearch for each found company with a definable searchString.

The Agent makes use of OpenStreetMap, Overpass-API and Playwright to find Companies in a zipcode related area and doing the websearch.

You don't need API-Keys but the request rate is limited to a given timeinterval, which may cause a manual restart of the Agent if those ratelimits are exceeded.


## You may want to edit the index.js file to modify it your needs

// Example: ZIP 63633, 80km Radius, Start- und Endposition to Access Companies in the Array by Indexrange, Searchstring for Websearch on each Company found (Websearch only if URL was found on OpenStreetMap)

agent.run("63633", 80, 10, 13, "Angular Karriere Software Entwickler");


## Usage

Clone this repo...

run "npm install"
run "npx playwright install"
run node index.js



![SVGPlayground](https://www.boendermaker.de/github/companywebsearchagent.gif?)

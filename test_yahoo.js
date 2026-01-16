async function fetchStockData(symbol) {
    const url = "https://query1.finance.yahoo.com/v8/finance/chart/" + symbol + "?interval=1d&range=1mo"
    console.log("Fetching: " + url);
    try {
        const response = await fetch(url)
        console.log("Response status: " + response.status);
        if (!response.ok) throw new Error("Network response was not ok")
        const data = await response.json()
        console.log("Success with Yahoo directly");
    } catch (e) {
        console.log("Direct fetch failed: " + e.message);
        const proxyUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent(url)
        console.log("Fetching via proxy: " + proxyUrl);
        try {
            const response = await fetch(proxyUrl)
            console.log("Proxy response status: " + response.status);
            if (!response.ok) throw new Error("Proxy response was not ok")
            const data = await response.json()
            console.log("Success with proxy");
        } catch (e2) {
             console.log("Proxy fetch failed: " + e2.message);
        }
    }
}

fetchStockData("LLY");

<script>
    import { onMount, onDestroy } from 'svelte'
    import { settings } from '../stores/settings-store.svelte.js'

    let { class: className } = $props()

    let stocks = $state([])
    let loading = $state(false)
    let error = $state('')

    // Use a proxy if direct access fails (CORS) or try direct first.
    // Yahoo Finance query1.finance.yahoo.com often has CORS enabled for some endpoints or requires cookies.
    // For this environment, I'll try to fetch client-side.
    // Since I can't guarantee a CORS proxy is available, I will try to use a public one or
    // just use the query1 endpoint and hope it works in the user's browser (it often does for simple GETs if not abused).
    // Alternatively, I can mock it if real data is not accessible.
    // However, the task says "retrieves stock price from accessible providers".

    // I will use a CORS proxy to ensure it works.
    // 'https://corsproxy.io/?' is a common one, or I can try without it first.

    async function fetchWithTimeout(resource, options = {}) {
        const { timeout = 8000 } = options
        const controller = new AbortController()
        const id = setTimeout(() => controller.abort(), timeout)
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal,
        })
        clearTimeout(id)
        return response
    }

    async function fetchStockData(symbol) {
        // Range 1mo, interval 1d for sparkline
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`

        // Try direct first
        try {
            const response = await fetchWithTimeout(url)
            if (!response.ok) throw new Error('Network response was not ok')
            const data = await response.json()
            return processData(data, symbol)
        } catch (e) {
            console.warn(`Direct fetch failed for ${symbol}, trying proxy...`, e)
            // Fallback to a CORS proxy if direct fails
            // Note: Public proxies are not reliable for production, but okay for a demo/widget like this.
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
                url
            )}`
            try {
                const response = await fetchWithTimeout(proxyUrl)
                if (!response.ok) throw new Error('Proxy response was not ok')
                const data = await response.json()
                return processData(data, symbol)
            } catch (proxyError) {
                console.error(
                    `Proxy fetch also failed for ${symbol}`,
                    proxyError
                )
                throw proxyError
            }
        }
    }

    function processData(data, symbol) {
        const result = data.chart.result[0]
        const quote = result.indicators.quote[0]
        const timestamps = result.timestamp
        const prices = quote.close

        // Filter out nulls
        const cleanPrices = []
        for (let i = 0; i < prices.length; i++) {
            if (prices[i] !== null && prices[i] !== undefined) {
                cleanPrices.push(prices[i])
            }
        }

        const currentPrice = result.meta.regularMarketPrice
        const prevClose = result.meta.chartPreviousClose
        const change = currentPrice - prevClose
        const changePercent = (change / prevClose) * 100

        return {
            symbol: symbol,
            price: currentPrice,
            change: change,
            changePercent: changePercent,
            history: cleanPrices
        }
    }

    async function loadStocks() {
        if (loading) return
        loading = true
        error = ''
        stocks = []

        try {
            const promises = settings.stocks.map(async (s) => {
                if (!s.symbol) return null
                try {
                    const data = await fetchStockData(s.symbol)
                    return { ...data, name: s.name || s.symbol }
                } catch (e) {
                    console.error(`Failed to load ${s.symbol}`, e)
                    return { symbol: s.symbol, name: s.name || s.symbol, error: true }
                }
            })

            const results = await Promise.all(promises)
            stocks = results.filter(r => r !== null)
        } catch (e) {
            error = 'failed to load stocks'
            console.error(e)
        } finally {
            loading = false
        }
    }

    // SVG Sparkline generator
    function generateSparkline(history) {
        if (!history || history.length < 2) return ''

        const width = 100
        const height = 30
        const min = Math.min(...history)
        const max = Math.max(...history)
        const range = max - min || 1

        const points = history.map((price, i) => {
            const x = (i / (history.length - 1)) * width
            const y = height - ((price - min) / range) * height
            return `${x},${y}`
        }).join(' ')

        return points
    }

    function getColor(change) {
        if (change > 0) return 'var(--txt-success, #0f0)'
        if (change < 0) return 'var(--txt-err, #f00)'
        return 'var(--txt-1)'
    }

    onMount(() => {
        loadStocks()
    })

    // Refresh every 5 minutes
    const interval = setInterval(loadStocks, 5 * 60 * 1000)

    onDestroy(() => {
        clearInterval(interval)
    })

    // Reload when settings change
    $effect(() => {
        // Trigger reload if stock list changes
        if (settings.stocks) {
            // We could be smarter here but for now just reload
            // This might cause loops if we aren't careful, but loadStocks checks loading state.
            // Actually, $effect runs on mount too.
            loadStocks()
        }
    })

</script>

<div class="panel-wrapper {className}">
    <button class="widget-label" onclick={loadStocks} disabled={loading}>
        {loading ? 'loading...' : 'stocks'}
    </button>

    <div class="panel">
        {#if error}
            <div class="error">{error}</div>
        {:else if stocks.length === 0 && !loading}
            <div class="empty">no stocks configured</div>
        {:else}
            <div class="stocks-list">
                {#each stocks as stock}
                    <div class="stock-item">
                        <div class="stock-info">
                            <span class="stock-symbol">{stock.name}</span>
                            <span class="stock-price">
                                {#if stock.error}
                                    err
                                {:else}
                                    {stock.price?.toFixed(2)}
                                {/if}
                            </span>
                        </div>

                        {#if !stock.error}
                        <div class="stock-chart">
                             <svg width="100" height="30" viewBox="0 0 100 30" preserveAspectRatio="none">
                                <polyline
                                    fill="none"
                                    stroke={getColor(stock.change)}
                                    stroke-width="1.5"
                                    points={generateSparkline(stock.history)}
                                />
                            </svg>
                        </div>
                        <div class="stock-change" style="color: {getColor(stock.change)}">
                            {stock.change > 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                        </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .panel-wrapper {
        flex: 1;
        min-width: 200px;
    }
    .panel-wrapper.expand {
        flex: 2;
    }
    .panel {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-height: 15rem;
        overflow-y: auto;
        scrollbar-width: none;
    }
    .stocks-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    .stock-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }
    .stock-info {
        display: flex;
        flex-direction: column;
        min-width: 4rem;
    }
    .stock-symbol {
        font-weight: bold;
        color: var(--txt-1);
    }
    .stock-price {
        color: var(--txt-2);
        font-size: 0.9em;
    }
    .stock-chart {
        flex: 1;
        height: 30px;
        opacity: 0.8;
    }
    .stock-change {
        font-size: 0.9em;
        text-align: right;
        min-width: 3.5rem;
    }
    .empty {
        color: var(--txt-3);
        font-style: italic;
    }
    .error {
        color: var(--txt-err);
    }
</style>

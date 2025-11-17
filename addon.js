const { addonBuilder } = require('stremio-addon-sdk');
const axios = require('axios');
const cheerio = require('cheerio');

const manifest = {
    id: 'com.tuktukcinema.stremio',
    version: '1.0.7',
    name: 'TukTuk Cinema',
    description: 'Arabic movies, series, and anime from TukTuk Cinema',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
        {
            type: 'movie',
            id: 'tuktuk-recent',
            name: 'المضاف حديثاً',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'tuktuk-movies-foreign',
            name: 'افلام اجنبي',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'tuktuk-movies-indian',
            name: 'افلام هندي',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'movie',
            id: 'tuktuk-movies-asian',
            name: 'افلام اسيوي',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'tuktuk-series-foreign',
            name: 'مسلسلات اجنبي',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'tuktuk-series-turkish',
            name: 'مسلسلات تركي',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'tuktuk-series-asian',
            name: 'مسلسلات أسيوي',
            extra: [{ name: 'skip', isRequired: false }]
        },
        {
            type: 'series',
            id: 'tuktuk-anime',
            name: 'انمي مترجم',
            extra: [{ name: 'skip', isRequired: false }]
        }
    ],
    idPrefixes: ['tuktuk']
};

const builder = new addonBuilder(manifest);
const MAIN_URL = 'https://tuktukcenma.cam';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// Reduced timeout for faster failure
const REQUEST_TIMEOUT = 4000; // 4 seconds per request

const catalogUrls = {
    'tuktuk-recent': `${MAIN_URL}/recent/`,
    'tuktuk-movies-foreign': `${MAIN_URL}/category/movies-2/افلام-اجنبي/`,
    'tuktuk-movies-indian': `${MAIN_URL}/category/movies-2/افلام-هندي/`,
    'tuktuk-movies-asian': `${MAIN_URL}/category/movies-2/افلام-اسيوي/`,
    'tuktuk-series-foreign': `${MAIN_URL}/sercat/مسلسلات-اجنبي/`,
    'tuktuk-series-turkish': `${MAIN_URL}/sercat/مسلسلات-تركي/`,
    'tuktuk-series-asian': `${MAIN_URL}/sercat/مسلسلات-أسيوي/`,
    'tuktuk-anime': `${MAIN_URL}/category/anime-6/انمي-مترجم/`
};

// Priority order for extractors (most reliable first)
const EXTRACTOR_PRIORITY = [
    'lulustream',
    'mixdrop',
    'streamwish',
    'vidguard',
    'mp4upload',
    'doodstream',
    'earnvids',
    'krakenfiles',
    'fileupload'
];

// Comprehensive video extractors for ALL hosts
async function extractMixdrop(url) {
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': USER_AGENT, 'Referer': url },
            timeout: REQUEST_TIMEOUT
        });

        const match = response.data.match(/MDCore\.wurl\s*=\s*"([^"]+)"/);
        if (match && match[1]) {
            return 'https:' + match[1];
        }

        const m3u8Match = response.data.match(/https?:\/\/[^\"']+\.m3u8/);
        if (m3u8Match) return m3u8Match[0];
    } catch (error) {
        // Silent fail for speed
    }
    return null;
}

async function extractDoodstream(url) {
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': USER_AGENT, 'Referer': url },
            timeout: REQUEST_TIMEOUT
        });

        const match = response.data.match(/\$\.get\('(\/pass_md5\/[^']+)'/);
        if (match) {
            const passUrl = url.split('/e/')[0] + match[1];
            const passResponse = await axios.get(passUrl, {
                headers: { 'User-Agent': USER_AGENT, 'Referer': url },
                timeout: 3000
            });

            if (passResponse.data) {
                return passResponse.data + 'zUEJeL3mUN?token=' + url.split('/').pop();
            }
        }
    } catch (error) {
        // Silent fail
    }
    return null;
}

async function extractStreamwish(url) {
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': USER_AGENT, 'Referer': url },
            timeout: REQUEST_TIMEOUT
        });

        const patterns = [
            /file:"([^"]+\.m3u8[^"]*)"/,
            /sources:\[\{file:"([^"]+)"/,
            /"file":"([^"]+\.m3u8[^"]*)"/
        ];

        for (const pattern of patterns) {
            const match = response.data.match(pattern);
            if (match && match[1]) return match[1];
        }
    } catch (error) {
        // Silent fail
    }
    return null;
}

async function extractVidguard(url) {
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': USER_AGENT, 'Referer': url },
            timeout: REQUEST_TIMEOUT
        });

        const patterns = [
            /sources:\[\{file:"([^"]+)"/,
            /"file":"([^"]+\.m3u8[^"]*)"/,
            /file:"([^"]+\.m3u8[^"]*)"/
        ];

        for (const pattern of patterns) {
            const match = response.data.match(pattern);
            if (match && match[1]) return match[1];
        }
    } catch (error) {
        // Silent fail
    }
    return null;
}

async function extractMp4upload(url) {
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': USER_AGENT, 'Referer': url },
            timeout: REQUEST_TIMEOUT
        });

        const patterns = [
            /player\.src\(\{[^}]*src:\s*["']([^"']+)["']/,
            /"file":"([^"]+\.m3u8[^"]*)"/,
            /\|([0-9]+)\|[0-9]+\|[0-9]+\|src/
        ];

        for (const pattern of patterns) {
            const match = response.data.match(pattern);
            if (match && match[1] && match[1].includes('http')) {
                return match[1];
            }
        }

        const urlMatch = response.data.match(/https?:\/\/[^\"'\s]+\.(m3u8|mp4)[^\"'\s]*/);
        if (urlMatch) return urlMatch[0];
    } catch (error) {
        // Silent fail
    }
    return null;
}

async function extractEarnvids(url) {
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': USER_AGENT, 'Referer': url },
            timeout: REQUEST_TIMEOUT
        });

        const patterns = [
            /sources:\s*\[\{file:"([^"]+)"/,
            /"file":"([^"]+\.m3u8[^"]*)"/,
            /file:"([^"]+\.m3u8[^"]*)"/
        ];

        for (const pattern of patterns) {
            const match = response.data.match(pattern);
            if (match && match[1]) return match[1];
        }
    } catch (error) {
        // Silent fail
    }
    return null;
}

async function extractKrakenfiles(url) {
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': USER_AGENT, 'Referer': url },
            timeout: REQUEST_TIMEOUT
        });

        const patterns = [
            /"videoUrl":"([^"]+)"/,
            /videoUrl\s*=\s*["']([^"']+)["']/,
            /https?:\/\/[^\"'\s]+krakenfiles[^\"'\s]+\.mp4[^\"'\s]*/
        ];

        for (const pattern of patterns) {
            const match = response.data.match(pattern);
            if (match && match[1]) {
                let videoUrl = match[1];
                videoUrl = videoUrl.replace(/\\/g, '');
                return videoUrl;
            }
        }
    } catch (error) {
        // Silent fail
    }
    return null;
}

async function extractLulustream(url) {
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': USER_AGENT, 'Referer': url },
            timeout: REQUEST_TIMEOUT
        });

        const patterns = [
            /sources:\[\{file:"([^"]+)"/,
            /"file":"([^"]+\.m3u8[^"]*)"/,
            /file:"([^"]+\.m3u8[^"]*)"/
        ];

        for (const pattern of patterns) {
            const match = response.data.match(pattern);
            if (match && match[1]) return match[1];
        }
    } catch (error) {
        // Silent fail
    }
    return null;
}

async function extractFileupload(url) {
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': USER_AGENT, 'Referer': url },
            timeout: REQUEST_TIMEOUT
        });

        const patterns = [
            /"file":"([^"]+\.m3u8[^"]*)"/,
            /sources:\[\{file:"([^"]+)"/,
            /file:"([^"]+\.m3u8[^"]*)"/
        ];

        for (const pattern of patterns) {
            const match = response.data.match(pattern);
            if (match && match[1]) return match[1];
        }
    } catch (error) {
        // Silent fail
    }
    return null;
}

async function extractVideoUrl(embedUrl, driver) {
    const driverLower = (driver || '').toLowerCase();

    try {
        if (driverLower.includes('mixdrop')) {
            return await extractMixdrop(embedUrl);
        } else if (driverLower.includes('dood')) {
            return await extractDoodstream(embedUrl);
        } else if (driverLower.includes('streamwish') || driverLower.includes('streamhg')) {
            return await extractStreamwish(embedUrl);
        } else if (driverLower.includes('vidguard')) {
            return await extractVidguard(embedUrl);
        } else if (driverLower.includes('mp4upload')) {
            return await extractMp4upload(embedUrl);
        } else if (driverLower.includes('earnvids') || driverLower.includes('videoland')) {
            return await extractEarnvids(embedUrl);
        } else if (driverLower.includes('kraken')) {
            return await extractKrakenfiles(embedUrl);
        } else if (driverLower.includes('lulu')) {
            return await extractLulustream(embedUrl);
        } else if (driverLower.includes('fileupload') || driverLower.includes('file-upload')) {
            return await extractFileupload(embedUrl);
        } else {
            // Generic extraction
            const response = await axios.get(embedUrl, {
                headers: { 'User-Agent': USER_AGENT, 'Referer': embedUrl },
                timeout: REQUEST_TIMEOUT
            });

            const patterns = [
                /file:"([^"]+\.m3u8[^"]*)"/,
                /sources:\[\{file:"([^"]+)"/,
                /"file":"([^"]+\.m3u8[^"]*)"/,
                /"file":"([^"]+\.mp4[^"]*)"/,
                /https?:\/\/[^\"'\s]+\.(m3u8|mp4)[^\"'\s]*/
            ];

            for (const pattern of patterns) {
                const match = response.data.match(pattern);
                if (match && match[1]) {
                    return match[1];
                }
            }
        }
    } catch (error) {
        // Silent fail for speed
    }

    return null;
}

function detectType(href, title) {
    if (href.includes('/مسلسل-') || title.includes('مسلسل') || title.includes('الحلقة')) {
        return 'series';
    }
    if (href.includes('/انمي-') || title.includes('انمي')) {
        return 'series';
    }
    return 'movie';
}

async function parseCatalog(url) {
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': USER_AGENT },
            timeout: 10000
        });
        const $ = cheerio.load(response.data);
        const items = [];

        $('div.Block--Item').each((i, el) => {
            const $el = $(el);
            const $link = $el.find('a').first();
            const href = $link.attr('href');
            const title = $el.find('div.Block--Info h3').text().trim() || $link.attr('title');

            if (!href || !title) return;

            const posterUrl = $el.find('div.Poster--Block img').attr('data-src') 
                           || $el.find('div.Poster--Block img').attr('src')
                           || $el.find('img').attr('data-src')
                           || $el.find('img').attr('src');

            const type = detectType(href, title);
            const id = `tuktuk:${Buffer.from(href).toString('base64')}`;

            items.push({
                id: id,
                type: type,
                name: title,
                poster: posterUrl || undefined
            });
        });

        return items;
    } catch (error) {
        console.error('[CATALOG ERROR]', error.message);
        return [];
    }
}

builder.defineCatalogHandler(async ({ type, id, extra }) => {
    const skip = parseInt(extra.skip) || 0;
    const page = Math.floor(skip / 20) + 1;

    const baseUrl = catalogUrls[id];
    if (!baseUrl) {
        return { metas: [] };
    }

    const url = page === 1 ? baseUrl : `${baseUrl}?paged=${page}`;
    const metas = await parseCatalog(url);

    return { metas };
});

builder.defineMetaHandler(async ({ type, id }) => {
    try {
        const url = Buffer.from(id.replace('tuktuk:', ''), 'base64').toString();
        const response = await axios.get(url, {
            headers: { 'User-Agent': USER_AGENT },
            timeout: 10000
        });
        const $ = cheerio.load(response.data);

        const title = $('h1.post-title a').text().trim() || $('h1').text().trim();
        const posterUrl = $('link[itemprop=thumbnailUrl]').attr('href')
                       || $('meta[property=og:image]').attr('content')
                       || $('div.left div.image img').attr('src');

        const year = $('a[href*=release-year]').text().trim().replace(/\D/g, '');
        const description = $('div.story p').text().trim();
        const genres = [];
        $('a[href*=/genre/]').each((i, el) => {
            genres.push($(el).text());
        });

        const meta = {
            id: id,
            type: type,
            name: title,
            poster: posterUrl || undefined,
            description: description || undefined,
            releaseInfo: year || undefined,
            genres: genres.length > 0 ? genres : undefined
        };

        if (type === 'series') {
            const videos = [];
            const seasonLinks = [];

            $('div.Block--Item').each((i, el) => {
                const $el = $(el);
                const $link = $el.find('a').first();
                const seasonUrl = $link.attr('href');
                const seasonTitle = $el.find('h3').text().trim();

                if (seasonTitle.includes('الموسم') && seasonUrl) {
                    const seasonMatch = seasonTitle.match(/\d+/);
                    const seasonNum = seasonMatch ? parseInt(seasonMatch[0]) : (i + 1);
                    seasonLinks.push({ url: seasonUrl, season: seasonNum });
                }
            });

            if (seasonLinks.length > 0) {
                for (const seasonInfo of seasonLinks) {
                    try {
                        const seasonResponse = await axios.get(seasonInfo.url, {
                            headers: { 'User-Agent': USER_AGENT },
                            timeout: 10000
                        });
                        const $season = cheerio.load(seasonResponse.data);

                        $season('section.allepcont div.row a').each((i, el) => {
                            const $ep = $season(el);
                            const epHref = $ep.attr('href');
                            const epTitle = $ep.find('div.ep-info h2').text().trim();
                            const epNumText = $ep.find('div.epnum').text().replace(/\D/g, '');
                            const epNum = parseInt(epNumText) || (i + 1);

                            if (epHref) {
                                videos.push({
                                    id: `tuktuk:${Buffer.from(epHref).toString('base64')}`,
                                    title: epTitle || `Episode ${epNum}`,
                                    episode: epNum,
                                    season: seasonInfo.season
                                });
                            }
                        });
                    } catch (error) {
                        console.error(`[META] Season ${seasonInfo.season} error:`, error.message);
                    }
                }
            } else {
                $('section.allepcont div.row a').each((i, el) => {
                    const $ep = $(el);
                    const epHref = $ep.attr('href');
                    const epTitle = $ep.find('div.ep-info h2').text().trim();
                    const epNumText = $ep.find('div.epnum').text().replace(/\D/g, '');
                    const epNum = parseInt(epNumText) || (i + 1);

                    if (epHref) {
                        videos.push({
                            id: `tuktuk:${Buffer.from(epHref).toString('base64')}`,
                            title: epTitle || `Episode ${epNum}`,
                            episode: epNum,
                            season: 1
                        });
                    }
                });
            }

            meta.videos = videos;
        }

        return { meta };
    } catch (error) {
        console.error('[META ERROR]', error.message);
        return { meta: {} };
    }
});

// OPTIMIZED STREAM HANDLER WITH PARALLEL EXTRACTION
builder.defineStreamHandler(async ({ type, id }) => {
    console.log(`\n======================================`);
    console.log(`[STREAM REQUEST] ${id.substring(0, 50)}...`);
    console.log(`======================================`);

    try {
        const url = Buffer.from(id.replace('tuktuk:', ''), 'base64').toString();
        const watchUrl = url.endsWith('/') ? `${url}watch/` : `${url}/watch/`;

        const response = await axios.get(watchUrl, {
            headers: { 'User-Agent': USER_AGENT },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const iframeSrc = $('div.player--iframe iframe').attr('src');

        if (!iframeSrc) {
            return { streams: [] };
        }

        const fullIframeSrc = iframeSrc.startsWith('http') ? iframeSrc : `https:${iframeSrc}`;
        const iframeId = fullIframeSrc.split('/').pop();
        const iframeUrl = `https://w.megatukmax.xyz/iframe/${iframeId}`;

        const iframeResponse = await axios.get(iframeUrl, {
            headers: { 'User-Agent': USER_AGENT, 'Referer': watchUrl },
            timeout: 10000
        });

        let inertiaVersion = '';
        const versionPatterns = [
            /"version":"([a-f0-9]{32,})"/,
            /X-Inertia-Version['"\s:=]+['"]([a-f0-9]{32,})['"]/
        ];

        for (const pattern of versionPatterns) {
            const match = iframeResponse.data.match(pattern);
            if (match && match[1]) {
                inertiaVersion = match[1];
                break;
            }
        }

        if (!inertiaVersion) {
            inertiaVersion = '852467c2571830b8584cc9bce61b6cde';
        }

        const apiResponse = await axios.get(iframeUrl, {
            headers: {
                'User-Agent': USER_AGENT,
                'X-Inertia': 'true',
                'X-Inertia-Version': inertiaVersion,
                'X-Inertia-Partial-Component': 'files/mirror/video',
                'X-Inertia-Partial-Data': 'streams',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': iframeUrl
            },
            timeout: 10000
        });

        const streams = [];
        const processedSources = new Set();

        if (apiResponse.data?.props?.streams?.status === 'success' && apiResponse.data.props.streams.data) {
            const streamsData = apiResponse.data.props.streams.data;
            console.log(`[STREAM] Found ${streamsData.length} qualities`);

            // Process each quality
            for (const quality of streamsData) {
                const resolution = quality.resolution || quality.label || 'Unknown';

                if (quality.mirrors && quality.mirrors.length > 0) {
                    console.log(`[STREAM] ${resolution}: ${quality.mirrors.length} mirrors - EXTRACTING IN PARALLEL`);

                    // Prepare all mirrors for parallel extraction
                    const extractionPromises = quality.mirrors
                        .map(mirror => {
                            let embedUrl = mirror.link;
                            if (embedUrl?.startsWith('//')) {
                                embedUrl = `https:${embedUrl}`;
                            }

                            if (!embedUrl || processedSources.has(embedUrl)) {
                                return null;
                            }

                            processedSources.add(embedUrl);
                            const driver = mirror.driver || 'Unknown';

                            // Return promise that resolves to stream object or null
                            return extractVideoUrl(embedUrl, driver)
                                .then(videoUrl => {
                                    if (videoUrl) {
                                        console.log(`[EXTRACTOR] ✓ ${driver}: Success`);
                                        return {
                                            name: `TukTuk - ${driver}`,
                                            title: `${resolution} - ${driver}`,
                                            url: videoUrl,
                                            priority: EXTRACTOR_PRIORITY.indexOf(driver.toLowerCase())
                                        };
                                    }
                                    console.log(`[EXTRACTOR] ✗ ${driver}: Failed`);
                                    return null;
                                })
                                .catch(err => {
                                    console.log(`[EXTRACTOR] ✗ ${driver}: Error`);
                                    return null;
                                });
                        })
                        .filter(promise => promise !== null);

                    // Wait for ALL extractions to complete in parallel
                    const results = await Promise.all(extractionPromises);

                    // Add successful streams
                    results
                        .filter(result => result !== null)
                        .forEach(stream => streams.push(stream));
                }
            }
        }

        // Sort streams by priority (best extractors first)
        streams.sort((a, b) => {
            const priorityA = a.priority !== -1 ? a.priority : 999;
            const priorityB = b.priority !== -1 ? b.priority : 999;
            return priorityA - priorityB;
        });

        console.log(`[STREAM] Returning ${streams.length} direct streams`);
        console.log(`======================================\n`);
        return { streams };
    } catch (error) {
        console.error('[STREAM ERROR]', error.message);
        console.log(`======================================\n`);
        return { streams: [] };
    }
});

module.exports = builder.getInterface();
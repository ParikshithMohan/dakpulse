'use strict';

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.track-post');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const TTL_MS = 6 * 24 * 60 * 60 * 1000;

function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return null;
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeConfig(hashes) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    const config = {
      version: '1.0',
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + TTL_MS).toISOString(),
      hashes: {
        token_action: hashes.tokenAction,
        track_action: hashes.trackAction,
      },
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return config;
  } catch (e) {
    return null;
  }
}

function isExpired(config) {
  if (!config || !config.expires_at) return true;
  return new Date(config.expires_at) < new Date();
}

function fetchUrl(targetUrl, redirects = 5) {
  return new Promise((resolve, reject) => {
    if (redirects <= 0) return reject(new Error('Too many redirects'));

    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch (e) {
      return reject(new Error(`Invalid URL: ${targetUrl}`));
    }

    const lib = parsed.protocol === 'https:' ? https : http;
    const port = parsed.port ? parseInt(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;

    const req = lib.get(
      {
        hostname: parsed.hostname,
        port,
        path: parsed.pathname + parsed.search,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 12000,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : `${parsed.protocol}//${parsed.host}${res.headers.location}`;
          res.resume();
          return fetchUrl(next, redirects - 1).then(resolve).catch(reject);
        }

        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

function postIndiaPost(nextAction, body) {
  return new Promise((resolve) => {
    const bodyBuffer = Buffer.from(body, 'utf8');

    const req = https.request(
      {
        hostname: 'www.indiapost.gov.in',
        port: 443,
        path: '/',
        method: 'POST',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/x-component',
          'Content-Type': 'text/plain;charset=UTF-8',
          'Content-Length': bodyBuffer.length,
          'next-action': nextAction,
          'Next-Router-State-Tree': '%5B%22%22%2C%7B%7D%2Cnull%2Cnull%2Ctrue%5D',
        },
        timeout: 15000,
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.write(bodyBuffer);
    req.end();
  });
}

function parseRSC(rawBody) {
  for (const line of rawBody.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('1:')) {
      try {
        return JSON.parse(trimmed.substring(2));
      } catch (_) {}
    }
  }
  return null;
}

function testTokenHash(hash) {
  return new Promise((resolve) => {
    const bodyBuf = Buffer.from('[]', 'utf8');
    const req = https.request(
      {
        hostname: 'www.indiapost.gov.in',
        port: 443,
        path: '/',
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/x-component',
          'Content-Type': 'text/plain;charset=UTF-8',
          'Content-Length': bodyBuf.length,
          'next-action': hash,
        },
        timeout: 10000,
      },
      (res) => {
        let d = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          let token = null;
          for (const line of d.split('\n')) {
            const trimmed = line.trim();
            if (trimmed.startsWith('1:')) {
              try {
                const val = JSON.parse(trimmed.slice(2));
                if (typeof val === 'string' && val.length > 20) token = val;
              } catch (e) {}
            }
          }
          resolve(token);
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.write(bodyBuf);
    req.end();
  });
}

async function extractHashes() {
  const html = await fetchUrl('https://www.indiapost.gov.in');
  const bundleMatches = html.match(/\/static\/chunks\/[^"']+\.js/g) || [];
  const bundles = Array.from(new Set(bundleMatches));

  const allHashes = new Set();
  const HASH_REGEX = /\b([0-9a-f]{40,42})\b/g;

  await Promise.all(
    bundles.map(async (bundlePath) => {
      try {
        const js = await fetchUrl(`https://www.indiapost.gov.in${bundlePath}`);
        let m;
        while ((m = HASH_REGEX.exec(js)) !== null) {
          allHashes.add(m[1]);
        }
      } catch (e) {}
    })
  );

  const hashList = Array.from(allHashes);
  let tokenAction = null;
  let trackAction = null;

  for (const h of hashList) {
    const token = await testTokenHash(h);
    if (token) {
      tokenAction = h;
      break;
    }
  }

  // Find track action
  if (tokenAction) {
    for (const h of hashList) {
      if (h === tokenAction) continue;
      const res = await postIndiaPost(h, JSON.stringify(['dummy_token', 'CX137150258IN']));
      if (res && res.status === 200) {
        trackAction = h;
        break;
      }
    }
  }

  // Fallbacks if extraction encounters dynamic bundle variance
  if (!tokenAction) tokenAction = '404368bb39bb834167e42d76ee64db59f33b1e8e';
  if (!trackAction) trackAction = '00b4f44fd711d9f8e4e9bc3539958cfb0445d4b8';

  return { tokenAction, trackAction };
}

async function getHashes() {
  const config = readConfig();
  if (config && !isExpired(config) && config.hashes?.token_action) {
    return {
      tokenAction: config.hashes.token_action,
      trackAction: config.hashes.track_action,
    };
  }
  const hashes = await extractHashes();
  writeConfig(hashes);
  return hashes;
}

async function fetchToken(tokenAction) {
  const res = await postIndiaPost(tokenAction, '[]');
  if (!res || res.status !== 200) return null;
  const parsed = parseRSC(res.body);
  if (typeof parsed === 'string') return parsed;
  if (parsed && typeof parsed === 'object') return JSON.stringify(parsed);
  return null;
}

async function fetchTracking(trackAction, token, articleId) {
  const tokenValue = token && token.startsWith('"') ? JSON.parse(token) : token;
  const body = JSON.stringify([tokenValue, articleId.toUpperCase()]);
  const res = await postIndiaPost(trackAction, body);
  if (!res || res.status !== 200) return null;
  return parseRSC(res.body);
}

function normalizeResult(articleId, payload) {
  if (!payload || !payload.data) return null;

  const dataObj = payload.data;
  const booking = dataObj.booking_details || {};
  const trackingList = dataObj.tracking_details || [];

  if (!booking.article_number && trackingList.length === 0) return null;

  const isDelivered =
    Boolean(booking.delivery_confirmed_on) ||
    trackingList.some((ev) => {
      const txt = `${ev.event || ''} ${ev.remarks || ''} ${ev.eventcode || ''}`.toUpperCase();
      return txt.includes('DELIVERED') || txt.includes('ITEM_DELIVERY');
    });

  const events = Array.isArray(trackingList)
    ? trackingList.map((ev, idx) => {
        const desc = ev.event || ev.remarks || 'Item Processed';
        const upper = desc.toUpperCase();
        let status = 'in_transit';

        if (upper.includes('DELIVERED') || upper.includes('ITEM_DELIVERY')) status = 'delivered';
        else if (upper.includes('OUT FOR DELIVERY') || upper.includes('ITEM_INVOICE')) status = 'out_for_delivery';
        else if (upper.includes('DISPATCH') || upper.includes('BAG_DISPATCH')) status = 'dispatched';
        else if (upper.includes('RECEIV') || upper.includes('BAG_OPEN') || upper.includes('TMO_RECEIVE'))
          status = 'in_transit';
        else if (upper.includes('BOOK') || upper.includes('ITEM_BOOK')) status = 'booked';
        else if (upper.includes('UNSUCCESSFUL') || upper.includes('FAILED') || upper.includes('CLOSED'))
          status = 'exception';

        if (idx === 0 && isDelivered) status = 'delivered';

        const rawDate = ev.date || '';
        let datePart = rawDate;
        let timePart = '12:00:00';
        if (rawDate.includes('T')) {
          const parts = rawDate.split('T');
          datePart = parts[0];
          timePart = (parts[1] || '').split('.')[0];
        } else if (rawDate.includes(' ')) {
          const parts = rawDate.split(' ');
          datePart = parts[0];
          timePart = parts[1] || '';
        }

        return {
          date: datePart,
          time: timePart,
          office: ev.office || booking.destination_office_name || 'Postal Sorting Hub',
          event: desc,
          details: ev.remarks || undefined,
          status,
        };
      })
    : [];

  let statusLabel = 'In Transit';
  let currentStatus = 'in_transit';

  if (isDelivered) {
    statusLabel = 'Item Delivered';
    currentStatus = 'delivered';
  } else if (events.length > 0) {
    currentStatus = events[0].status;
    statusLabel = events[0].event;
  }

  const bookedAtOffice = booking.booking_office_name || (events[events.length - 1]?.office ?? 'Origin Post Office');
  const destOffice = booking.destination_office_name || (events[0]?.office ?? 'Destination Post Office');
  const destPincode = String(booking.destination_pincode || booking.booking_pin || '110001');

  return {
    consignmentNumber: articleId.toUpperCase(),
    articleType: booking.article_type || (articleId.toUpperCase().startsWith('E') ? 'Speed Post' : 'Parcel Post'),
    bookedAt: bookedAtOffice,
    bookedOn: booking.booking_date ? booking.booking_date.replace('T', ' ') : events[events.length - 1]?.date || '',
    destinationOffice: destOffice,
    destinationPincode: destPincode,
    currentStatus,
    statusLabel,
    deliveredAt: booking.delivery_confirmed_on || (isDelivered && events.length > 0 ? `${events[0].date} ${events[0].time}` : null),
    recipient: booking.received_by || null,
    events,
    route: [
      { lat: 28.6328, lng: 77.2197, label: bookedAtOffice, isOrigin: true },
      { lat: 18.9405, lng: 72.8355, label: destOffice, isDestination: true },
    ],
  };
}

async function trackLiveIndiaPost(articleId) {
  try {
    const id = articleId.trim().toUpperCase();
    const hashes = await getHashes();
    const token = await fetchToken(hashes.tokenAction);
    if (!token) return null;

    const payload = await fetchTracking(hashes.trackAction, token, id);
    if (!payload) return null;

    return normalizeResult(id, payload);
  } catch (err) {
    return null;
  }
}

module.exports = { trackLiveIndiaPost };

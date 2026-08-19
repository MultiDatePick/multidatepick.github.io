#!/bin/bash
# indexnow-submit.sh — push URLs to Bing/Yandex via IndexNow.
#
# WHY: Google does NOT participate in IndexNow, so this does nothing for the main target.
# It matters for BING, which is measurably behind Google on this site and is where the
# competitor image-pack research came from. Unlike Google's Request Indexing (~10 URLs/day),
# IndexNow has no per-day quota.
#
# The key is public by design: it is hosted at the site root so the search engine can verify
# domain ownership. It is not a secret and does not need protecting.
#
# USAGE
#   bash scripts/indexnow-submit.sh                 # submit every URL in sitemap.xml
#   bash scripts/indexnow-submit.sh <url> [url...]  # submit specific URLs
#
# NEVER submit a URL that is not live yet, or one you are about to change. Same rule as
# Google's Request Indexing: you are telling a crawler to come look now.

set -e
KEY="b300e344c273463aaadf38b12b763ff5"
HOST="multidatepick.com"
KEY_LOCATION="https://${HOST}/${KEY}.txt"
ENDPOINT="https://api.indexnow.org/IndexNow"

# 1. The key file must be live and contain exactly the key, or every submission 403s.
echo "Verifying key file at ${KEY_LOCATION} ..."
SERVED="$(curl -s --max-time 20 "$KEY_LOCATION" | tr -d '\r\n')"
if [ "$SERVED" != "$KEY" ]; then
    echo "  ERROR: key file is not serving the key." >&2
    echo "  expected: $KEY" >&2
    echo "  got     : ${SERVED:-<empty or 404>}" >&2
    echo "  If you just pushed, wait for the GitHub Pages rebuild and retry." >&2
    exit 1
fi
echo "  ok"

# 2. Build the URL list.
if [ "$#" -gt 0 ]; then
    URLS="$*"
else
    echo "Reading sitemap.xml ..."
    URLS="$(curl -s --max-time 30 "https://${HOST}/sitemap.xml" \
        | grep -o '<loc>[^<]*</loc>' | sed 's|<[^>]*>||g')"
fi
COUNT="$(echo "$URLS" | wc -w)"
[ "$COUNT" -eq 0 ] && { echo "No URLs to submit." >&2; exit 1; }
echo "Submitting $COUNT URL(s) ..."

# 3. JSON body. urlList must contain only URLs on $HOST or the whole batch is rejected (422).
BODY="$(printf '%s\n' "$URLS" | awk -v host="$HOST" -v key="$KEY" -v kl="$KEY_LOCATION" '
BEGIN { printf "{\n  \"host\": \"%s\",\n  \"key\": \"%s\",\n  \"keyLocation\": \"%s\",\n  \"urlList\": [\n", host, key, kl }
{ if (index($0, host) == 0) next; urls[n++] = $0 }
END {
    for (i = 0; i < n; i++) printf "    \"%s\"%s\n", urls[i], (i < n-1 ? "," : "")
    printf "  ]\n}\n"
}')"

CODE="$(curl -s -o /tmp/indexnow.out -w '%{http_code}' \
    -X POST "$ENDPOINT" \
    -H 'Content-Type: application/json; charset=utf-8' \
    --data-binary "$BODY" --max-time 45)"

case "$CODE" in
    200|202) echo "  HTTP $CODE — accepted." ;;
    400) echo "  HTTP 400 — bad request (invalid JSON or malformed URL list)." >&2 ;;
    403) echo "  HTTP 403 — key rejected. The key file did not match at fetch time." >&2 ;;
    422) echo "  HTTP 422 — a URL does not belong to $HOST, or the key does not match the schema." >&2 ;;
    429) echo "  HTTP 429 — rate limited. Wait and retry; do not loop." >&2 ;;
    *)   echo "  HTTP $CODE — unexpected." >&2 ;;
esac
[ -s /tmp/indexnow.out ] && { echo "  response:"; sed 's/^/    /' /tmp/indexnow.out; }

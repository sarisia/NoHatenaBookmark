console.log("background loaded")

chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        const target = extractTargetFromHatena(details.url)
        console.log(`${details.url} -> ${target}`)
        if (target) {
            return {
                "redirectUrl": target
            }
        }
    },
    {
        urls: [ "*://b.hatena.ne.jp/entry*" ]
    },
    [ "blocking" ]
)

function extractTargetFromHatena(urlstr) {
    let target = ""
    const url = new URL(urlstr)
    const urlParam = url.searchParams.get("url")

    if (urlParam) {
        // if url has a query parameter 'url', decode and use them.
        target = decodeURIComponent(urlParam)
    } else {
        let path = url.pathname.replace(/^\/entry\//, "")
        let scheme = "http"
        if (path.startsWith("s/")) {
            path = path.replace(/^s\//, "")
            scheme = "https"
        }
        
        target = `${scheme}://${path}${url.search}`
    }

    return target
}

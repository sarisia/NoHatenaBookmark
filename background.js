console.log("background loaded")

let enabled = true
let tempDisable = false
let ctxMenu = null

// fired when user try to access hatena bookmark page
// check url and redirect if necessary.
chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        const target = extractTargetFromHatena(details.url)
        console.log(`${details.url}\n-> ${target}`)

        if (target && tick()) {
            return {
                "redirectUrl": target
            }
        }
    },
    {
        urls: [ "https://b.hatena.ne.jp/entry*" ]
    },
    [ "blocking" ]
)

// fired when extension icon is clicked
// toggle tempDisable
chrome.browserAction.onClicked.addListener(
    () => {
        if (!enabled) toggleEnabled()
        else toggleTempDisable()
    }
)

// register context menu
updateContextMenu()

function isEnabled() {
    return !tempDisable && enabled
}

function tick() {
    const ret = isEnabled()
    toggleTempDisable(false)
    return ret
}

function toggleEnabled() {
    enabled = !enabled
    updateIcon()
    updateContextMenu()
}

function toggleTempDisable(forceValue) {
    tempDisable = forceValue !== undefined ? forceValue : !tempDisable
    updateIcon()
}

function updateIcon() {
    console.log(`new state: ${isEnabled() ? "enabled" : "disabled"} (tempDisable: ${tempDisable}, globalEnabled: ${enabled})`)
    chrome.browserAction.setIcon({
        path: isEnabled() ? "assets/icon-32.png" : "assets/icon-disabled-32.png"
    })
}

function updateContextMenu() {
    const ctxMenuOpts = {
        title: enabled ? "Disable until browser restart" : "Enable",
        contexts: [ "browser_action" ],
        onclick: toggleEnabled
    }

    if (!ctxMenu) {
        ctxMenu = chrome.contextMenus.create(ctxMenuOpts)
    } else {
        chrome.contextMenus.update(ctxMenu, ctxMenuOpts)
    }
}

function extractTargetFromHatena(urlstr) {
    const url = new URL(urlstr)
    let rawPath = url.pathname.replace(/^\/entry/, "")

    // if there's no characters left in path, use `url` query parameter
    if (rawPath === "") {
        const urlParam = url.searchParams.get("url")
        // first, try without decoding
        // e.g. /entry?url=https://example.com/...
        try {
            return (new URL(urlParam)).href
        } catch(e) {}

        // if error occured, try decoded
        // e.g. /entry?url=https%3A%2F%2Fexample...
        try {
            return (new URL(decodeURIComponent(urlParam))).href
        } catch(e) {}

        return ""
    }

    // if there's characters left in path
    // first we test for 'raw path' pattern
    // e.g. /entry/https://example.com...
    //      /entry/http%3A%2F%2F
    // decode first as we do not need to care about breaking query parameters
    rawPath = rawPath.slice(1) // trim prefix `/`
    const tryDecode = decodeURIComponent(rawPath)
    if (tryDecode.search(/^https?:\/\//) === 0) {
        return ""
    }

    // e.g. /entry/example.com/...
    //      /entry/s/example.com/...
    let scheme = "http"
    if (rawPath.startsWith("s/")) {
        rawPath = rawPath.slice(2)
        scheme = "https"
    }
    
    return `${scheme}://${rawPath}${url.search}`
}

// TODO: migrate this to jest test
function testExtractTargetFromHatena() {
    const cases = [
        // input, want, description
        ["https://b.hatena.ne.jp/entry/example.com/hoge/fuga", "http://example.com/hoge/fuga", "path integrated http"],
        ["https://b.hatena.ne.jp/entry/s/example.com/hoge/fuga", "https://example.com/hoge/fuga", "path integrated https"],
        ["https://b.hatena.ne.jp/entry?url=https%3A%2F%2Fexample.com%2Fhoge%2Ffuga", "https://example.com/hoge/fuga", "url query parameter"],
        ["https://b.hatena.ne.jp/entry?url=https://example.com/hoge/fuga?query=%3F%26%2B%3F%26%2B", "https://example.com/hoge/fuga?query=?&+?&+", "url query parameter with query parameter url"],
        ["https://b.hatena.ne.jp/entry?url=https%3A%2F%2Fexample.com%2Fhoge%2Ffuga%3Fquery%3D%253F%2526%252B%253F%2526%252B", "https://example.com/hoge/fuga?query=%3F%26%2B%3F%26%2B", "url query parameter with query parameter url, encoded"],
        ["https://b.hatena.ne.jp/entry/https://example.com/hoge/fuga?query=%3F%26%2B%3F%26%2B", "", "path with raw url, not encoded, with query"],
        ["https://b.hatena.ne.jp/entry/https://example.com/hoge/fuga", "", "path with raw url"],
        ["https://b.hatena.ne.jp/entry/https://example.com/hoge/fuga?query=%3F%26%2B%3F%26%2B", "", "path with raw url, with query"],
        ["https://b.hatena.ne.jp/entry/https%3A%2F%2Fexample.com%2Fhoge%2Ffuga%3Fquery%3D%253F%2526%252B%253F%2526%252B", "", "path with raw url, encoded, with query"],
        ["https://b.hatena.ne.jp/entry/https%3A%2F%2Fexample.com%2Fhoge%2Ffuga", "", "path with raw url, encoded"]
    ]

    cases.forEach((array) => {
        const [input, want, description] = array
        const got = extractTargetFromHatena(input)
        console.log(`${got === want ? "OK" : "NG"}: ${description}\n    ${input}\n => ${got} (wants: ${want})`)
    })
}
